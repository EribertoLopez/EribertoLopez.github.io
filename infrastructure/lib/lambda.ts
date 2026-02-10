import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { OpenApiGatewayToLambda } from "@aws-solutions-constructs/aws-openapigateway-lambda";

import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as path from "path";
import * as yaml from "js-yaml";
import * as fs from "fs";
import { DatabaseStack } from "./database";
import { IamStack } from "./iam";
import { addCorsOptionsEverywhere } from "./corsUtils";
import { VpcStack } from "./vpc";
import { CacheStack } from "./cache";
import { SQSStack } from "./sqs";
import { NamingConvention } from "../bin/naming";
import { ProjectConfig } from "../bin/project-config";

const MEMORY_SIZE = 1769; // 1 full vCPU
const DEFAULT_LOG_RETENTION = logs.RetentionDays.ONE_MONTH;

/**
 * Information about a Lambda function for cross-stack references
 */
export interface LambdaFunctionInfo {
  /** Display name for alarms and dashboards (e.g., "Scholars") */
  id: string;
  
  /** Actual AWS function name (e.g., "TemplateProject-dev-Scholars") */
  functionName: string;
  
  /** Reference to the Lambda function construct */
  lambdaFunction: lambda.Function | lambda.IFunction;
  
  /** Whether to create log-based metric alarms for this function */
  hasLogAlarms?: boolean;
}

export interface LambdaStackProps extends cdk.StackProps {
  projectConfig: ProjectConfig;
  naming: NamingConvention;
}

export class LambdaStack extends cdk.Stack {
  public readonly apiGatewayId: string;
  public readonly apiGatewayStageName: string;
  
  // Public registry of all Lambda functions
  public readonly lambdaFunctions: LambdaFunctionInfo[] = [];

  constructor(
    scope: Construct,
    id: string,
    props: LambdaStackProps,
    isLocalDeployment: boolean = true,
    databaseStack?: DatabaseStack,
    iamStack?: IamStack,
    vpcStack?: VpcStack,
    cacheStack?: CacheStack,
    sqsStack?: SQSStack
  ) {
    super(scope, id, props);
    
    const { projectConfig, naming } = props;
    let apiGatewayProps: any;

    const lambdaNamePrefix = naming.lambdaPrefix();

    // Get KMS key from IAM stack for Lambda environment variable encryption
    const lambdaKmsKey = iamStack?.lambdaKmsKey;

    const openApiSpecPath = path.resolve("../codegen/openapi.yaml");
    let spec = yaml.load(fs.readFileSync(openApiSpecPath, "utf8")) as any;
    spec = addCorsOptionsEverywhere(spec);

    console.log("Local deployment detected - using embedded openapi spec");

    apiGatewayProps = {
      apiDefinitionJson: spec,
    };

    const defaultEnvironment = {
      NODE_ENV: process.env.NODE_ENV || "development",
      // Use proxy endpoint instead of direct database endpoint
      DB_HOST: isLocalDeployment
        ? "host.docker.internal"
        : databaseStack?.proxyEndpoint || "postgres",
      DB_PORT: isLocalDeployment
        ? "5432"
        : databaseStack?.proxyPort?.toString() || "5432",
      DB_NAME: "eribertolopez",
      DB_USER: isLocalDeployment
        ? "postgres"
        : databaseStack?.databaseUsername || "postgres",
      DB_PASSWORD: isLocalDeployment
        ? "postgres"
        : databaseStack?.databasePassword || "postgres",
      ENVIRONMENT: props?.tags?.Environment || "dev",
      // Redis configuration
      REDIS_HOST: isLocalDeployment
        ? "host.docker.internal"
        : cacheStack?.cacheEndpoint || "",
      REDIS_PORT: isLocalDeployment
        ? "6379"
        : cacheStack?.cachePort.toString() || "6379",
      REDIS_TLS_ENABLED: isLocalDeployment ? "false" : "true",
      CLUSTER_IDENTIFIER: isLocalDeployment
        ? "eribertolopez"
        : databaseStack?.clusterIdentifier || "eribertolopez",
    };

    // ─────────────────────────────────────────────────────────────────
    // DEFINE API INTEGRATIONS
    // Each integration will automatically get a CloudWatch Log Group created
    // ─────────────────────────────────────────────────────────────────
    const apiIntegrationsConfig = [
      // API handler
      {
        id: "ApiHandler",
        lambdaFunctionProps: {
          functionName: `${lambdaNamePrefix}-Api`,
          runtime: lambda.Runtime.NODEJS_22_X,
          handler: "api.handler",
          code: lambda.Code.fromAsset(path.resolve("../backend/dist")),
          memorySize: MEMORY_SIZE,
          vpc: vpcStack?.vpc,
          vpcSubnets: {
            subnets: [
              vpcStack?.privateDataSubnet1,
              vpcStack?.privateDataSubnet2,
            ],
          },
          role: iamStack?.scholarsRole,
          securityGroups: [vpcStack?.lambdaSecurityGroup],
          timeout: cdk.Duration.minutes(5), // Increased timeout for complex queries with larger datasets
          environmentEncryption: lambdaKmsKey,
          environment: {
            ...defaultEnvironment,
          },
        },
      },
      // Login API handler
      {
        id: "LoginHandler",
        lambdaFunctionProps: {
          functionName: `${lambdaNamePrefix}-Login`,
          runtime: lambda.Runtime.NODEJS_22_X,
          handler: "login.handler",
          code: lambda.Code.fromAsset(path.resolve("../backend/dist")),
          vpc: vpcStack?.vpc,
          vpcSubnets: {
            subnets: [
              vpcStack?.privateDataSubnet1,
              vpcStack?.privateDataSubnet2,
            ],
          },
          securityGroups: [vpcStack?.lambdaSecurityGroup],
          role: iamStack?.loginRole,
          timeout: cdk.Duration.seconds(30),
          environmentEncryption: lambdaKmsKey,
          environment: {
            ...defaultEnvironment,
          },
        },
      },
    ];

    // ─────────────────────────────────────────────────────────────────
    // CREATE LOG GROUPS AND ATTACH TO INTEGRATIONS
    // Loop through integrations and create a log group for each,
    // ensuring they exist before the Monitoring stack creates MetricFilters
    // ─────────────────────────────────────────────────────────────────
    const apiIntegrations = apiIntegrationsConfig.map((integration) => {
      const lambdaId = integration.id.replace("Handler", ""); // "ScholarsHandler" → "Scholars"

      const logGroup = new logs.LogGroup(this, `${lambdaId}LogGroup`, {
        logGroupName: `/aws/lambda/${lambdaNamePrefix}-${lambdaId}`,
        retention: DEFAULT_LOG_RETENTION,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      return {
        ...integration,
        lambdaFunctionProps: {
          ...integration.lambdaFunctionProps,
          logGroup,
        },
      };
    });

    // Create the OpenAPI Gateway to Lambda construct
    // By default, API Gateway creates a "Prod" stage. To customize the stage name,
    // you can use the `apiGatewayProps` property to pass a `deployOptions` object
    // with your desired stage name. For example, to use "v1" as the stage name:
    const api = new OpenApiGatewayToLambda(this, `${projectConfig.projectName}Api`, {
      ...apiGatewayProps,
      apiGatewayProps: {
        // Set the stage name here
        deployOptions: {
          stageName: props?.tags?.Environment,
        },
      },
      apiIntegrations,
    });

    // Create a lambda function to run migrations
    const migrationLambda = new lambda.Function(this, "MigrationLambda", {
      functionName: `${lambdaNamePrefix}-DbMigration`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "db-migration.handler",
      code: lambda.Code.fromAsset(path.resolve("../backend/dist")),
      vpc: vpcStack?.vpc,
      vpcSubnets: {
        subnets: [vpcStack?.privateDataSubnet1!, vpcStack?.privateDataSubnet2!],
      },
      securityGroups: [vpcStack?.lambdaSecurityGroup!],
      role: iamStack?.databaseMigrationRole,
      timeout: cdk.Duration.seconds(60),
      environmentEncryption: lambdaKmsKey,
      environment: {
        ...defaultEnvironment,
      },
    });

    // ─────────────────────────────────────────────────────────────────
    // REGISTER API GATEWAY LAMBDA FUNCTIONS
    // ─────────────────────────────────────────────────────────────────
    api.apiLambdaFunctions.forEach((fn) => {
      if (fn.lambdaFunction) {
        this.lambdaFunctions.push({
          id: fn.id.replace('Handler', ''),  // "ScholarsHandler" → "Scholars"
          functionName: fn.lambdaFunction.functionName,
          lambdaFunction: fn.lambdaFunction,
          hasLogAlarms: true,  // API handlers get log-based alarms
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // REGISTER STANDALONE LAMBDA FUNCTIONS
    // ─────────────────────────────────────────────────────────────────
    this.lambdaFunctions.push({
      id: "DbMigration",
      functionName: migrationLambda.functionName,
      lambdaFunction: migrationLambda,
      hasLogAlarms: false,  // Migration doesn't need log alarms
    });

    // Export API Gateway properties for monitoring
    this.apiGatewayId = api.apiGateway.restApiId;
    this.apiGatewayStageName = props?.tags?.Environment || "dev";

    // Export API endpoint to SSM Parameter Store
    new ssm.StringParameter(this, "ApiGWEndpointParameter", {
      parameterName: naming.ssmPath("api-endpoint"),
      stringValue: api.apiGateway.url,
      description: "API Gateway endpoint URL",
    });

    // Output the API Gateway URL
    new cdk.CfnOutput(this, "ApiGatewayUrl", {
      value: api.apiGateway.url,
      description: `API Gateway URL for ${projectConfig.projectDisplayName} API`,
    });

    // Output Lambda function ARNs for reference
    api.apiLambdaFunctions.forEach((lambdaFunction) => {
      new cdk.CfnOutput(this, `${lambdaFunction.id}Arn`, {
        value: lambdaFunction.lambdaFunction?.functionArn || "MISSING_ARN",
        description: `Lambda function ARN for ${lambdaFunction.id}`,
      });
    });

    // Output Migration Lambda ARN
    new cdk.CfnOutput(this, "MigrationLambdaArn", {
      value: migrationLambda.functionArn,
      description: "Lambda function ARN for database migration",
    });

    // Add tags
    cdk.Tags.of(this).add("Project", projectConfig.projectDisplayName);
    cdk.Tags.of(this).add("Environment", props?.tags?.Environment || "dev");
  }
}

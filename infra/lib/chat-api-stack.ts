// infra/lib/chat-api-stack.ts — Chat API Stack
// Lambda + HTTP API Gateway + IAM for RAG-powered chat
// See docs/AWS_MIGRATION_PLAN.md "Phase 2"

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface ChatApiStackProps extends cdk.StackProps {
  /** Origins allowed for CORS (e.g. ["https://eribertolopez.com"]) */
  allowedOrigins: string[];
  /** Database connection details */
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  /** Optional: VPC + security group for RDS access */
  vpc?: cdk.aws_ec2.IVpc;
  vpcSubnets?: cdk.aws_ec2.SubnetSelection;
  securityGroups?: cdk.aws_ec2.ISecurityGroup[];
  /** AWS region for Bedrock */
  bedrockRegion?: string;
  /** Bedrock model IDs */
  bedrockChatModelId?: string;
  bedrockEmbedModelId?: string;
}

export class ChatApiStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly chatFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ChatApiStackProps) {
    super(scope, id, props);

    const bedrockRegion = props.bedrockRegion ?? "us-east-1";
    const chatModelId =
      props.bedrockChatModelId ?? "anthropic.claude-3-haiku-20240307-v1:0";
    const embedModelId =
      props.bedrockEmbedModelId ?? "amazon.titan-embed-text-v2:0";

    // ─────────────────────────────────────────────────────
    // IAM Role — least-privilege Bedrock + RDS access
    // ─────────────────────────────────────────────────────
    const lambdaRole = new iam.Role(this, "ChatLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
        // VPC access for RDS
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaVPCAccessExecutionRole"
        ),
      ],
    });

    // Bedrock permissions — scoped to specific models
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: [
          `arn:aws:bedrock:${bedrockRegion}::foundation-model/${chatModelId}`,
          `arn:aws:bedrock:${bedrockRegion}::foundation-model/${embedModelId}`,
        ],
      })
    );

    // ─────────────────────────────────────────────────────
    // Lambda Function — bundled from lambda/ directory
    // ─────────────────────────────────────────────────────
    const chatFn = new lambdaNode.NodejsFunction(this, "ChatHandler", {
      entry: "../lambda/handler.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      role: lambdaRole,
      environment: {
        EMBEDDING_PROVIDER: "bedrock",
        CHAT_PROVIDER: "bedrock",
        VECTOR_STORE_PROVIDER: "aurora",
        BEDROCK_CHAT_MODEL_ID: chatModelId,
        BEDROCK_EMBED_MODEL_ID: embedModelId,
        AWS_REGION: bedrockRegion,
        DB_HOST: props.dbHost,
        DB_PORT: props.dbPort,
        DB_NAME: props.dbName,
        DB_USER: props.dbUser,
        DB_PASSWORD: props.dbPassword,
        DB_SSL: "true",
        ALLOWED_ORIGINS: props.allowedOrigins.join(","),
      },
      ...(props.vpc && {
        vpc: props.vpc,
        vpcSubnets: props.vpcSubnets,
        securityGroups: props.securityGroups,
      }),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ["@aws-sdk/*"], // SDK v3 is included in Lambda runtime
      },
    });

    this.chatFunction = chatFn;

    // Log group with retention
    new logs.LogGroup(this, "ChatLogGroup", {
      logGroupName: `/aws/lambda/${chatFn.functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────────────────
    // HTTP API Gateway with CORS + throttling
    // ─────────────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, "ChatHttpApi", {
      apiName: "portfolio-chat-api",
      corsPreflight: {
        allowOrigins: props.allowedOrigins,
        allowMethods: [
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type"],
        maxAge: cdk.Duration.days(1),
      },
      // Default stage with throttling
      throttle: {
        burstLimit: 100,
        rateLimit: 50,
      },
    });

    const lambdaIntegration =
      new apigwv2Integrations.HttpLambdaIntegration(
        "ChatIntegration",
        chatFn
      );

    httpApi.addRoutes({
      path: "/chat",
      methods: [apigwv2.HttpMethod.POST],
      integration: lambdaIntegration,
    });

    httpApi.addRoutes({
      path: "/health",
      methods: [apigwv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    this.apiUrl = httpApi.apiEndpoint;

    // ─────────────────────────────────────────────────────
    // Outputs
    // ─────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "ChatApiUrl", {
      value: httpApi.apiEndpoint,
      description: "Chat API endpoint URL",
      exportName: `${this.stackName}-ChatApiUrl`,
    });

    new cdk.CfnOutput(this, "ChatFunctionArn", {
      value: chatFn.functionArn,
      description: "Chat Lambda function ARN",
    });
  }
}

#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { LambdaStack } from "../lib/lambda";
import { DatabaseStack } from "../lib/database";
import { IamStack } from "../lib/iam";
import { VpcStack } from "../lib/vpc";
import { FrontendStack } from "../lib/frontend";
import { CacheStack } from "../lib/cache";
import { SQSStack } from "../lib/sqs";
import { MonitoringStack } from "../lib/monitoring";
import { ECRStack } from "../lib/ecr";
import { ECSStack } from "../lib/ecs";
import { ChatApiStack } from "../lib/chat-api-stack";
import { cacheConfig, unifiedVPCConfig } from "./env-config";
import { loadProjectConfig } from "./project-config";
import { NamingConvention } from "./naming";

const app = new cdk.App();

// ═══════════════════════════════════════════════════════════════════════════
// LOAD CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const config = loadProjectConfig();
console.log(`Deploying project: ${config.projectDisplayName}`);

const target = app.node.tryGetContext("target") as
  | "frontend"
  | "backend"
  | "all"
  | undefined;

const deployFrontend = !target || target === "frontend" || target === "all";
const deployBackend = !target || target === "backend" || target === "all";

// Get environment from context or use default
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-west-2",
};

const environment = process.env.ENVIRONMENT || "local";
const isLocalDeployment = environment === "local";

// Initialize naming convention utility
const naming = new NamingConvention(config, environment);

// Load VPC configuration
const { envVpcConfig } = unifiedVPCConfig(environment);

// Log stack deployment configuration
console.log("Stack deployment configuration:");
console.log(`  - Cache: ${config.stacks.cache}`);
console.log(`  - SQS: ${config.stacks.sqs}`);
console.log(`  - ECS: ${config.stacks.ecs}`);
console.log(`  - ECR: ${config.stacks.ecr}`);
console.log(`  - Monitoring: always (core stack)`);

// ═══════════════════════════════════════════════════════════════════════════
// BACKEND STACKS
// ═══════════════════════════════════════════════════════════════════════════

if (deployBackend) {
  // ─────────────────────────────────────────────────────────────────────────
  // CORE STACKS (Always Deployed)
  // ─────────────────────────────────────────────────────────────────────────

  const vpcStack = new VpcStack(app, naming.stackId("VPC"), {
    env,
    environment,
    projectName: config.projectName,
    isLocalEnvironment: isLocalDeployment,
    vpcConfig: envVpcConfig,
    description: naming.stackDescription("VPC stack with public and private subnets"),
    tags: naming.tags(),
  });

  console.log("Creating database stack");
  const databaseStack = new DatabaseStack(app, naming.stackId("Database"), {
    environment,
    projectConfig: config,
    vpc: vpcStack.vpc,
    privateSubnet1: vpcStack.privateDataSubnet1,
    privateSubnet2: vpcStack.privateDataSubnet2,
    rdsSecurityGroup: vpcStack.rdsSecurityGroup,
    existingDatabaseSecretArn: process.env.EXISTING_DATABASE_SECRET_ARN,
    lambdaSecurityGroup: vpcStack.lambdaSecurityGroup,
    description: naming.stackDescription("Database stack with external Aurora cluster"),
    tags: naming.tags(),
    env,
  });
  databaseStack.addDependency(vpcStack);

  // Configure RDS security group rules to allow Lambda access
  vpcStack.configureRdsSecurityGroupRulesWithId(
    vpcStack.lambdaSecurityGroup.securityGroupId,
    5432
  );

  // Create IAM stack with database secret ARN
  const iamStack = new IamStack(app, naming.stackId("IAM"), {
    env,
    environment,
    projectConfig: config,
    databaseSecretArn: databaseStack.databaseSecret?.secretArn,
    isLocalDeployment,
    description: naming.stackDescription("IAM stack with roles and policies"),
    tags: naming.tags(),
  });

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONAL STACKS (Conditionally Deployed)
  // ─────────────────────────────────────────────────────────────────────────

  // Cache Stack (Optional)
  let cacheStack: CacheStack | undefined;
  if (config.stacks.cache) {
    const { cacheNodeType, cacheNumNodes, enableCacheBackups } = cacheConfig();
    cacheStack = new CacheStack(app, naming.stackId("Cache"), {
      environment,
      projectConfig: config,
      naming,
      vpc: vpcStack.vpc,
      privateSubnet1: vpcStack.privateDataSubnet1,
      privateSubnet2: vpcStack.privateDataSubnet2,
      lambdaSecurityGroup: vpcStack.lambdaSecurityGroup,
      cacheNodeType,
      cacheNumNodes,
      enableCacheBackups,
      description: naming.stackDescription("Cache stack with Redis cluster"),
      tags: naming.tags(),
      env,
    });
    cacheStack.addDependency(vpcStack);
    cacheStack.addDependency(databaseStack);
  }

  // SQS Stack (Optional)
  let sqsStack: SQSStack | undefined;
  if (config.stacks.sqs) {
    sqsStack = new SQSStack(app, naming.stackId("SQS"), {
      env,
      projectConfig: config,
      naming,
      description: naming.stackDescription("SQS stack"),
      tags: naming.tags(),
    });
  }

  // ECR Stack (Optional - auto-enabled if ECS is enabled)
  let ecrStack: ECRStack | undefined;
  if (config.stacks.ecr) {
    ecrStack = new ECRStack(
      app,
      naming.stackId("ECR"),
      {
        env,
        environment,
        projectConfig: config,
        naming,
        description: naming.stackDescription("ECR stack with container repositories"),
        tags: naming.tags(),
      }
    );
  }

  // Lambda Stack (Core - with optional dependencies)
  const lambdaStack = new LambdaStack(
    app,
    naming.stackId("Lambda"),
    {
      env,
      projectConfig: config,
      naming,
      description: naming.stackDescription("Lambda stack"),
      tags: naming.tags(),
    },
    isLocalDeployment,
    databaseStack,
    iamStack,
    vpcStack,
    cacheStack,
    sqsStack
  );
  lambdaStack.addDependency(vpcStack);
  lambdaStack.addDependency(databaseStack);
  lambdaStack.addDependency(iamStack);
  if (cacheStack) lambdaStack.addDependency(cacheStack);
  if (sqsStack) lambdaStack.addDependency(sqsStack);

  // ECS Stack (Optional - requires ECR and Cache)
  let ecsStack: ECSStack | undefined;
  if (config.stacks.ecs) {
    if (!cacheStack) {
      console.warn("Warning: ECS stack requires Cache stack. Skipping ECS deployment.");
    } else if (!ecrStack) {
      console.warn("Warning: ECS stack requires ECR stack. Skipping ECS deployment.");
    } else {
      const originDataAWSRegion = process.env.ORIGIN_DATA_AWS_REGION || "";
      const originDataAWSAccessKeyId = process.env.ORIGIN_DATA_AWS_ACCESS_KEY_ID || "";
      const originDataAWSSecretAccessKey = process.env.ORIGIN_DATA_AWS_SECRET_ACCESS_KEY || "";
      const originDataS3BucketName = process.env.ORIGIN_DATA_S3_BUCKET_NAME || "";
      const tenantIdentifier = process.env.TENANT_IDENTIFIER || "default";
      const artilleryKey = process.env.ARTILLERY_KEY || "";
      const baseUrl = `https://${lambdaStack.apiGatewayId}.execute-api.${env.region}.amazonaws.com/${environment}`;

      ecsStack = new ECSStack(app, naming.stackId("ECS"), {
        env,
        environment,
        vpcStack,
        tenantIdentifier,
        projectConfig: config,
        naming,
        description: naming.stackDescription("ECS stack with Fargate service for data pipeline"),
        originDataAWSRegion,
        originDataAWSAccessKeyId,
        originDataAWSSecretAccessKey,
        originDataS3BucketName,
        redisHost: cacheStack.cacheEndpoint,
        redisPort: cacheStack.cachePort.toString(),
        baseUrl,
        artilleryKey,
        tags: naming.tags(),
      });
      ecsStack.addDependency(vpcStack);
      ecsStack.addDependency(ecrStack);
      ecsStack.addDependency(databaseStack);
      ecsStack.addDependency(cacheStack);
      ecsStack.addDependency(lambdaStack);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MONITORING STACK (Core - Always Deployed)
  // Lambda and API Gateway monitoring are REQUIRED
  // Cache and SQS monitoring are CONDITIONAL based on optional stack toggles
  // ─────────────────────────────────────────────────────────────────────────

  const monitoringStack = new MonitoringStack(
    app,
    naming.stackId("Monitoring"),
    {
      env,
      envName: environment,
      alertEmail: config.alertEmail || "alerts@example.com",
      projectConfig: config,
      naming,

      // ═══════════════════════════════════════════════════════════════
      // AUTOMATIC: Pass the Lambda registry - no hardcoded names!
      // All Lambda functions registered in LambdaStack are automatically
      // monitored without any manual synchronization
      // ═══════════════════════════════════════════════════════════════
      lambdaFunctions: lambdaStack.lambdaFunctions,

      // API Gateway (required)
      apiGatewayId: lambdaStack.apiGatewayId,
      apiGatewayStageName: lambdaStack.apiGatewayStageName,

      // Conditional: Cache monitoring
      ...(cacheStack && {
        cacheReplicationGroupId: cacheStack.cacheCluster.replicationGroupId,
      }),

      // Conditional: SQS monitoring
      ...(sqsStack && {
        deadLetterQueueName: sqsStack.transactionEventsDeadLetterQueue.queueName,
        transactionEventsQueueName: sqsStack.transactionEventsQueue.queueName,
      }),

      description: naming.stackDescription("Monitoring stack with CloudWatch alarms"),
      tags: naming.tags(),
    }
  );

  monitoringStack.addDependency(lambdaStack);
  monitoringStack.addDependency(databaseStack);
  if (cacheStack) monitoringStack.addDependency(cacheStack);
  if (sqsStack) monitoringStack.addDependency(sqsStack);
}

// ═══════════════════════════════════════════════════════════════════════════
// FRONTEND STACK
// ═══════════════════════════════════════════════════════════════════════════

if (deployFrontend) {
  new FrontendStack(app, naming.stackId("Frontend"), {
    env,
    environment,
    description: naming.stackDescription("Frontend stack"),
    tags: naming.tags(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT API STACK (standalone — no VPC/DB needed)
// ═══════════════════════════════════════════════════════════════════════════

new ChatApiStack(app, "ChatApiStack", {
  env,
  allowedOrigins: [
    "https://eribertolopez.com",
    "https://www.eribertolopez.com",
    "https://d3flqn9a3eglfg.cloudfront.net",
    "http://localhost:3000",
  ],
  bedrockRegion: "us-east-1",
});

app.synth();

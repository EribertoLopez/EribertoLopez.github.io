import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";

import { ProjectConfig } from "../bin/project-config";

export interface IamStackProps extends cdk.StackProps {
  environment: string;
  projectConfig: ProjectConfig;
  databaseSecretArn?: string;
  isLocalDeployment?: boolean;
}

export class IamStack extends cdk.Stack {
  public readonly apiRole: iam.Role;
  public readonly webhookRole: iam.Role;
  public readonly transactionsRole: iam.Role;
  public readonly webhookProcessorRole: iam.Role;
  public readonly loginRole: iam.Role;
  public readonly chatRole: iam.Role;
  public readonly databaseMigrationRole: iam.Role;
  public readonly transactionEventsRole: iam.Role;
  public readonly lambdaKmsKey: kms.Key;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { environment, projectConfig, databaseSecretArn, isLocalDeployment } = props;

    // Create KMS key for Lambda environment variable encryption FIRST
    // This must be created before IAM roles so roles can reference it
    this.lambdaKmsKey = new kms.Key(this, "LambdaEnvironmentKmsKey", {
      description: `KMS key for Lambda environment variable encryption - ${environment}`,
      enableKeyRotation: true, // Enable automatic key rotation for enhanced security
      alias: `alias/${projectConfig.projectSlug}-lambda-env-${environment}`,
      removalPolicy: isLocalDeployment
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN, // Retain key in production for data recovery
    });

    // Common policies that most Lambda functions need
    const commonManagedPolicies = [
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaVPCAccessExecutionRole"
      ),
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      ),
    ];

    // Common KMS policy
    const createKmsPolicy = () =>
      new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["kms:GenerateDataKey", "kms:Decrypt", "kms:DescribeKey"],
            resources: [this.lambdaKmsKey.keyArn],
          }),
        ],
      });

    // Common RDS Proxy policy
    const createRdsProxyPolicy = () =>
      new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["rds-db:connect"],
            resources: [
              `arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/${projectConfig.projectSlug}`,
            ],
          }),
        ],
      });

    // Common ElastiCache policy (scoped down from FullAccess)
    const createElastiCachePolicy = () =>
      new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "elasticache:DescribeCacheClusters",
              "elasticache:DescribeReplicationGroups",
            ],
            resources: ["*"], // ElastiCache Describe actions require "*" - AWS limitation
          }),
        ],
      });

    // Common RDS Describe policy - used to discover DB connection endpoints
    const createRdsDescribePolicy = () =>
      new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["rds:DescribeDBInstances", "rds:DescribeDBClusters"],
            resources: ["*"], // RDS Describe actions require "*" - AWS limitation
          }),
        ],
      });

    // Common Secrets Manager policy - used to retrieve database credentials
    const createSecretsManagerPolicy = (secretArn: string) =>
      new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["secretsmanager:GetSecretValue"],
            resources: [secretArn],
          }),
        ],
      });

    const apiPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      RDSDescribePolicy: createRdsDescribePolicy(),
    };
    if (databaseSecretArn) {
      apiPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }
    this.apiRole = new iam.Role(this, "ApiRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-api-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: apiPolicies,
    });

    const webhookPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      RDSDescribePolicy: createRdsDescribePolicy(),
    };

    if (databaseSecretArn) {
      webhookPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.webhookRole = new iam.Role(this, "WebhookRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-webhook-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: webhookPolicies,
    });

    const transactionsPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      RDSDescribePolicy: createRdsDescribePolicy(),
    };

    if (databaseSecretArn) {
      transactionsPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.transactionsRole = new iam.Role(this, "TransactionsRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-transactions-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: transactionsPolicies,
    });

    const webhookProcessorPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      SQSSendPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["sqs:SendMessage", "sqs:GetQueueAttributes"],
            resources: [
              `arn:aws:sqs:${this.region}:${this.account}:${projectConfig.projectSlug}-${environment}-transaction-events-queue.fifo`,
            ],
          }),
        ],
      }),
      SQSKmsPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["kms:GenerateDataKey", "kms:Decrypt"],
            resources: [`arn:aws:kms:${this.region}:${this.account}:key/*`],
            conditions: {
              StringEquals: {
                "kms:ViaService": [`sqs.${this.region}.amazonaws.com`],
              },
            },
          }),
        ],
      }),
    };

    if (databaseSecretArn) {
      webhookProcessorPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.webhookProcessorRole = new iam.Role(this, "WebhookProcessorRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-webhook-processor-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: webhookProcessorPolicies,
    });

    const loginPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      RDSDescribePolicy: createRdsDescribePolicy(),
    };

    if (databaseSecretArn) {
      loginPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.loginRole = new iam.Role(this, "LoginRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-login-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: loginPolicies,
    });

    // Chat role — Bedrock + S3 only (no VPC, no DB)
    this.chatRole = new iam.Role(this, "ChatRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-chat-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
      inlinePolicies: {
        KmsPolicy: createKmsPolicy(),
        BedrockPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
              ],
              resources: [
                `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
                `arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0`,
              ],
            }),
          ],
        }),
        S3Policy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["s3:GetObject", "s3:PutObject"],
              resources: [`arn:aws:s3:::eribertolopez-chat-embeddings-*/*`],
            }),
            new iam.PolicyStatement({
              actions: ["s3:ListBucket"],
              resources: [`arn:aws:s3:::eribertolopez-chat-embeddings-*`],
            }),
          ],
        }),
      },
    });

    const dbMigrationPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
    };

    if (databaseSecretArn) {
      dbMigrationPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.databaseMigrationRole = new iam.Role(this, "DatabaseMigrationRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-db-migration-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ...commonManagedPolicies,
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonRDSDataFullAccess"),
      ],
      inlinePolicies: dbMigrationPolicies,
    });

    const transactionEventsPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      RDSDescribePolicy: createRdsDescribePolicy(),
      SQSReceivePolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
            ],
            resources: [
              `arn:aws:sqs:${this.region}:${this.account}:${projectConfig.projectSlug}-${environment}-transaction-events-queue.fifo`,
            ],
          }),
        ],
      }),
      SQSKmsPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["kms:Decrypt"],
            resources: [`arn:aws:kms:${this.region}:${this.account}:key/*`],
            conditions: {
              StringEquals: {
                "kms:ViaService": [`sqs.${this.region}.amazonaws.com`],
              },
            },
          }),
        ],
      }),
    };

    if (databaseSecretArn) {
      transactionEventsPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.transactionEventsRole = new iam.Role(this, "TransactionEventsRole", {
      roleName: `${projectConfig.projectSlug}-${environment}-transaction-events-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: transactionEventsPolicies,
    });

    // Output all role ARNs for use in other stacks
    new cdk.CfnOutput(this, "ApiRoleArn", {
      value: this.apiRole.roleArn,
      description: "IAM role ARN for API Lambda function",
      exportName: `${this.stackName}-ApiRoleArn`,
    });

    new cdk.CfnOutput(this, "WebhookRoleArn", {
      value: this.webhookRole.roleArn,
      description: "IAM role ARN for Webhook Lambda function",
      exportName: `${this.stackName}-WebhookRoleArn`,
    });

    new cdk.CfnOutput(this, "TransactionsRoleArn", {
      value: this.transactionsRole.roleArn,
      description: "IAM role ARN for Transactions Lambda function",
      exportName: `${this.stackName}-TransactionsRoleArn`,
    });

    new cdk.CfnOutput(this, "WebhookProcessorRoleArn", {
      value: this.webhookProcessorRole.roleArn,
      description: "IAM role ARN for webhook processor Lambda function",
      exportName: `${this.stackName}-WebhookProcessorRoleArn`,
    });

    new cdk.CfnOutput(this, "LoginRoleArn", {
      value: this.loginRole.roleArn,
      description: "IAM role ARN for Login Lambda function",
      exportName: `${this.stackName}-LoginRoleArn`,
    });

    new cdk.CfnOutput(this, "ChatRoleArn", {
      value: this.chatRole.roleArn,
      description: "IAM role ARN for Chat Lambda function",
      exportName: `${this.stackName}-ChatRoleArn`,
    });

    new cdk.CfnOutput(this, "DatabaseMigrationRoleArn", {
      value: this.databaseMigrationRole.roleArn,
      description: "IAM role ARN for database migration Lambda function",
      exportName: `${this.stackName}-DatabaseMigrationRoleArn`,
    });

    new cdk.CfnOutput(this, "TransactionEventsRoleArn", {
      value: this.transactionEventsRole.roleArn,
      description: "IAM role ARN for transaction events Lambda function",
      exportName: `${this.stackName}-TransactionEventsRoleArn`,
    });

    new cdk.CfnOutput(this, "LambdaKmsKeyArn", {
      value: this.lambdaKmsKey.keyArn,
      description: "KMS key ARN for Lambda environment variable encryption",
      exportName: `${this.stackName}-LambdaKmsKeyArn`,
    });

    // Add tags
    cdk.Tags.of(this).add("Project", projectConfig.projectDisplayName);
    cdk.Tags.of(this).add("Environment", environment);
  }
}

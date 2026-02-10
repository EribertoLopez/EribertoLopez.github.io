import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";

export interface IamStackProps extends cdk.StackProps {
  environment: string;
  databaseSecretArn?: string;
  isLocalDeployment?: boolean;
}

export class IamStack extends cdk.Stack {
  public readonly scholarsRole: iam.Role;
  public readonly stripeRole: iam.Role;
  public readonly transactionsRole: iam.Role;
  public readonly stripeWebhookRole: iam.Role;
  public readonly loginRole: iam.Role;
  public readonly databaseMigrationRole: iam.Role;
  public readonly transactionEventsRole: iam.Role;
  public readonly lambdaKmsKey: kms.Key;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { environment, databaseSecretArn, isLocalDeployment } = props;

    // Create KMS key for Lambda environment variable encryption FIRST
    // This must be created before IAM roles so roles can reference it
    this.lambdaKmsKey = new kms.Key(this, "LambdaEnvironmentKmsKey", {
      description: `KMS key for Lambda environment variable encryption - ${environment}`,
      enableKeyRotation: true, // Enable automatic key rotation for enhanced security
      alias: `alias/fund-a-scholar-lambda-env-${environment}`,
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
              `arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/hsf_internal_apps`,
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

    const scholarsPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      RDSDescribePolicy: createRdsDescribePolicy(),
    };
    if (databaseSecretArn) {
      scholarsPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }
    this.scholarsRole = new iam.Role(this, "ScholarsRole", {
      roleName: `fund-a-scholar-${environment}-scholars-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: scholarsPolicies,
    });

    const stripePolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      RDSDescribePolicy: createRdsDescribePolicy(),
    };

    if (databaseSecretArn) {
      stripePolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.stripeRole = new iam.Role(this, "StripeRole", {
      roleName: `fund-a-scholar-${environment}-stripe-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: stripePolicies,
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
      roleName: `fund-a-scholar-${environment}-transactions-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: transactionsPolicies,
    });

    const stripeWebhookPolicies: { [name: string]: iam.PolicyDocument } = {
      RDSProxyPolicy: createRdsProxyPolicy(),
      ElastiCachePolicy: createElastiCachePolicy(),
      KmsPolicy: createKmsPolicy(),
      SQSSendPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["sqs:SendMessage", "sqs:GetQueueAttributes"],
            resources: [
              `arn:aws:sqs:${this.region}:${this.account}:fundascholar-${environment}-transaction-events-queue.fifo`,
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
      stripeWebhookPolicies.SecretsManagerPolicy =
        createSecretsManagerPolicy(databaseSecretArn);
    }

    this.stripeWebhookRole = new iam.Role(this, "StripeWebhookRole", {
      roleName: `fund-a-scholar-${environment}-stripe-webhook-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: stripeWebhookPolicies,
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
      roleName: `fund-a-scholar-${environment}-login-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: loginPolicies,
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
      roleName: `fund-a-scholar-${environment}-db-migration-role`,
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
              `arn:aws:sqs:${this.region}:${this.account}:fundascholar-${environment}-transaction-events-queue.fifo`,
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
      roleName: `fund-a-scholar-${environment}-transaction-events-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: commonManagedPolicies,
      inlinePolicies: transactionEventsPolicies,
    });

    // Output all role ARNs for use in other stacks
    new cdk.CfnOutput(this, "ScholarsRoleArn", {
      value: this.scholarsRole.roleArn,
      description: "IAM role ARN for Scholars Lambda function",
      exportName: `${this.stackName}-ScholarsRoleArn`,
    });

    new cdk.CfnOutput(this, "StripeRoleArn", {
      value: this.stripeRole.roleArn,
      description: "IAM role ARN for Stripe Lambda function",
      exportName: `${this.stackName}-StripeRoleArn`,
    });

    new cdk.CfnOutput(this, "TransactionsRoleArn", {
      value: this.transactionsRole.roleArn,
      description: "IAM role ARN for Transactions Lambda function",
      exportName: `${this.stackName}-TransactionsRoleArn`,
    });

    new cdk.CfnOutput(this, "StripeWebhookRoleArn", {
      value: this.stripeWebhookRole.roleArn,
      description: "IAM role ARN for Stripe Webhook Lambda function",
      exportName: `${this.stackName}-StripeWebhookRoleArn`,
    });

    new cdk.CfnOutput(this, "LoginRoleArn", {
      value: this.loginRole.roleArn,
      description: "IAM role ARN for Login Lambda function",
      exportName: `${this.stackName}-LoginRoleArn`,
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
    cdk.Tags.of(this).add("Project", "Fund-A-Scholar");
    cdk.Tags.of(this).add("Environment", environment);
  }
}

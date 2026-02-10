import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { internalAppsDBConfig, proxyConfig } from "../bin/env-config";

export interface DatabaseStackProps extends cdk.StackProps {
  environment: string;
  // VPC can be provided directly (when created in same app) or via IDs (when importing existing)
  vpc: ec2.IVpc;
  // Subnets can be provided directly or via IDs
  privateSubnet1: ec2.ISubnet;
  privateSubnet2: ec2.ISubnet;
  // Security group for RDS - if provided, will use instead of creating new one
  rdsSecurityGroup: ec2.ISecurityGroup;
  // Existing database secret ARN - if provided, will import instead of creating new one
  existingDatabaseSecretArn?: string;
  // Lambda security group from VPC stack - use existing instead of creating new one
  lambdaSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnet1: ec2.ISubnet;
  public readonly privateSubnet2: ec2.ISubnet;
  public readonly cluster?: undefined; // No longer creating cluster
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup; // Use provided security group
  public readonly databaseSecret?: secretsmanager.ISecret; // Optional when using internal apps database
  public readonly clusterEndpoint: string;
  public readonly clusterPort: number;
  public readonly databasePassword?: string;
  public readonly databaseUsername?: string;
  public readonly clusterIdentifier: string;
  public readonly useInternalAppsDatabase: boolean;
  public readonly proxyEndpoint: string;
  public readonly proxyPort: number;
  public readonly proxyArn: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const {
      environment,
      vpc,
      privateSubnet1: providedPrivateSubnet1,
      privateSubnet2: providedPrivateSubnet2,
      rdsSecurityGroup,
      existingDatabaseSecretArn,
      lambdaSecurityGroup, // Add this parameter
    } = props;

    this.vpc = vpc;
    this.privateSubnet1 = providedPrivateSubnet1!;
    this.privateSubnet2 = providedPrivateSubnet2!;
    
    // Use the provided Lambda security group from VPC stack instead of creating a new one
    this.lambdaSecurityGroup = lambdaSecurityGroup;
    
    const dbConfig = internalAppsDBConfig();
    const proxyConfigData = proxyConfig();
    
    this.databaseUsername = dbConfig.username;
    this.databasePassword = dbConfig.password;
    this.clusterEndpoint = dbConfig.host;
    this.clusterPort = dbConfig.port;
    this.clusterIdentifier = dbConfig.clusterIdentifier;
    
    // Add proxy configuration
    this.proxyEndpoint = proxyConfigData.endpoint;
    this.proxyPort = proxyConfigData.proxyPort;
    this.proxyArn = proxyConfigData.dbProxyArn;
    
    console.log('Using internal apps database configuration ', environment);
    console.log('Database host:', this.clusterEndpoint);
    console.log('Database port:', this.clusterPort);
    console.log('Database name:', dbConfig.databaseName);
    console.log('Proxy endpoint:', this.proxyEndpoint);
    console.log('Proxy port:', this.proxyPort);

    // TODO: Do we  need this still? Configure RDS security group rules using security group ID to avoid cyclic dependency
    // (rdsSecurityGroup as ec2.SecurityGroup).addIngressRule(
    //   this.lambdaSecurityGroup,
    //   ec2.Port.tcp(databasePort),
    //   "Allow Lambda functions to access PostgreSQL database"
    // );

    // // Allow database security group to communicate with itself
    // (rdsSecurityGroup as ec2.SecurityGroup).addIngressRule(
    //   rdsSecurityGroup,
    //   ec2.Port.allTraffic(),
    //   "Allow database instances to communicate with each other"
    // );


    // Import existing database secret or create new one
    if (existingDatabaseSecretArn) {
      console.log('Importing existing database secret:', existingDatabaseSecretArn);
      this.databaseSecret = secretsmanager.Secret.fromSecretCompleteArn(
        this,
        "ImportedDatabaseSecret",
        existingDatabaseSecretArn
      );
    } else {
      console.log('Creating new database secret');
      // Create database credentials secret
      let secretString: string;
      if (this.databasePassword) {
        // Use provided password
        secretString = JSON.stringify({
          username: this.databaseUsername,
          password: this.databasePassword,
        });
      } else { // environment == local
        // Generate password if not provided
        secretString = JSON.stringify({ username: this.databaseUsername });
      }

      this.databaseSecret = new secretsmanager.Secret(this, "DatabaseSecret", {
        secretName: `fund-a-scholar-${environment}-db-credentials`,
        description: "Credentials for the Fund-A-Scholar database",
        secretStringValue: this.databasePassword
          ? cdk.SecretValue.unsafePlainText(secretString)
          : undefined,
        generateSecretString: this.databasePassword
          ? undefined
          : {
              secretStringTemplate: JSON.stringify({
                username: this.databaseUsername,
              }),
              generateStringKey: "password",
              excludeCharacters: "\"@/\\'",
              passwordLength: 32,
            },
      });
    }

    // Parameter group not needed when using external cluster

    // Using external Aurora cluster - no cluster creation needed
    // Cluster endpoint and port are configured via environment variables in internalAppsDBConfig()

    // RDS Data API role not needed when using external cluster
    // External cluster should have its own IAM roles configured

    // Outputs for use in other stacks
    // new cdk.CfnOutput(this, "DataApiEndpoint", {
    //   value: `https://rds-data.${this.region}.amazonaws.com`,
    //   description: "RDS Data API endpoint",
    //   exportName: `${this.stackName}-DataApiEndpoint`,
    // });

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: this.clusterEndpoint,
      description: "Database endpoint (external cluster endpoint)",
      exportName: `${this.stackName}-DatabaseEndpoint`,
    });

    new cdk.CfnOutput(this, "DatabasePort", {
      value: this.clusterPort.toString(),
      description: "Database port",
      exportName: `${this.stackName}-DatabasePort`,
    });

    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: this.databaseSecret?.secretArn || "N/A",
      description: "Database secret ARN",
      exportName: `${this.stackName}-DatabaseSecretArn`,
    });

    // Remove LambdaSecurityGroupId output since we're using VPC stack's security group
    // new cdk.CfnOutput(this, "LambdaSecurityGroupId", {
    //   value: this.lambdaSecurityGroup.securityGroupId,
    //   description: "Lambda security group ID",
    //   exportName: `${this.stackName}-LambdaSecurityGroupId`,
    // });

    new cdk.CfnOutput(this, "ClusterIdentifier", {
      value: this.clusterIdentifier,
      description: "Cluster identifier (external cluster)",
      exportName: `${this.stackName}-ClusterIdentifier`,
    });

    // Add tags
    cdk.Tags.of(this).add("Project", "Fund-A-Scholar");
    cdk.Tags.of(this).add("Environment", environment);
  }
}

import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface CacheStackProps extends cdk.StackProps {
  environment: string;
  // VPC can be provided directly or via IDs
  vpc?: ec2.IVpc;
  vpcId?: string;
  // Subnets for cache deployment
  privateSubnet1: ec2.ISubnet;
  privateSubnet2: ec2.ISubnet;
  privateSubnet1Id?: string;
  privateSubnet2Id?: string;
  // Lambda security group to allow access
  lambdaSecurityGroup?: ec2.ISecurityGroup;
  lambdaSecurityGroupId?: string;
  // Cache configuration
  cacheNodeType?: string;
  cacheNumNodes?: number;
  enableCacheBackups?: boolean;
  enableMultiAz?: boolean;
}

export class CacheStack extends cdk.Stack {
  public readonly cacheSubnetGroup: elasticache.CfnSubnetGroup;
  public readonly cacheSecurityGroup: ec2.SecurityGroup;
  public readonly cacheCluster: elasticache.CfnReplicationGroup;
  public readonly cacheEndpoint: string;
  public readonly cachePort: number = 6379;

  constructor(scope: Construct, id: string, props: CacheStackProps) {
    super(scope, id, props);

    const {
      environment,
      vpc: providedVpc,
      vpcId,
      privateSubnet1: providedPrivateSubnet1,
      privateSubnet2: providedPrivateSubnet2,
      privateSubnet1Id,
      privateSubnet2Id,
      lambdaSecurityGroup: providedLambdaSecurityGroup,
      lambdaSecurityGroupId,
      cacheNodeType = 'cache.t3.micro',
      cacheNumNodes = 2,
      enableCacheBackups = true,
      enableMultiAz = true,
    } = props;

    // Resolve VPC
    let vpc: ec2.IVpc;
    if (providedVpc) {
      vpc = providedVpc;
    } else if (vpcId) {
      vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', { vpcId });
    } else {
      throw new Error('Either vpc object or vpcId must be provided');
    }

    // Resolve subnets
    let privateSubnet1: ec2.ISubnet;
    let privateSubnet2: ec2.ISubnet;
    
    privateSubnet1 = providedPrivateSubnet1;
    privateSubnet2 = providedPrivateSubnet2;
    // if (providedPrivateSubnet1 && providedPrivateSubnet2) {
    // } else if (privateSubnet1Id && privateSubnet2Id) {
    //   privateSubnet1 = ec2.Subnet.fromSubnetId(this, 'PrivateSubnet1', privateSubnet1Id);
    //   privateSubnet2 = ec2.Subnet.fromSubnetId(this, 'PrivateSubnet2', privateSubnet2Id);
    // } else {
    //   throw new Error('Either subnet objects or subnet IDs must be provided');
    // }

    // Resolve Lambda security group
    let lambdaSecurityGroup: ec2.ISecurityGroup;
    if (providedLambdaSecurityGroup) {
      lambdaSecurityGroup = providedLambdaSecurityGroup;
    } else if (lambdaSecurityGroupId) {
      lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this, 
        'LambdaSecurityGroup', 
        lambdaSecurityGroupId
      );
    } else {
      throw new Error('Either lambdaSecurityGroup object or lambdaSecurityGroupId must be provided');
    }

    // Create ElastiCache Security Group
    this.cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc: vpc,
      description: 'Security group for ElastiCache Redis cluster',
      allowAllOutbound: false,
    });

    // Allow Lambda functions to access Redis
    this.cacheSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(this.cachePort),
      'Allow Lambda functions to access Redis cache'
    );

    // Allow cache cluster internal communication
    this.cacheSecurityGroup.addIngressRule(
      this.cacheSecurityGroup,
      ec2.Port.tcp(this.cachePort),
      'Allow cache cluster communication'
    );

    // Create CloudWatch Log Group for ElastiCache logs
    const cacheLogGroup = new logs.LogGroup(this, 'CacheLogGroup', {
      logGroupName: `/aws/elasticache/fund-a-scholar-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create ElastiCache Subnet Group
    this.cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for Fund-A-Scholar ElastiCache',
      subnetIds: [privateSubnet1.subnetId, privateSubnet2.subnetId],
      cacheSubnetGroupName: `fund-a-scholar-${environment}-cache-subnet-group`,
    });

    // Create ElastiCache Parameter Group
    // NOTE: The correct parameter group family for Valkey 7.2 is 'valkey7'
    const cacheParameterGroup = new elasticache.CfnParameterGroup(this, 'CacheParameterGroup', {
      cacheParameterGroupFamily: 'valkey7',
      description: 'Parameter group for Fund-A-Scholar Valkey cache',
      properties: {
        'maxmemory-policy': 'allkeys-lru', // Optimal for caching
        'timeout': '300', // 5 minute client timeout
        'tcp-keepalive': '300', // Keep connections alive
      },
    });

    // Create ElastiCache Replication Group
    this.cacheCluster = new elasticache.CfnReplicationGroup(this, 'CacheCluster', {
      replicationGroupId: `fund-a-scholar-${environment}-cache`,
      replicationGroupDescription: `Redis cache cluster for Fund-A-Scholar ${environment} environment`,
      
      // Node configuration
      cacheNodeType: cacheNodeType,
      numCacheClusters: cacheNumNodes,
      
      // Network configuration
      cacheSubnetGroupName: this.cacheSubnetGroup.cacheSubnetGroupName,
      securityGroupIds: [this.cacheSecurityGroup.securityGroupId],
      
      // Redis configuration
      engine: 'valkey',
      engineVersion: '7.2',
      cacheParameterGroupName: cacheParameterGroup.ref,
      port: this.cachePort,
      
      // High availability
      multiAzEnabled: enableMultiAz && cacheNumNodes > 1,
      automaticFailoverEnabled: enableMultiAz && cacheNumNodes > 1,
      
      // Backup configuration
      snapshotRetentionLimit: enableCacheBackups ? 5 : 0,
      snapshotWindow: '03:00-05:00', // UTC backup window
      
      // Security
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      
      // Maintenance
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      
      // Logging
      logDeliveryConfigurations: [
        {
          destinationType: 'cloudwatch-logs',
          destinationDetails: {
            cloudWatchLogsDetails: {
              logGroup: cacheLogGroup.logGroupName,
            },
          },
          logFormat: 'json',
          logType: 'slow-log',
        },
      ],
    });

    // Set dependencies
    this.cacheCluster.addDependency(this.cacheSubnetGroup);
    this.cacheCluster.addDependency(cacheParameterGroup);

    // Store cache endpoint
    this.cacheEndpoint = this.cacheCluster.attrPrimaryEndPointAddress;

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'CacheEndpoint', {
      value: this.cacheEndpoint,
      description: 'ElastiCache Redis primary endpoint',
      exportName: `${this.stackName}-CacheEndpoint`,
    });

    new cdk.CfnOutput(this, 'CachePort', {
      value: this.cachePort.toString(),
      description: 'ElastiCache Redis port',
      exportName: `${this.stackName}-CachePort`,
    });

    new cdk.CfnOutput(this, 'CacheSecurityGroupId', {
      value: this.cacheSecurityGroup.securityGroupId,
      description: 'ElastiCache security group ID',
      exportName: `${this.stackName}-CacheSecurityGroupId`,
    });

    new cdk.CfnOutput(this, 'CacheClusterId', {
      value: this.cacheCluster.replicationGroupId || 'N/A',
      description: 'ElastiCache cluster ID',
      exportName: `${this.stackName}-CacheClusterId`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'Fund-A-Scholar');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Component', 'Cache');
  }
} 
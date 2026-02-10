import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NamingConvention } from '../bin/naming';
import { ProjectConfig } from '../bin/project-config';

export interface CacheStackProps extends cdk.StackProps {
  environment: string;
  projectConfig: ProjectConfig;
  naming: NamingConvention;
  vpc?: ec2.IVpc;
  vpcId?: string;
  privateSubnet1: ec2.ISubnet;
  privateSubnet2: ec2.ISubnet;
  privateSubnet1Id?: string;
  privateSubnet2Id?: string;
  lambdaSecurityGroup?: ec2.ISecurityGroup;
  lambdaSecurityGroupId?: string;
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
      projectConfig,
      naming,
      vpc: providedVpc,
      vpcId,
      privateSubnet1: providedPrivateSubnet1,
      privateSubnet2: providedPrivateSubnet2,
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

    const privateSubnet1 = providedPrivateSubnet1;
    const privateSubnet2 = providedPrivateSubnet2;

    // Resolve Lambda security group
    let lambdaSecurityGroup: ec2.ISecurityGroup;
    if (providedLambdaSecurityGroup) {
      lambdaSecurityGroup = providedLambdaSecurityGroup;
    } else if (lambdaSecurityGroupId) {
      lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this, 'LambdaSecurityGroup', lambdaSecurityGroupId
      );
    } else {
      throw new Error('Either lambdaSecurityGroup object or lambdaSecurityGroupId must be provided');
    }

    this.cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis cluster',
      allowAllOutbound: false,
    });

    this.cacheSecurityGroup.addIngressRule(
      lambdaSecurityGroup, ec2.Port.tcp(this.cachePort),
      'Allow Lambda functions to access Redis cache'
    );

    this.cacheSecurityGroup.addIngressRule(
      this.cacheSecurityGroup, ec2.Port.tcp(this.cachePort),
      'Allow cache cluster communication'
    );

    const cacheLogGroup = new logs.LogGroup(this, 'CacheLogGroup', {
      logGroupName: `/aws/elasticache/${projectConfig.projectSlug}-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: `Subnet group for ${projectConfig.projectDisplayName} ElastiCache`,
      subnetIds: [privateSubnet1.subnetId, privateSubnet2.subnetId],
      cacheSubnetGroupName: `${projectConfig.projectSlug}-${environment}-cache-subnet-group`,
    });

    const cacheParameterGroup = new elasticache.CfnParameterGroup(this, 'CacheParameterGroup', {
      cacheParameterGroupFamily: 'valkey7',
      description: `Parameter group for ${projectConfig.projectDisplayName} Valkey cache`,
      properties: {
        'maxmemory-policy': 'allkeys-lru',
        'timeout': '300',
        'tcp-keepalive': '300',
      },
    });

    this.cacheCluster = new elasticache.CfnReplicationGroup(this, 'CacheCluster', {
      replicationGroupId: naming.cacheName(),
      replicationGroupDescription: `Redis cache cluster for ${projectConfig.projectDisplayName} ${environment} environment`,
      cacheNodeType,
      numCacheClusters: cacheNumNodes,
      cacheSubnetGroupName: this.cacheSubnetGroup.cacheSubnetGroupName,
      securityGroupIds: [this.cacheSecurityGroup.securityGroupId],
      engine: 'valkey',
      engineVersion: '7.2',
      cacheParameterGroupName: cacheParameterGroup.ref,
      port: this.cachePort,
      multiAzEnabled: enableMultiAz && cacheNumNodes > 1,
      automaticFailoverEnabled: enableMultiAz && cacheNumNodes > 1,
      snapshotRetentionLimit: enableCacheBackups ? 5 : 0,
      snapshotWindow: '03:00-05:00',
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      logDeliveryConfigurations: [{
        destinationType: 'cloudwatch-logs',
        destinationDetails: {
          cloudWatchLogsDetails: { logGroup: cacheLogGroup.logGroupName },
        },
        logFormat: 'json',
        logType: 'slow-log',
      }],
    });

    this.cacheCluster.addDependency(this.cacheSubnetGroup);
    this.cacheCluster.addDependency(cacheParameterGroup);
    this.cacheEndpoint = this.cacheCluster.attrPrimaryEndPointAddress;

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

    cdk.Tags.of(this).add('Project', projectConfig.projectDisplayName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Component', 'Cache');
  }
}

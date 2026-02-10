import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VPCEnvironmentConfig } from "../bin/env-config";

export interface VpcStackProps extends cdk.StackProps {
  projectName?: string;
  environment: string;
  isLocalEnvironment?: boolean;
  
  // For deployed environments - VPC import configuration
  vpcConfig?: VPCEnvironmentConfig;
}

export class VpcStack extends cdk.Stack {
  public vpc: ec2.IVpc;
  public publicSubnet1: ec2.ISubnet;
  public publicSubnet2: ec2.ISubnet;
  public privateAppSubnet1: ec2.ISubnet;
  public privateAppSubnet2: ec2.ISubnet;
  public privateDataSubnet1: ec2.ISubnet;
  public privateDataSubnet2: ec2.ISubnet;
  public ec2EcsSecurityGroup: ec2.SecurityGroup;
  public lambdaSecurityGroup: ec2.SecurityGroup;
  public rdsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    const { projectName = "EribertoLopez", environment, isLocalEnvironment = false, vpcConfig } = props;

    if (isLocalEnvironment) {
      this.createLocalResources(projectName, environment);
    } else {
      this.createDeployedResources(projectName, environment, vpcConfig!);
    }
  }

  /**
   * Configure RDS security group rules using Lambda security group ID
   * This avoids cyclic dependencies by using the security group ID instead of the object
   */
  public configureRdsSecurityGroupRulesWithId(lambdaSecurityGroupId: string, databasePort: number = 5432) {
    console.log('Configuring RDS security group rules for Lambda access');
    
    // Allow Lambda security group to access database on PostgreSQL port
    (this.rdsSecurityGroup as ec2.SecurityGroup).addIngressRule(
      ec2.Peer.securityGroupId(lambdaSecurityGroupId),
      ec2.Port.tcp(databasePort),
      "Allow Lambda functions to access PostgreSQL database"
    );

    // Allow database security group to communicate with itself
    (this.rdsSecurityGroup as ec2.SecurityGroup).addIngressRule(
      this.rdsSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow database instances to communicate with each other"
    );
  }

  private createLocalResources(projectName: string, environment: string) {
    console.log("Creating LocalStack-compatible VPC resources");
    // For LocalStack: Use simplified approach to avoid hanging
    console.log("LocalStack detected - using simplified VPC configuration");

    this.vpc = new ec2.Vpc(this, "VPC", {
      ipAddresses: ec2.IpAddresses.cidr("10.200.0.0/16"),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "PrivateApp",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
        {
          name: "PrivateData",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      maxAzs: 2,
    });

    // Use auto-created subnets for LocalStack
    this.publicSubnet1 = this.vpc.publicSubnets[0];
    this.publicSubnet2 = this.vpc.publicSubnets[1];
    this.privateAppSubnet1 = this.vpc.isolatedSubnets[0];
    this.privateAppSubnet2 = this.vpc.isolatedSubnets[1];
    this.privateDataSubnet1 =
      this.vpc.isolatedSubnets[2] || this.vpc.isolatedSubnets[0];
    this.privateDataSubnet2 =
      this.vpc.isolatedSubnets[3] || this.vpc.isolatedSubnets[1];

    // Create security groups for LocalStack
    this.createLocalSecurityGroups(projectName, environment);
  }

  private createDeployedResources(projectName: string, environment: string, vpcConfig: VPCEnvironmentConfig) {
    console.log(`Importing existing VPC: ${vpcConfig.vpcId}`);
    
    // Import VPC
    this.vpc = ec2.Vpc.fromVpcAttributes(this, "ImportedVPC", {
      vpcId: vpcConfig.vpcId,
      availabilityZones: vpcConfig.availabilityZones,
      vpcCidrBlock: vpcConfig.vpcCidr,
      publicSubnetIds: [vpcConfig.subnets.public.subnet1.id, vpcConfig.subnets.public.subnet2.id],
      privateSubnetIds: [vpcConfig.subnets.privateApp.subnet1.id, vpcConfig.subnets.privateApp.subnet2.id],
      isolatedSubnetIds: [vpcConfig.subnets.privateData.subnet1.id, vpcConfig.subnets.privateData.subnet2.id],
    });

    // Import Subnets
    this.publicSubnet1 = ec2.Subnet.fromSubnetAttributes(this, "ImportedPublicSubnet1", {
      subnetId: vpcConfig.subnets.public.subnet1.id,
      availabilityZone: vpcConfig.subnets.public.subnet1.az,
    });
    
    this.publicSubnet2 = ec2.Subnet.fromSubnetAttributes(this, "ImportedPublicSubnet2", {
      subnetId: vpcConfig.subnets.public.subnet2.id,
      availabilityZone: vpcConfig.subnets.public.subnet2.az,
    });

    this.privateAppSubnet1 = ec2.Subnet.fromSubnetAttributes(this, "ImportedPrivateAppSubnet1", {
      subnetId: vpcConfig.subnets.privateApp.subnet1.id,
      availabilityZone: vpcConfig.subnets.privateApp.subnet1.az,
    });

    this.privateAppSubnet2 = ec2.Subnet.fromSubnetAttributes(this, "ImportedPrivateAppSubnet2", {
      subnetId: vpcConfig.subnets.privateApp.subnet2.id,
      availabilityZone: vpcConfig.subnets.privateApp.subnet2.az,
    });

    this.privateDataSubnet1 = ec2.Subnet.fromSubnetAttributes(this, "ImportedPrivateDataSubnet1", {
      subnetId: vpcConfig.subnets.privateData.subnet1.id,
      availabilityZone: vpcConfig.subnets.privateData.subnet1.az,
    });

    this.privateDataSubnet2 = ec2.Subnet.fromSubnetAttributes(this, "ImportedPrivateDataSubnet2", {
      subnetId: vpcConfig.subnets.privateData.subnet2.id,
      availabilityZone: vpcConfig.subnets.privateData.subnet2.az,
    });

    // Import or create security groups
    this.createDeployedSecurityGroups(projectName, environment, vpcConfig);
  }

  private createLocalSecurityGroups(projectName: string, environment: string) {
    // Create all security groups for LocalStack
    this.rdsSecurityGroup = new ec2.SecurityGroup(this, "LocalRDSSecurityGroup", {
      vpc: this.vpc,
      description: "Local RDS security group",
      allowAllOutbound: false,
    });

    this.ec2EcsSecurityGroup = new ec2.SecurityGroup(this, "LocalEC2ECSSecurityGroup", {
      vpc: this.vpc,
      description: "Local ECS security group",
      allowAllOutbound: true,
    });

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LocalLambdaSecurityGroup", {
      vpc: this.vpc,
      description: "Local Lambda security group",
      allowAllOutbound: true,
    });

    // Add basic rules for local development
    this.rdsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "Allow PostgreSQL from anywhere (local dev)"
    );

    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "Allow PostgreSQL access"
    );

    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS access"
    );
  }

  private createDeployedSecurityGroups(projectName: string, environment: string, vpcConfig: VPCEnvironmentConfig) {
    // Import or create RDS Security Group
    if (vpcConfig.securityGroups.rds) {
      console.log(`Importing existing RDS security group: ${vpcConfig.securityGroups.rds}`);
      this.rdsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this,
        "ImportedRdsSecurityGroup",
        vpcConfig.securityGroups.rds
      ) as ec2.SecurityGroup;
    } else {
      console.log("Creating new RDS security group");
      this.rdsSecurityGroup = new ec2.SecurityGroup(this, "RDSSecurityGroup", {
        vpc: this.vpc,
        description: "Security group for RDS PostgreSQL instances",
        allowAllOutbound: false,
      });
      this.rdsSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(vpcConfig.vpcCidr),
        ec2.Port.tcp(5432),
        "Allow PostgreSQL from VPC"
      );
    }

    // Import or create ECS Security Group
    if (vpcConfig.securityGroups.ecsEc2) {
      console.log(`Importing existing ECS security group: ${vpcConfig.securityGroups.ecsEc2}`);
      this.ec2EcsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this,
        "ImportedEc2EcsSecurityGroup",
        vpcConfig.securityGroups.ecsEc2
      ) as ec2.SecurityGroup;
    } else {
      console.log("Creating new ECS security group");
      this.ec2EcsSecurityGroup = new ec2.SecurityGroup(this, "EC2ECSSecurityGroup", {
        vpc: this.vpc,
        description: "Security group for EC2 instances and ECS tasks",
        allowAllOutbound: false,
      });
      this.ec2EcsSecurityGroup.addEgressRule(
        ec2.Peer.ipv4(vpcConfig.vpcCidr),
        ec2.Port.tcp(5432),
        "Allow PostgreSQL to VPC"
      );
      this.ec2EcsSecurityGroup.addEgressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(443),
        "Allow HTTPS to external services"
      );
    }

    // Create Lambda Security Group (always new for deployed)
    console.log("Creating new Lambda security group");
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for Lambda functions",
      allowAllOutbound: false,
    });
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.ipv4(vpcConfig.vpcCidr),
      ec2.Port.tcp(5432),
      "Allow PostgreSQL to VPC"
    );
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.ipv4(vpcConfig.vpcCidr),
      ec2.Port.tcp(6379),
      "Allow Cache access to VPC"
    );
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS to AWS services"
    );
  }
}

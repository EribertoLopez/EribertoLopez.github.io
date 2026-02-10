# VPC Import Configuration Summary

## Overview
This document summarizes the existing VPC resources that have been discovered and configured for import into the Fund-A-Scholar CDK infrastructure.

## VPC Details

**VPC Name**: `hsf-prod-internal_apps-vpc`  
**VPC ID**: `vpc-0751d21692306c953`  
**CIDR**: `10.6.0.0/21`  
**Region**: `us-west-1`  
**Availability Zones**: `us-west-1a`, `us-west-1c`

---

## Subnet Mapping

### Public Subnets (for ALB, NAT Gateways)
| Purpose | AZ | Subnet ID | CIDR | Name |
|---------|----|-----------| -----|------|
| Public 1 | us-west-1a | `subnet-0c175ab5e52d71066` | 10.6.2.0/24 | hsf-prod-internal_apps-public-subnet-data-az1a |
| Public 2 | us-west-1c | `subnet-0c272d8fe5361f52f` | 10.6.3.0/24 | hsf-prod-internal_apps-public-subnet-data-az1b |

### Private App Subnets (for ECS Tasks, Lambda)
| Purpose | AZ | Subnet ID | CIDR | Name |
|---------|----|-----------| -----|------|
| App 1 | us-west-1a | `subnet-072d7b2feabe9dd0b` | 10.6.4.0/28 | hsf-prod-internal_apps-private-subnet-transit-az1a |
| App 2 | us-west-1c | `subnet-0c68bdd2c9ccfdaf7` | 10.6.4.16/28 | hsf-prod-internal_apps-private-subnet-transit-az1c |

### Private Data Subnets (for RDS, ElastiCache)
| Purpose | AZ | Subnet ID | CIDR | Name |
|---------|----|-----------| -----|------|
| Data 1 | us-west-1a | `subnet-0eedfbb8c06292d1b` | 10.6.0.0/24 | hsf-prod-internal_apps-private-subnet-data-az1a |
| Data 2 | us-west-1c | `subnet-06501c3ea18c5b482` | 10.6.1.0/24 | hsf-prod-internal_apps-private-subnet-data-az1c |

---

## Security Groups

| Purpose | Group ID | Group Name | Status |
|---------|----------|------------|--------|
| Lambda | - | - | ⚠️ **Will be created by CDK** |
| RDS | `sg-022ea13b4871be8a0` | prod-hsf4-rds-sg | ✅ **Exists** |
| ALB | - | - | ⚠️ **Will be created by CDK** |
| ECS/EC2 | `sg-0c6004f5809f17333` | sg_internal_apps_ec2 | ✅ **Exists** |

---

## NAT Gateways

| NAT Gateway | ID | Status |
|-------------|-----|--------|
| NAT GW 1 (AZ1a) | `nat-081e81c202fce4c7c` | ✅ Active |
| NAT GW 2 (AZ1c) | `nat-07456d0754f82c5c5` | ✅ Active |

---

## Configuration File

The complete configuration has been saved to: **`infrastructure/vpc-config.json`**

This file can be:
1. Committed to the repository for prod environment
2. Injected via CI/CD pipeline
3. Loaded at CDK synthesis time

---

## Next Steps

### 1. Update VpcStack to Support Import Mode

Add import functionality to `infrastructure/lib/vpc.ts`:

```typescript
export interface VpcStackProps extends cdk.StackProps {
  projectName?: string;
  environment: string;
  
  // NEW: Import mode properties
  importExistingVpc?: boolean;
  existingVpcId?: string;
  existingPublicSubnet1Id?: string;
  existingPublicSubnet2Id?: string;
  existingPrivateAppSubnet1Id?: string;
  existingPrivateAppSubnet2Id?: string;
  existingPrivateDataSubnet1Id?: string;
  existingPrivateDataSubnet2Id?: string;
  existingRdsSecurityGroupId?: string;
  existingEc2EcsSecurityGroupId?: string;
  
  // Existing properties for creating new VPC
  vpcCidr?: string;
  // ... rest
}
```

### 2. Update infrastructure.ts to Load Config

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Load VPC configuration
const vpcConfigFile = path.join(__dirname, '../vpc-config.json');
let vpcConfig: any = {};
if (fs.existsSync(vpcConfigFile)) {
  vpcConfig = JSON.parse(fs.readFileSync(vpcConfigFile, 'utf-8'));
}

const environment = process.env.ENVIRONMENT || "local";
const envVpcConfig = vpcConfig?.vpcConfig?.[environment];

if (deployBackend && envVpcConfig) {
  // Import existing VPC
  const vpcStack = new VpcStack(app, "FundAScholar-VPC-Stack", {
    env,
    environment,
    projectName: "FundAScholar",
    
    importExistingVpc: true,
    existingVpcId: envVpcConfig.vpcId,
    existingPublicSubnet1Id: envVpcConfig.subnets.public.subnet1.id,
    existingPublicSubnet2Id: envVpcConfig.subnets.public.subnet2.id,
    existingPrivateAppSubnet1Id: envVpcConfig.subnets.privateApp.subnet1.id,
    existingPrivateAppSubnet2Id: envVpcConfig.subnets.privateApp.subnet2.id,
    existingPrivateDataSubnet1Id: envVpcConfig.subnets.privateData.subnet1.id,
    existingPrivateDataSubnet2Id: envVpcConfig.subnets.privateData.subnet2.id,
    
    // Import existing security groups if they exist
    ...(envVpcConfig.securityGroups.rds && {
      existingRdsSecurityGroupId: envVpcConfig.securityGroups.rds
    }),
    ...(envVpcConfig.securityGroups.ecsEc2 && {
      existingEc2EcsSecurityGroupId: envVpcConfig.securityGroups.ecsEc2
    }),
    
    description: `Fund-A-Scholar VPC stack (imported from ${envVpcConfig.vpcName})`,
    tags: {
      Project: "FundAScholar",
      Environment: environment,
    },
  });
}
```

### 3. Implement VpcStack Import Logic

In `infrastructure/lib/vpc.ts`, add conditional logic:

```typescript
constructor(scope: Construct, id: string, props: VpcStackProps) {
  super(scope, id, props);
  
  const { importExistingVpc, projectName = "FundAScholar", environment } = props;
  
  if (importExistingVpc && props.existingVpcId) {
    // Import existing VPC resources
    this.vpc = ec2.Vpc.fromLookup(this, "ImportedVPC", {
      vpcId: props.existingVpcId,
    });
    
    this.publicSubnet1 = ec2.Subnet.fromSubnetId(
      this, "ImportedPublicSubnet1", props.existingPublicSubnet1Id!
    );
    // ... import other subnets
    
    // Import or create security groups
    if (props.existingRdsSecurityGroupId) {
      this.rdsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this, "ImportedRdsSecurityGroup", props.existingRdsSecurityGroupId
      );
    } else {
      // Create RDS security group
      this.rdsSecurityGroup = new ec2.SecurityGroup(/*...*/);
    }
    
    // Lambda and ALB SGs will be created since they don't exist
    this.lambdaSecurityGroup = new ec2.SecurityGroup(/*...*/);
    this.albSecurityGroup = new ec2.SecurityGroup(/*...*/);
    
    // Still export everything for other stacks
    this.createOutputs(projectName, environment);
  } else {
    // Existing VPC creation logic
  }
}
```

---

## Important Notes

1. **Security Groups**: Lambda and ALB security groups don't exist in the shared VPC, so VpcStack will create them. This is expected and correct.

2. **Transit Subnets**: The "transit" subnets (10.6.4.0/28 and 10.6.4.16/28) are small subnets likely intended for VPN/transit gateway connections. We're using them for ECS/Lambda which should be fine for application workloads.

3. **Public Subnets**: Although named "public-subnet-data", these subnets have routes to IGW and are suitable for ALB and other public-facing resources.

4. **NAT Gateways**: Both NAT gateways are active, providing outbound internet access for private subnets.

5. **Cross-Account**: If the VPC is in a different AWS account, you'll need to adjust the import approach using VPC peering or Transit Gateway.

---

## Testing Strategy

1. **Synthesize First**: Run `cdk synth` to verify the stack generates correctly
2. **Deploy to Dev**: Test the import approach in a dev environment first
3. **Verify Connectivity**: Ensure Lambda, RDS, and ECS can communicate
4. **Review Security Groups**: Confirm the newly created security groups have correct rules
5. **Test Applications**: Verify all services work as expected
6. **Deploy to Prod**: Once validated, deploy to production

---

## Regenerating Config

To regenerate the VPC configuration (e.g., for different environments):

```bash
# For production
AWS_PROFILE=prod ./scripts/generate-vcp-config.sh

# For staging (update VPC_NAME in script first)
AWS_PROFILE=staging ./scripts/generate-vcp-config.sh
```

---

## Questions to Consider

1. **Do we need to create new security groups?** 
   - Current plan: Create Lambda and ALB security groups in the VpcStack
   - Alternative: Reuse existing sg_internal_apps_ec2 for Lambda

2. **Should ECS use app or data subnets?**
   - Current mapping: ECS → Private App (transit) subnets ✅
   - This is correct for compute workloads

3. **Are transit subnet sizes adequate?**
   - Transit subnets are /28 (14 usable IPs each)
   - May be tight for ECS tasks if you run many containers
   - Monitor and consider using data subnets if needed

4. **Environment-specific configs**:
   - Current approach works for prod
   - Need similar configs for dev, staging, etc.

---

## Deployment Command

Once implemented:

```bash
# Deploy with imported VPC
ENVIRONMENT=prod cdk deploy --all --profile prod

# Or deploy specific stacks
ENVIRONMENT=prod cdk deploy FundAScholar-VPC-Stack --profile prod
```


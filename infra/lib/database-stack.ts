// TODO: Phase 6 - Database Stack (RDS PostgreSQL + pgvector)
// Creates:
// - VPC with public and private subnets (2 AZs)
// - RDS PostgreSQL instance (db.t4g.micro, private subnet)
// - Security groups (Lambda→RDS, ECS→RDS ingress on 5432)
// - VPC endpoints for Bedrock and CloudWatch Logs
// - Secrets Manager secret for DB credentials
// - Custom resource to enable pgvector extension
//
// See docs/AWS_MIGRATION_PLAN.md "Phase 6" for full details.

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class DatabaseStack extends cdk.Stack {
  // TODO: Export VPC, security groups, DB endpoint for other stacks

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: Create VPC (2 AZs, 1 NAT gateway to save cost)
    // TODO: Create RDS PostgreSQL 16 instance (db.t4g.micro)
    //   - Enable storage encryption
    //   - Enable automated backups (7 day retention)
    //   - Enable deletion protection
    //   - Set max_connections appropriate for micro instance
    // TODO: Create security groups
    //   - Lambda SG → DB SG on port 5432
    //   - ECS SG → DB SG on port 5432
    // TODO: Create Secrets Manager secret for DB credentials
    // TODO: Create VPC endpoints (Bedrock, CloudWatch, S3 gateway)
    // TODO: Add custom resource Lambda to run CREATE EXTENSION vector
  }
}

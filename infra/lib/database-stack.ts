// Phase 6: Database Stack — RDS PostgreSQL + pgvector
// Creates VPC, RDS instance, RDS Proxy, security groups, VPC endpoints
// See docs/AWS_MIGRATION_PLAN.md "Phase 6"
//
// ⚠️  COST WARNING: This phase adds ~$30-50/month.
//     Consider keeping Supabase free tier unless self-hosting is required.

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly dbEndpoint: string;
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC — 2 AZs, private subnets for RDS, VPC endpoints instead of NAT Gateway ($32/mo savings)
    // TODO: Create VPC with:
    //   - 2 AZs
    //   - Private isolated subnets (for RDS)
    //   - Private with egress subnets (for Lambda, using VPC endpoints)
    //   - NO NAT Gateway (use VPC endpoints instead)

    // Security Groups
    // TODO: Create Lambda SG and ECS SG
    // TODO: Create DB SG allowing inbound 5432 from Lambda SG and ECS SG only

    // RDS PostgreSQL 16 Instance
    // TODO: Create RDS instance with:
    //   - Engine: PostgreSQL 16
    //   - Instance: db.t4g.micro
    //   - Storage: 20GB gp3, encrypted
    //   - Multi-AZ: false (cost savings for portfolio site)
    //   - Automated backups: 7-day retention
    //   - Deletion protection: enabled
    //   - IAM authentication: ENABLED (prefer over password auth)
    //   - SSL enforcement: rds.force_ssl = 1 in parameter group
    //   - Performance Insights: enabled (free tier)

    // RDS Proxy — CRITICAL for Lambda connection management
    // TODO: Create RDS Proxy with:
    //   - Engine family: POSTGRESQL
    //   - IAM auth: required
    //   - Connection pooling: max 80% of db max_connections
    //   - Idle timeout: 300 seconds
    //   This prevents Lambda connection storms on db.t4g.micro (82 max_connections)

    // VPC Endpoints — replace NAT Gateway to save $32/month
    // TODO: Create VPC endpoints for:
    //   - com.amazonaws.{region}.bedrock-runtime (Interface)
    //   - com.amazonaws.{region}.secretsmanager (Interface)
    //   - com.amazonaws.{region}.logs (Interface)
    //   - com.amazonaws.{region}.s3 (Gateway — free)

    // Custom Resource — enable pgvector extension
    // TODO: Lambda custom resource that runs:
    //   CREATE EXTENSION IF NOT EXISTS vector;

    // Outputs
    this.vpc = {} as ec2.IVpc; // TODO: Set from VPC construct
    this.dbEndpoint = ""; // TODO: Set from RDS Proxy endpoint (not direct RDS)
    this.lambdaSecurityGroup = {} as ec2.ISecurityGroup; // TODO: Set from SG
  }
}

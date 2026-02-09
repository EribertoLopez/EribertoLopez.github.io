// TODO: Phase 1 - Static Site Stack
// Phase 1: AWS Foundation + CDK Bootstrap
//
// This stack creates:
// - S3 bucket for static site hosting (private, no public access)
// - CloudFront distribution with OAC (Origin Access Control)
// - ACM certificate for custom domain (us-east-1)
// - Route 53 alias record
// - IAM role for GitHub Actions deployment (OIDC federation)
//
// See docs/AWS_MIGRATION_PLAN.md "Phase 1" for full details.

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface StaticSiteStackProps extends cdk.StackProps {
  domainName: string;
}

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    // TODO: Create S3 bucket (private, versioned)
    // TODO: Create CloudFront distribution with OAC
    // TODO: Create ACM certificate (DNS validation)
    // TODO: Create Route 53 alias record
    // TODO: Create GitHub Actions OIDC IAM role for S3 sync + CF invalidation
    // TODO: Output CloudFront distribution URL and S3 bucket name
  }
}

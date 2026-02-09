// Phase 1: AWS Foundation — Static Site Stack
// S3 + CloudFront + OAC + ACM + Security Headers
// See docs/AWS_MIGRATION_PLAN.md "Phase 1" for full details.

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface StaticSiteStackProps extends cdk.StackProps {
  domainName: string;
}

export class StaticSiteStack extends cdk.Stack {
  public readonly distributionId: string;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    // S3 Bucket — private, encrypted, no public access
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `${props.domainName}-site`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // CloudFront Response Headers Policy — security headers
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeaders",
      {
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(365),
            includeSubdomains: true,
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          xssProtection: { protection: true, modeBlock: true, override: true },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
        },
      }
    );

    // TODO: Create ACM certificate (must be us-east-1 for CloudFront)
    // TODO: Create CloudFront distribution with OAC
    // TODO: Configure custom error response for SPA routing (404 → /404/index.html)
    // TODO: Create Route 53 alias record
    // TODO: Create GitHub Actions OIDC IAM role (scoped to this repo only)

    // GitHub Actions OIDC — scoped to this repository
    // TODO: Create OIDC provider and role with condition:
    // StringLike: { "token.actions.githubusercontent.com:sub": "repo:EribertoLopez/EribertoLopez.github.io:*" }

    // Outputs
    new cdk.CfnOutput(this, "BucketName", { value: siteBucket.bucketName });
  }
}

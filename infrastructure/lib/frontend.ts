import * as path from "path";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import {
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
  Function,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  SecurityPolicyProtocol,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  BucketDeployment,
  CacheControl,
  Source,
} from "aws-cdk-lib/aws-s3-deployment";
import { loadSiteRouterCode } from "./cloudfront-functions/load-site-router";
import {
  certificateAttachment,
  getCloudFrontConfig,
  validateCloudFrontConfig,
} from "./config/cloudfront-config";

export interface FrontendStackProps extends cdk.StackProps {
  environment: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    this.createFrontend(props.environment);
  }

  private createFrontend(environment: string) {
    const cloudFrontConfig = getCloudFrontConfig(environment);
    validateCloudFrontConfig(environment, cloudFrontConfig);
    const attachment = certificateAttachment(cloudFrontConfig);

    // Private S3 bucket for the site assets
    const siteBucket = new Bucket(this, "SiteBucket", {
      bucketName: `eribertolopez-frontend-${environment}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // change to DESTROY for non-prod
      autoDeleteObjects: false, // set true if DESTROY above
    });

    // CloudFront OAI (Origin Access Identity) to allow CF to read from S3
    const oai = new OriginAccessIdentity(this, "SiteOAI");

    // Grant CloudFront access to the bucket contents
    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [oai.grantPrincipal],
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
      })
    );

    // Viewer-request function: www → apex, and /latest/<slug> → /latest/<slug>.html
    const spaRoutingFunction = new Function(this, "SPARoutingFunction", {
      runtime: FunctionRuntime.JS_1_0,
      code: FunctionCode.fromInline(loadSiteRouterCode()),
      comment: "Redirect www to the apex and map extensionless Next.js export paths to .html",
    });

    const certificate =
      attachment === "attached" && cloudFrontConfig.certificateArn
        ? acm.Certificate.fromCertificateArn(
            this,
            "SiteCertificate",
            cloudFrontConfig.certificateArn
          )
        : undefined;

    if (attachment === "pending-certificate") {
      cdk.Annotations.of(this).addWarning(
        `Alternate domain names ${cloudFrontConfig.customDomains.join(", ")} stay off this distribution until CLOUDFRONT_CERTIFICATE_ARN is a validated us-east-1 ACM certificate. Keep the Namecheap website records on GitHub Pages until CloudFront lists those names.`
      );
    }

    const distribution = new Distribution(this, "SiteDistribution", {
      defaultBehavior: {
        origin: new S3Origin(siteBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: spaRoutingFunction,
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: "index.html",
      enableLogging: false,
      ...(certificate
        ? {
            domainNames: cloudFrontConfig.customDomains,
            certificate,
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
          }
        : {}),
    });

    const siteBundlePath = path.resolve(__dirname, "../../frontend/out");
    // GitHub Pages still uses frontend/public/CNAME. Leave that file in git until
    // DNS cutover, and keep it out of the bucket.
    const publishedAssetExcludes = ["CNAME", "**/CNAME"];

    // 2a) Immutable assets (long cache)
    new BucketDeployment(this, "DeployAssets", {
      sources: [Source.asset(siteBundlePath)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      cacheControl: [
        CacheControl.maxAge(cdk.Duration.days(365)),
        CacheControl.immutable(),
      ],
      prune: false,
      exclude: ["*.html", "**/*.html", "*.txt", "**/*.txt", ...publishedAssetExcludes],
      memoryLimit: 3008, // Increase memory (and timeout) for large deployments
    });

    // 2b) HTML (no-cache so refresh picks up new content)
    new BucketDeployment(this, "DeployHtml", {
      sources: [Source.asset(siteBundlePath)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      cacheControl: [CacheControl.noCache()],
      prune: true,
      include: ["*.html", "**/*.html", "*.txt", "**/*.txt"],
      exclude: publishedAssetExcludes,
      memoryLimit: 3008, // Increase memory (and timeout) for large deployments
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
      description:
        "CloudFront hostname. Namecheap ALIAS for @ and CNAME for www use this value (dxxxx.cloudfront.net).",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "Compare this id with the GitHub Actions secret CF_DISTRIBUTION_ID before changing DNS.",
    });

    new cdk.CfnOutput(this, "SiteDomainNames", {
      value: cloudFrontConfig.customDomains.join(",") || "none",
      description: "Alternate domain names configured for this environment.",
    });

    new cdk.CfnOutput(this, "CustomDomainAttachment", {
      value: attachment,
      description:
        "attached: certificate and alternate names are on the distribution. pending-certificate: set CLOUDFRONT_CERTIFICATE_ARN and deploy again. not-configured: this environment has no custom domains.",
    });

    if (certificate) {
      new cdk.CfnOutput(this, "CertificateArn", {
        value: certificate.certificateArn,
        description: "us-east-1 ACM certificate attached to the distribution.",
      });
    }
  }
}

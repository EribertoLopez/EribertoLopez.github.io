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
  certificatePlan,
  CloudFrontEnvironmentConfig,
  customDomainOptOut,
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
    const optedOut = customDomainOptOut(this.node.tryGetContext("customDomain"));
    const plan = certificatePlan(cloudFrontConfig, optedOut);
    const attachment = certificateAttachment(cloudFrontConfig, optedOut);

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

    const certificate = this.resolveCertificate(environment, cloudFrontConfig, plan);

    if (plan === "pending") {
      cdk.Annotations.of(this).addWarning(
        `Alternate domain names ${cloudFrontConfig.customDomains.join(", ")} are off this distribution because CDK context customDomain=false. A normal prod deploy creates the us-east-1 certificate and attaches both names.`
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
        "attached: certificate and alternate names are on the distribution. pending-certificate: synth used -c customDomain=false. not-configured: this environment has no custom domains.",
    });

    if (certificate) {
      new cdk.CfnOutput(this, "CertificateArn", {
        value: certificate.certificateArn,
        description:
          "us-east-1 ACM certificate attached to the distribution. Present after the stack finishes; DNS validation is still in progress while the certificate resource is CREATE_IN_PROGRESS.",
      });
    }
  }

  private resolveCertificate(
    environment: string,
    config: CloudFrontEnvironmentConfig,
    plan: ReturnType<typeof certificatePlan>
  ): acm.ICertificate | undefined {
    switch (plan) {
      case "none":
      case "pending":
        return undefined;
      case "import": {
        const arn = config.certificateArn;
        if (!arn) {
          throw new Error(
            `CloudFront configuration error for environment '${environment}': import plan is missing CLOUDFRONT_CERTIFICATE_ARN.`
          );
        }
        return acm.Certificate.fromCertificateArn(this, "SiteCertificate", arn);
      }
      case "create": {
        this.assertCertificateRegion(environment);
        const [domainName, ...subjectAlternativeNames] = config.customDomains;
        if (!domainName) {
          throw new Error(
            `CloudFront configuration error for environment '${environment}': custom domain is enabled but no domain names are configured.`
          );
        }
        return new acm.Certificate(this, "SiteCertificate", {
          domainName,
          subjectAlternativeNames: subjectAlternativeNames.length ? subjectAlternativeNames : undefined,
          validation: acm.CertificateValidation.fromDns(),
        });
      }
      default: {
        const unexpected: never = plan;
        throw new Error(`Unexpected certificate plan: ${String(unexpected)}`);
      }
    }
  }

  private assertCertificateRegion(environment: string): void {
    if (cdk.Token.isUnresolved(this.region) || this.region === "us-east-1") {
      return;
    }
    throw new Error(
      `CloudFront configuration error for environment '${environment}': ` +
        `creating the DNS-validated certificate requires this stack in us-east-1 ` +
        `(CloudFront only accepts certificates from that region). Current region: ${this.region}. ` +
        `Deploy Frontend already sets AWS_REGION=us-east-1.`
    );
  }
}

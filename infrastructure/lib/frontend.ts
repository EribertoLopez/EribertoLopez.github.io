import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import {
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
  Function,
  FunctionCode,
  FunctionEventType,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  BucketDeployment,
  CacheControl,
  Source,
  } from "aws-cdk-lib/aws-s3-deployment";

export interface FrontendStackProps extends cdk.StackProps {
  environment: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Call the createFrontend method
    this.createFrontend(props.environment);
  }

  private createFrontend(environment: string) {
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

    // CloudFront function to handle SPA routing
    const spaRoutingFunction = new Function(this, "SPARoutingFunction", {
      code: FunctionCode.fromInline(`
       function handler(event) {
          var request = event.request;
          var uri = request.uri || "/";
          var method = (request.method || "GET").toUpperCase();

          // Only affect GET/HEAD
          if (method !== "GET" && method !== "HEAD") {
            return request;
          }

          // Let real files through (have a dot)
          if (uri.indexOf('.') !== -1) {
            return request;
          }

          // Root: let defaultRootObject handle it (index.html)
          if (uri === '/') {
            return request;
          }

          // Next.js export with trailingSlash: false emits "route.html"
          // Rewrite "/fund-a-scholar" -> "/fund-a-scholar.html"
          request.uri = uri + '.html';
          return request;
        }
      `),
    });

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
    });

    // 2a) Immutable assets (long cache)
    new BucketDeployment(this, "DeployAssets", {
      sources: [Source.asset("../frontend/out")],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      cacheControl: [
        CacheControl.maxAge(cdk.Duration.days(365)),
        CacheControl.immutable(),
      ],
      prune: false,
      exclude: ["*.html", "**/*.html", "*.txt", "**/*.txt"], // exclude all HTML/TXT
    });

    // 2b) HTML (no-cache so refresh picks up new content)
    new BucketDeployment(this, "DeployHtml", {
      sources: [Source.asset("../frontend/out")],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      cacheControl: [CacheControl.noCache()],
      prune: true,
      include: ["*.html", "**/*.html", "*.txt", "**/*.txt"],
    });
  }
}

// Phase 2: Chat API Stack
// Lambda + HTTP API Gateway + IAM + Throttling
// See docs/AWS_MIGRATION_PLAN.md "Phase 2"

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface ChatApiStackProps extends cdk.StackProps {
  allowedOrigins: string[];
}

export class ChatApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ChatApiStackProps) {
    super(scope, id, props);

    // Lambda execution role — least-privilege Bedrock access
    const lambdaRole = new iam.Role(this, "ChatLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    // Bedrock permissions — scoped to specific models
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        ],
      })
    );

    // TODO: Create Lambda function from lambda/ directory
    //   - Runtime: Node.js 20
    //   - Memory: 512MB (Bedrock client needs it)
    //   - Timeout: 60s (streaming chat responses)
    //   - Environment: ALLOWED_ORIGINS, BEDROCK_CHAT_MODEL_ID, BEDROCK_EMBED_MODEL_ID

    // TODO: Create HTTP API Gateway with:
    //   - CORS restricted to allowedOrigins (not wildcard *)
    //   - Throttling: 100 burst, 50 sustained requests/second
    //   - Routes: POST /chat, GET /health

    // TODO: Output API URL
    this.apiUrl = ""; // Set from API Gateway
  }
}

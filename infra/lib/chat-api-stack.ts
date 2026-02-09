// TODO: Phase 2 - Chat API Stack
// Creates:
// - Lambda function (Node.js 20, bundled from lambda/)
// - HTTP API Gateway with CORS
// - Lambda IAM role with Bedrock invoke permissions
// - CloudWatch log group
// - Environment variables: SUPABASE_URL, model IDs
//
// See docs/AWS_MIGRATION_PLAN.md "Phase 2" for full details.

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ChatApiStackProps extends cdk.StackProps {
  allowedOrigins: string[];
}

export class ChatApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ChatApiStackProps) {
    super(scope, id, props);

    // TODO: Create Lambda function from lambda/ directory
    // TODO: Add Bedrock IAM permissions (bedrock:InvokeModel, bedrock:InvokeModelWithResponseStream)
    // TODO: Create HTTP API Gateway with CORS config
    // TODO: Add routes: POST /chat, GET /health
    // TODO: Configure Lambda environment variables
    // TODO: Output API URL

    this.apiUrl = ""; // TODO: Set from API Gateway
  }
}

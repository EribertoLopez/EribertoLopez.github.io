// TODO: Phase 2 - Chat API Lambda Handler
// This Lambda function handles POST /chat requests:
// 1. Parse user message from request body
// 2. Generate embedding via Bedrock Titan (Phase 3)
// 3. Search vector store for relevant context
// 4. Call Bedrock Claude with context + user message
// 5. Stream response back via API Gateway
//
// See docs/AWS_MIGRATION_PLAN.md "Phase 2" for details.

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // TODO: Parse request body { message: string, history?: Message[] }
  // TODO: Validate input (max length, rate limiting)
  // TODO: Generate embedding for the query
  // TODO: Search vector store for top-k relevant chunks
  // TODO: Build prompt with system message + context + history
  // TODO: Call Bedrock Claude (streaming)
  // TODO: Return streaming response

  if (event.routeKey === "GET /health") {
    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: "Not implemented" }),
  };
}

// Phase 2: Chat API Lambda Handler
// Handles POST /chat and GET /health
// See docs/AWS_MIGRATION_PLAN.md "Phase 2"

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

// --- Types ---
interface ChatRequest {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// --- Constants ---
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_LENGTH = 20;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);

// --- Helpers ---
function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function errorResponse(statusCode: number, code: string, message: string, origin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify({ error: message, code } satisfies ErrorResponse),
  };
}

function validateRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== "object") throw new Error("INVALID_BODY");
  const req = body as Record<string, unknown>;
  if (typeof req.message !== "string" || req.message.trim().length === 0) throw new Error("EMPTY_MESSAGE");
  if (req.message.length > MAX_MESSAGE_LENGTH) throw new Error("MESSAGE_TOO_LONG");
  if (req.history && (!Array.isArray(req.history) || req.history.length > MAX_HISTORY_LENGTH)) {
    throw new Error("INVALID_HISTORY");
  }
  return { message: req.message.trim(), history: (req.history as ChatRequest["history"]) ?? [] };
}

// --- Handler ---
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const origin = event.headers?.origin;

  try {
    // Health check
    if (event.routeKey === "GET /health") {
      return { statusCode: 200, headers: corsHeaders(origin), body: JSON.stringify({ status: "ok" }) };
    }

    // Chat endpoint
    if (event.routeKey === "POST /chat") {
      const parsed = JSON.parse(event.body ?? "{}");
      const request = validateRequest(parsed);

      // TODO: Generate embedding for request.message (Phase 3 - Bedrock Titan)
      // TODO: Search vector store for relevant context
      // TODO: Build prompt with system message + context + history
      // TODO: Call Bedrock Claude with streaming (Phase 3)
      // TODO: Return streaming response using awslambda.streamifyResponse

      return errorResponse(501, "NOT_IMPLEMENTED", "Chat not yet implemented", origin);
    }

    return errorResponse(404, "NOT_FOUND", "Route not found", origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Handler error:", err);

    if (["INVALID_BODY", "EMPTY_MESSAGE", "MESSAGE_TOO_LONG", "INVALID_HISTORY"].includes(message)) {
      return errorResponse(400, message, message, origin);
    }

    return errorResponse(500, "INTERNAL_ERROR", "Internal server error", origin);
  }
}

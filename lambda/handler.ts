// lambda/handler.ts — Chat API Lambda Handler (Full AWS)
//
// POST /chat  — RAG-powered chat via Bedrock + Aurora pgvector
// GET  /health — Health check (pings vector store)
//
// Environment: EMBEDDING_PROVIDER=bedrock, CHAT_PROVIDER=bedrock,
//              VECTOR_STORE_PROVIDER=aurora, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { generateChatResponse, generateChatResponseStream } from "../lib/ai";
import { isRateLimited, getRemainingRequests } from "../lib/rateLimit";
import { pipelineConfig } from "../lib/config";
import { ChatError } from "../lib/errors";

// --- Types ---
interface ChatRequest {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  stream?: boolean;
}

// --- Constants ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);

// --- Helpers ---
function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  origin?: string
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

function getClientIp(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.http?.sourceIp ?? "unknown";
}

function validateRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== "object") {
    throw new Error("INVALID_BODY");
  }
  const req = body as Record<string, unknown>;

  if (typeof req.message !== "string" || req.message.trim().length === 0) {
    throw new Error("EMPTY_MESSAGE");
  }
  if (req.message.length > pipelineConfig.chat.maxMessageLength) {
    throw new Error("MESSAGE_TOO_LONG");
  }
  if (req.history !== undefined) {
    if (!Array.isArray(req.history)) throw new Error("INVALID_HISTORY");
    if (req.history.length > pipelineConfig.chat.maxHistoryLength) {
      throw new Error("HISTORY_TOO_LONG");
    }
  }

  return {
    message: req.message.trim(),
    history: (req.history as ChatRequest["history"]) ?? [],
    stream: req.stream === true,
  };
}

// --- Handler ---
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const origin = event.headers?.origin;

  try {
    // CORS preflight
    if (event.requestContext?.http?.method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          ...corsHeaders(origin),
          "Access-Control-Max-Age": "86400",
        },
        body: "",
      };
    }

    // Health check
    if (event.routeKey === "GET /health") {
      return jsonResponse(200, { status: "ok", provider: "bedrock" }, origin);
    }

    // Chat endpoint
    if (event.routeKey === "POST /chat") {
      // Rate limiting
      const ip = getClientIp(event);
      if (isRateLimited(ip)) {
        return jsonResponse(
          429,
          {
            error: "Too many requests. Please try again later.",
            retryAfterMs: pipelineConfig.rateLimit.windowMs,
          },
          origin
        );
      }

      const parsed = JSON.parse(event.body ?? "{}");
      const request = validateRequest(parsed);

      // Streaming not supported in basic Lambda responses —
      // would need Lambda Function URL with response streaming or API GW WebSockets.
      // For now, return full response. TODO: Add streaming via Lambda response streaming.
      if (request.stream) {
        return jsonResponse(
          400,
          { error: "Streaming not yet supported via Lambda. Use stream=false." },
          origin
        );
      }

      // Non-streaming RAG response
      const response = await generateChatResponse(
        request.message,
        request.history ?? []
      );

      return jsonResponse(
        200,
        {
          response,
          remaining: getRemainingRequests(ip),
        },
        origin
      );
    }

    return jsonResponse(404, { error: "Route not found" }, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Lambda handler error:", err);

    // Validation errors → 400
    const validationErrors = [
      "INVALID_BODY",
      "EMPTY_MESSAGE",
      "MESSAGE_TOO_LONG",
      "INVALID_HISTORY",
      "HISTORY_TOO_LONG",
    ];
    if (validationErrors.includes(message)) {
      return jsonResponse(400, { error: message, code: message }, origin);
    }

    // RAG pipeline errors → 503
    if (err instanceof ChatError) {
      return jsonResponse(503, { error: err.message, code: "SERVICE_UNAVAILABLE" }, origin);
    }

    // Unknown → 500
    return jsonResponse(500, { error: "Internal server error", code: "INTERNAL_ERROR" }, origin);
  }
}

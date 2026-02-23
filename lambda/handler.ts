// lambda/handler.ts — Chat API Lambda Handler (Full AWS)
//
// POST /chat  — RAG-powered chat via Bedrock + Aurora pgvector
// GET  /health — Health check (pings vector store)
//
// Environment: EMBEDDING_PROVIDER=bedrock, CHAT_PROVIDER=bedrock,
//              VECTOR_STORE_PROVIDER=aurora, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

import * as crypto from "crypto";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { generateChatResponse, generateChatResponseStream } from "../frontend/lib/ai";
import { isRateLimited, getRemainingRequests } from "../frontend/lib/rateLimit";
import { pipelineConfig } from "../frontend/lib/config";
import { ChatError } from "../frontend/lib/errors";
import { createEmbeddingProvider } from "../frontend/lib/embeddings/index";
import { createVectorStore } from "../frontend/lib/vectorStore/index";
import type { ChunkRecord } from "../frontend/lib/types";

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

    // Ingest endpoint — called by CI/CD to embed documents
    if (event.routeKey === "POST /ingest") {
      const parsed = JSON.parse(event.body ?? "{}");
      const documents: Array<{ path: string; content: string }> = parsed.documents;

      if (!documents?.length) {
        return jsonResponse(400, { error: "No documents provided" }, origin);
      }

      console.log(`Ingesting ${documents.length} documents...`);

      // Parse frontmatter, chunk, embed
      const CHUNK_SIZE = 800;
      const CHUNK_OVERLAP = 200;

      const allChunks: Array<{ id: string; text: string; metadata: Record<string, string> }> = [];

      for (const doc of documents) {
        const { metadata, body } = parseFrontmatter(doc.content);
        const sourceType = doc.path.includes("_resumes") ? "resume"
          : doc.path.includes("_projects") ? "project"
          : doc.path.includes("_posts") ? "post" : "document";
        const title = metadata.title || metadata.name || doc.path.split("/").pop()?.replace(".md", "") || "untitled";
        const chunks = chunkText(body, CHUNK_SIZE, CHUNK_OVERLAP);

        for (let i = 0; i < chunks.length; i++) {
          const hash = crypto.createHash("sha256").update(`${doc.path}:${i}`).digest("hex").slice(0, 12);
          allChunks.push({
            id: `${doc.path.split("/").pop()?.replace(".md", "")}-${i}-${hash}`,
            text: `[${sourceType}: ${title}] ${chunks[i]}`,
            metadata: { ...metadata, source: doc.path, sourceType, chunkIndex: String(i) },
          });
        }
        console.log(`  ${doc.path} → ${chunks.length} chunks`);
      }

      console.log(`Total: ${allChunks.length} chunks. Embedding...`);

      const embedder = createEmbeddingProvider();
      const chunkRecords: ChunkRecord[] = [];

      // Embed in batches of 5
      for (let i = 0; i < allChunks.length; i += 5) {
        const batch = allChunks.slice(i, i + 5);
        const embeddings = await embedder.embedBatch(batch.map(c => c.text));
        for (let j = 0; j < batch.length; j++) {
          chunkRecords.push({ ...batch[j], embedding: embeddings[j] });
        }
        console.log(`  Embedded ${Math.min(i + 5, allChunks.length)}/${allChunks.length}`);
      }

      // Store
      const store = createVectorStore();
      await store.upsert(chunkRecords);

      console.log(`✅ Stored ${chunkRecords.length} chunks`);

      return jsonResponse(200, {
        message: `Ingested ${documents.length} documents → ${chunkRecords.length} chunks`,
        chunks: chunkRecords.length,
        sizeKB: Math.round(JSON.stringify(chunkRecords).length / 1024),
      }, origin);
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

// --- Ingest Helpers ---

function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };
  const metadata: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
      if (k && v) metadata[k] = v;
    }
  }
  return { metadata, body: match[2] };
}

function chunkText(text: string, size: number, overlap: number): string[] {
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + size, cleaned.length);
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const p = slice.lastIndexOf("\n\n");
      const s = slice.lastIndexOf(". ");
      const n = slice.lastIndexOf("\n");
      if (p > size * 0.5) end = start + p;
      else if (s > size * 0.5) end = start + s + 2;
      else if (n > size * 0.5) end = start + n;
    }
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start = end - overlap;
    if (start >= cleaned.length) break;
  }
  return chunks;
}

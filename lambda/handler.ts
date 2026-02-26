// lambda/handler.ts — Fully self-contained Chat API Lambda Handler
// NO imports from frontend/lib/ — all logic inline to avoid any transitive deps

import * as crypto from "crypto";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// --- Types ---
interface APIGatewayEvent {
  routeKey?: string;
  headers?: Record<string, string>;
  body?: string;
  requestContext?: { http?: { method?: string; sourceIp?: string } };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StoredData {
  chunks: Array<{ id: string; text: string; metadata: Record<string, string>; embedding: number[] }>;
  createdAt: string;
  count: number;
}

// --- Config ---
const REGION = process.env.AWS_REGION || "us-east-1";
const EMBED_MODEL = process.env.BEDROCK_EMBED_MODEL_ID || "amazon.titan-embed-text-v2:0";
const CHAT_MODEL = process.env.BEDROCK_CHAT_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";
const S3_BUCKET = process.env.EMBEDDINGS_S3_BUCKET || "";
const S3_KEY = process.env.EMBEDDINGS_S3_KEY || "chat/embeddings.json";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
const TOP_K = parseInt(process.env.TOP_K || "5");
const MAX_TOKENS = parseInt(process.env.CHAT_MAX_TOKENS || "1024");
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000");
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10");

// --- Clients (lazy) ---
let bedrockClient: BedrockRuntimeClient | null = null;
let s3Client: S3Client | null = null;
let embeddingsCache: StoredData | null = null;

function bedrock(): BedrockRuntimeClient {
  if (!bedrockClient) bedrockClient = new BedrockRuntimeClient({ region: REGION });
  return bedrockClient;
}
function s3(): S3Client {
  if (!s3Client) s3Client = new S3Client({ region: REGION });
  return s3Client;
}

// --- Rate limiting (in-memory, per-instance) ---
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = rateLimitMap.get(ip) || [];
  const recent = window.filter((t) => now - t < RATE_LIMIT_WINDOW);
  rateLimitMap.set(ip, recent);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  return false;
}

// --- Helpers ---
function corsHeaders(origin?: string): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function respond(status: number, body: Record<string, unknown>, origin?: string) {
  return { statusCode: status, headers: corsHeaders(origin), body: JSON.stringify(body) };
}

async function embed(text: string): Promise<number[]> {
  const cmd = new InvokeModelCommand({
    modelId: EMBED_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({ inputText: text, dimensions: 1024, normalize: true }),
  });
  const resp = await bedrock().send(cmd);
  const parsed = JSON.parse(new TextDecoder().decode(resp.body));
  return parsed.embedding;
}

/** Ensure messages alternate user/assistant — Claude requires strict alternation. */
function sanitizeHistory(history: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const msg of history) {
    if (out.length > 0 && out[out.length - 1].role === msg.role) {
      // Merge consecutive same-role messages
      out[out.length - 1] = { ...out[out.length - 1], content: out[out.length - 1].content + "\n" + msg.content };
    } else {
      out.push({ ...msg });
    }
  }
  // Must start with "user" if non-empty
  if (out.length > 0 && out[0].role !== "user") out.shift();
  // Must end with "assistant" (since we'll append a new "user" message)
  while (out.length > 0 && out[out.length - 1].role === "user") out.pop();
  return out;
}

async function chat(system: string, history: ChatMessage[], userMsg: string): Promise<string> {
  const cleanHistory = sanitizeHistory(history);
  const cmd = new InvokeModelCommand({
    modelId: CHAT_MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: MAX_TOKENS,
      system,
      messages: [...cleanHistory, { role: "user", content: userMsg }],
    }),
  });
  const resp = await bedrock().send(cmd);
  const parsed = JSON.parse(new TextDecoder().decode(resp.body));
  return parsed.content?.find((b: any) => b.type === "text")?.text || "Sorry, I couldn't generate a response.";
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function loadEmbeddings(): Promise<StoredData> {
  if (embeddingsCache) return embeddingsCache;
  try {
    const resp = await s3().send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY }));
    const body = await resp.Body?.transformToString();
    if (!body) throw new Error("Empty");
    embeddingsCache = JSON.parse(body);
    console.log(`Loaded ${embeddingsCache!.count} embeddings from S3`);
    return embeddingsCache!;
  } catch (e: any) {
    if (e.name === "NoSuchKey" || e.Code === "NoSuchKey") {
      embeddingsCache = { chunks: [], createdAt: new Date().toISOString(), count: 0 };
      return embeddingsCache;
    }
    throw e;
  }
}

async function searchSimilar(queryEmb: number[], topK: number) {
  const data = await loadEmbeddings();
  const scored = data.chunks.map((c) => ({ ...c, score: cosineSim(queryEmb, c.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function buildSystemPrompt(chunks: string[]): string {
  return `You are an AI assistant on Eriberto Lopez's personal portfolio website.
Answer questions about his professional background, skills, experience, and accomplishments.

RULES:
1. ONLY use information from the RETRIEVED DOCUMENTS below
2. If you don't know, say "I don't have that information in my documents"
3. Be warm, professional, concise (2-4 sentences unless more detail requested)
4. NEVER make up information not in the documents

<RETRIEVED_DOCUMENTS>
${chunks.join("\n\n---\n\n")}
</RETRIEVED_DOCUMENTS>

Answer based ONLY on the retrieved documents above.`;
}

function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { metadata: {}, body: content };
  const metadata: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
      if (k && v) metadata[k] = v;
    }
  }
  return { metadata, body: m[2] };
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
    if (end >= cleaned.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

// --- Handler ---
export async function handler(event: APIGatewayEvent) {
  const origin = event.headers?.origin;

  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return { statusCode: 204, headers: { ...corsHeaders(origin), "Access-Control-Max-Age": "86400" }, body: "" };
    }

    // Health
    if (event.routeKey === "GET /health") {
      return respond(200, { status: "ok", provider: "bedrock" }, origin);
    }

    // Chat
    if (event.routeKey === "POST /chat") {
      const ip = event.requestContext?.http?.sourceIp || "unknown";
      if (isRateLimited(ip)) {
        return respond(429, { error: "Too many requests." }, origin);
      }

      const parsed = JSON.parse(event.body || "{}");
      const msg = parsed.message?.trim();
      if (!msg) return respond(400, { error: "EMPTY_MESSAGE" }, origin);
      if (msg.length > 2000) return respond(400, { error: "MESSAGE_TOO_LONG" }, origin);

      const sanitized = msg.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      const queryEmb = await embed(sanitized);
      const results = await searchSimilar(queryEmb, TOP_K);
      const systemPrompt = buildSystemPrompt(results.map((r) => r.text));
      const response = await chat(systemPrompt, parsed.history || [], sanitized);

      return respond(200, { response }, origin);
    }

    // Ingest
    if (event.routeKey === "POST /ingest") {
      const parsed = JSON.parse(event.body || "{}");
      const docs: Array<{ path: string; content: string }> = parsed.documents;
      if (!docs?.length) return respond(400, { error: "No documents" }, origin);

      console.log(`Ingesting ${docs.length} documents...`);

      const allChunks: Array<{ id: string; text: string; metadata: Record<string, string> }> = [];
      for (const doc of docs) {
        const { metadata, body } = parseFrontmatter(doc.content);
        const sourceType = doc.path.includes("_resumes") ? "resume"
          : doc.path.includes("_projects") ? "project"
          : doc.path.includes("_posts") ? "post" : "document";
        const title = metadata.title || doc.path.split("/").pop()?.replace(".md", "") || "untitled";
        const chunks = chunkText(body, 800, 200);
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

      // Embed one at a time to minimize memory
      const records: StoredData["chunks"] = [];
      for (let i = 0; i < allChunks.length; i++) {
        const emb = await embed(allChunks[i].text);
        records.push({ ...allChunks[i], embedding: emb });
        if ((i + 1) % 5 === 0 || i === allChunks.length - 1) {
          console.log(`  Embedded ${i + 1}/${allChunks.length}`);
        }
      }

      // Store to S3
      const stored: StoredData = { chunks: records, createdAt: new Date().toISOString(), count: records.length };
      await s3().send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: S3_KEY,
        Body: JSON.stringify(stored),
        ContentType: "application/json",
      }));
      embeddingsCache = stored;
      console.log(`✅ Stored ${records.length} chunks to S3`);

      return respond(200, {
        message: `Ingested ${docs.length} documents → ${records.length} chunks`,
        chunks: records.length,
        sizeKB: Math.round(JSON.stringify(stored).length / 1024),
      }, origin);
    }

    return respond(404, { error: "Route not found" }, origin);
  } catch (err: any) {
    console.error("Handler error:", err);
    return respond(500, { error: "Internal server error" }, origin);
  }
}

#!/usr/bin/env node
/**
 * scripts/ingest.ts — Standalone Document Ingestion
 *
 * Reads markdown from frontend/content/, chunks, embeds via Bedrock Titan,
 * uploads to S3 as JSON. Zero imports from frontend/lib/ to stay lean.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// ─── Config ───────────────────────────────────────────────
const CONTENT_DIR = process.env.CONTENT_DIR || path.resolve(__dirname, "..", "frontend", "content");
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 200;

// ─── Allowlist (curated content only) ─────────────────────
// Only these files get ingested. All paths relative to CONTENT_DIR.
// Decision: Option A allowlist approach, approved 2026-02-27.
const INGEST_ALLOWLIST: string[] = [
  "_resumes/eriberto-lopez-resume-01-25-26.md",   // Latest resume (Jan 2026)
  "_projects/acrylic-pour-painting.md",            // Real project with content
  "_posts/MBS_1.md",                               // Mind, Body, and Soul — personal blog post
  "CAREER_CATALOG.md",                              // Comprehensive career catalog
];
const EMBED_MODEL = process.env.BEDROCK_EMBED_MODEL_ID || "amazon.titan-embed-text-v2:0";
const S3_BUCKET = process.env.EMBEDDINGS_S3_BUCKET || "";
const S3_KEY = process.env.EMBEDDINGS_S3_KEY || "chat/embeddings.json";
const REGION = process.env.AWS_REGION || "us-east-1";

// ─── Clients ──────────────────────────────────────────────
const bedrock = new BedrockRuntimeClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

// ─── Helpers ──────────────────────────────────────────────

function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMarkdownFiles(full));
    else if (entry.name.endsWith(".md")) results.push(full);
  }
  return results;
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
  const chunks: string[] = [];
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
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

function chunkId(source: string, index: number): string {
  return `${path.basename(source, ".md")}-${index}-${crypto.createHash("sha256").update(`${source}:${index}`).digest("hex").slice(0, 12)}`;
}

async function embed(text: string): Promise<number[]> {
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: EMBED_MODEL,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: text }),
    })
  );
  const body = JSON.parse(new TextDecoder().decode(res.body));
  return body.embedding;
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  if (!S3_BUCKET) {
    console.error("❌ EMBEDDINGS_S3_BUCKET not set");
    process.exit(1);
  }

  console.log("🔄 Starting document ingestion pipeline...\n");

  const allFiles = findMarkdownFiles(CONTENT_DIR);
  if (!allFiles.length) {
    console.error(`❌ No markdown files in ${CONTENT_DIR}`);
    process.exit(1);
  }

  // Filter to allowlist
  const files = allFiles.filter((f) => {
    const rel = path.relative(CONTENT_DIR, f).replace(/\\/g, "/");
    return INGEST_ALLOWLIST.includes(rel);
  });

  console.log(`📁 Found ${allFiles.length} total markdown files, ${files.length} on allowlist`);
  if (!files.length) {
    console.error(`❌ No allowlisted files found. Check INGEST_ALLOWLIST in ingest.ts`);
    process.exit(1);
  }

  // Parse and chunk
  const allChunks: Array<{ id: string; text: string; metadata: Record<string, string> }> = [];

  for (const file of files) {
    const rel = path.relative(path.resolve(__dirname, ".."), file);
    const { metadata, body } = parseFrontmatter(fs.readFileSync(file, "utf-8"));
    const sourceType = rel.includes("_resumes") ? "resume"
      : rel.includes("_projects") ? "project"
      : rel.includes("_posts") ? "post" : "document";
    const title = metadata.title || metadata.name || path.basename(file, ".md");
    const chunks = chunkText(body, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        id: chunkId(rel, i),
        text: `[${sourceType}: ${title}] ${chunks[i]}`,
        metadata: { ...metadata, source: rel, sourceType, chunkIndex: String(i) },
      });
    }
    console.log(`  📄 ${path.basename(file)} → ${chunks.length} chunks (${sourceType})`);
  }

  console.log(`\n📊 Total: ${allChunks.length} chunks\n`);
  console.log(`🧠 Embedding with Bedrock Titan (${EMBED_MODEL})...`);

  // Embed one at a time to stay lean on memory
  const storedChunks: Array<{
    id: string; text: string; metadata: Record<string, string>; embedding: number[];
  }> = [];

  for (let i = 0; i < allChunks.length; i++) {
    const embedding = await embed(allChunks[i].text);
    storedChunks.push({ ...allChunks[i], embedding });
    if ((i + 1) % 5 === 0 || i === allChunks.length - 1) {
      console.log(`  ✅ Embedded ${i + 1}/${allChunks.length}`);
    }
  }

  // Upload to S3
  console.log(`\n💾 Uploading to s3://${S3_BUCKET}/${S3_KEY}...`);
  const payload = JSON.stringify({
    chunks: storedChunks,
    createdAt: new Date().toISOString(),
    count: storedChunks.length,
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Body: payload,
      ContentType: "application/json",
    })
  );

  console.log(`\n✅ Done! ${storedChunks.length} chunks (${(payload.length / 1024).toFixed(0)} KB) uploaded.`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});

#!/usr/bin/env npx tsx
/**
 * scripts/ingest.ts — Document Ingestion Pipeline
 *
 * Reads markdown content from frontend/content/, chunks it,
 * generates embeddings via the configured provider (Bedrock/Ollama/OpenAI),
 * and stores them in the configured vector store (S3/Aurora/Supabase).
 *
 * Usage:
 *   npx tsx scripts/ingest.ts
 *
 * Environment:
 *   EMBEDDING_PROVIDER  - bedrock | ollama | openai
 *   VECTOR_STORE_PROVIDER - s3 | aurora | supabase
 *   EMBEDDINGS_S3_BUCKET  - S3 bucket for embeddings (when provider=s3)
 *   EMBEDDINGS_S3_KEY     - S3 key (default: chat/embeddings.json)
 *   FORCE_REINGEST        - "true" to replace existing embeddings
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createEmbeddingProvider } from "../frontend/lib/embeddings/index";
import { createVectorStore } from "../frontend/lib/vectorStore/index";
import type { ChunkRecord } from "../frontend/lib/types";

// ─── Config ───────────────────────────────────────────────
const CONTENT_DIR = path.join(__dirname, "..", "frontend", "content");
const CHUNK_SIZE = 800; // chars per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks
const BATCH_SIZE = 10; // embeddings per batch call

// ─── Helpers ──────────────────────────────────────────────

/** Recursively find all .md files in a directory */
function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMarkdownFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Parse frontmatter from a markdown file */
function parseFrontmatter(content: string): {
  metadata: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };

  const metadata: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && value) metadata[key] = value;
    }
  }
  return { metadata, body: match[2] };
}

/** Split text into overlapping chunks */
function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();

  while (start < cleaned.length) {
    let end = Math.min(start + size, cleaned.length);

    // Try to break at a paragraph or sentence boundary
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const lastPara = slice.lastIndexOf("\n\n");
      const lastSentence = slice.lastIndexOf(". ");
      const lastNewline = slice.lastIndexOf("\n");

      if (lastPara > size * 0.5) {
        end = start + lastPara;
      } else if (lastSentence > size * 0.5) {
        end = start + lastSentence + 2;
      } else if (lastNewline > size * 0.5) {
        end = start + lastNewline;
      }
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 50) {
      // Skip tiny chunks
      chunks.push(chunk);
    }
    start = end - overlap;
    if (start >= cleaned.length) break;
  }

  return chunks;
}

/** Generate a deterministic ID for a chunk */
function chunkId(source: string, index: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${source}:${index}`)
    .digest("hex")
    .slice(0, 12);
  return `${path.basename(source, ".md")}-${index}-${hash}`;
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log("🔄 Starting document ingestion pipeline...\n");

  // 1. Discover markdown files
  const files = findMarkdownFiles(CONTENT_DIR);
  if (files.length === 0) {
    console.error(`❌ No markdown files found in ${CONTENT_DIR}`);
    process.exit(1);
  }
  console.log(`📁 Found ${files.length} markdown files`);

  // 2. Parse and chunk
  const allChunks: Array<{
    id: string;
    text: string;
    metadata: Record<string, string>;
  }> = [];

  for (const file of files) {
    const relPath = path.relative(
      path.join(__dirname, ".."),
      file
    );
    const content = fs.readFileSync(file, "utf-8");
    const { metadata, body } = parseFrontmatter(content);

    // Determine source type from path
    const sourceType = relPath.includes("_resumes")
      ? "resume"
      : relPath.includes("_projects")
        ? "project"
        : relPath.includes("_posts")
          ? "post"
          : "document";

    const chunks = chunkText(body, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let i = 0; i < chunks.length; i++) {
      // Prepend title/context to each chunk for better retrieval
      const title = metadata.title || metadata.name || path.basename(file, ".md");
      const contextPrefix = `[${sourceType}: ${title}] `;

      allChunks.push({
        id: chunkId(relPath, i),
        text: contextPrefix + chunks[i],
        metadata: {
          ...metadata,
          source: relPath,
          sourceType,
          chunkIndex: String(i),
          totalChunks: String(chunks.length),
        },
      });
    }

    console.log(
      `  📄 ${path.basename(file)} → ${chunks.length} chunks (${sourceType})`
    );
  }

  console.log(`\n📊 Total: ${allChunks.length} chunks from ${files.length} files\n`);

  // 3. Generate embeddings
  const embedder = createEmbeddingProvider();
  console.log(`🧠 Embedding with ${embedder.name} (${embedder.dimension}d)...`);

  const chunkRecords: ChunkRecord[] = [];
  const texts = allChunks.map((c) => c.text);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedder.embedBatch(batch);

    for (let j = 0; j < batch.length; j++) {
      chunkRecords.push({
        id: allChunks[i + j].id,
        text: allChunks[i + j].text,
        metadata: allChunks[i + j].metadata,
        embedding: embeddings[j],
      });
    }

    const done = Math.min(i + BATCH_SIZE, texts.length);
    console.log(`  ✅ Embedded ${done}/${texts.length} chunks`);
  }

  // 4. Store in vector store
  const store = createVectorStore();
  console.log(`\n💾 Storing in vector store (${process.env.VECTOR_STORE_PROVIDER || "default"})...`);

  await store.upsert(chunkRecords, (current, total) => {
    console.log(`  📤 Uploaded ${current}/${total}`);
  });

  console.log(`\n✅ Ingestion complete! ${chunkRecords.length} chunks embedded and stored.`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});

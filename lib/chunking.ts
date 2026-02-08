// lib/chunking.ts
import { createHash } from "crypto";
import { pipelineConfig } from "./config";
import type { LoadedDocument, Chunk } from "./types";

// Re-export Chunk for backwards compatibility
export type { Chunk } from "./types";

export interface ChunkingOptions {
  chunkSize: number;
  overlap: number;
}

/**
 * Generates a content-based chunk ID using MD5 hash.
 * Stable across re-runs with same content, changes when content changes.
 */
function generateChunkId(source: string, text: string): string {
  return createHash("md5").update(`${source}:${text}`).digest("hex").slice(0, 16);
}

/**
 * Splits text into overlapping chunks with sentence-boundary awareness.
 */
export function chunkText(
  text: string,
  source: string,
  options?: Partial<ChunkingOptions>
): Chunk[] {
  const chunkSize = options?.chunkSize ?? pipelineConfig.chunking.chunkSize;
  const overlap = options?.overlap ?? pipelineConfig.chunking.overlap;
  const chunks: Chunk[] = [];

  const cleanText = text.replace(/\s+/g, " ").trim();

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    let end = Math.min(start + chunkSize, cleanText.length);

    // Try to break at a sentence boundary
    if (end < cleanText.length) {
      const breakPoint = cleanText.lastIndexOf(". ", end);
      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1;
      }
    }

    const chunkContent = cleanText.slice(start, end).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        id: generateChunkId(source, chunkContent),
        text: chunkContent,
        source,
        metadata: {
          source,
          chunkIndex: String(chunkIndex),
        },
      });
      chunkIndex++;
    }

    // Move start, accounting for overlap
    const nextStart = end - overlap;

    // Prevent infinite loop: ensure forward progress
    if (nextStart <= start) {
      start = end;
    } else {
      start = nextStart;
    }
  }

  return chunks;
}

/**
 * Chunks multiple documents at once.
 */
export function chunkDocuments(
  documents: LoadedDocument[],
  options?: Partial<ChunkingOptions>
): Chunk[] {
  const allChunks: Chunk[] = [];

  for (const doc of documents) {
    const chunks = chunkText(doc.content, doc.filename, options);
    allChunks.push(...chunks);
  }

  return allChunks;
}

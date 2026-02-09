// lib/vectorStore.ts — Backwards-compatible re-exports
// New code should import from lib/vectorStore/index.ts
import { createVectorStore } from "./vectorStore/index";
import type { VectorRepository } from "./vectorStore/types";
import type { ChunkRecord, SearchResult } from "./types";

export { createVectorStore } from "./vectorStore/index";
export type { VectorRepository } from "./vectorStore/types";

// Lazy singleton — defers envRequired() calls until first use,
// so dotenv.config() in scripts has time to load .env.local.
let _store: VectorRepository | null = null;

function getStore(): VectorRepository {
  if (!_store) _store = createVectorStore();
  return _store;
}

export async function upsertChunk(
  id: string,
  embedding: number[],
  text: string,
  metadata: Record<string, string>
): Promise<void> {
  await getStore().upsert([{ id, embedding, text, metadata }]);
}

export async function upsertChunks(
  chunks: ChunkRecord[]
): Promise<void> {
  await getStore().upsert(chunks, (current, total) => {
    console.log(`  Upserted batch ${current}/${total}`);
  });
}

export async function searchSimilar(
  queryEmbedding: number[],
  topK = 5
): Promise<SearchResult[]> {
  return getStore().search(queryEmbedding, topK);
}

export async function deleteAll(): Promise<void> {
  await getStore().deleteAll();
}

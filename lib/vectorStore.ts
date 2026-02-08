// lib/vectorStore.ts — Backwards-compatible re-exports
// New code should import from lib/vectorStore/index.ts
import { createVectorStore } from "./vectorStore/index";
import type { ChunkRecord, SearchResult } from "./types";

export { createVectorStore } from "./vectorStore/index";
export type { VectorRepository } from "./vectorStore/types";

const store = createVectorStore();

export async function upsertChunk(
  id: string,
  embedding: number[],
  text: string,
  metadata: Record<string, string>
): Promise<void> {
  await store.upsert([{ id, embedding, text, metadata }]);
}

export async function upsertChunks(
  chunks: ChunkRecord[]
): Promise<void> {
  await store.upsert(chunks, (current, total) => {
    console.log(`  Upserted batch ${current}/${total}`);
  });
}

export async function searchSimilar(
  queryEmbedding: number[],
  topK = 5
): Promise<SearchResult[]> {
  return store.search(queryEmbedding, topK);
}

export async function deleteAll(): Promise<void> {
  await store.deleteAll();
}

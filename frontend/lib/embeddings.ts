// lib/embeddings.ts — Backwards-compatible re-exports
// New code should import from lib/embeddings/index.ts directly
import { createEmbeddingProvider } from "./embeddings/index";
import { cosineSimilarity } from "./utils";

export { cosineSimilarity } from "./utils";
export { createEmbeddingProvider } from "./embeddings/index";
export type { EmbeddingProvider } from "./embeddings/types";

// Backwards-compatible functions using the provider
const provider = createEmbeddingProvider();

export async function embedText(text: string): Promise<number[]> {
  return provider.embed(text);
}

export function getEmbeddingDimension(): number {
  return provider.dimension;
}

export async function embedBatch(
  texts: string[],
  onProgress?: (current: number, total: number) => void
): Promise<number[][]> {
  return provider.embedBatch(texts, onProgress);
}

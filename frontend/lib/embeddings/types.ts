// lib/embeddings/types.ts — EmbeddingProvider interface

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimension: number;
  embed(text: string): Promise<number[]>;
  embedBatch(
    texts: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<number[][]>;
}

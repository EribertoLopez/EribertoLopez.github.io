import type { ChunkRecord, SearchResult } from "../types";

export interface VectorRepository {
  upsert(
    chunks: ChunkRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void>;
  search(queryEmbedding: number[], topK: number): Promise<SearchResult[]>;
  deleteAll(): Promise<void>;
  ping(): Promise<boolean>;
}

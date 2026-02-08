import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { VectorStoreError } from "../errors";
import { pipelineConfig } from "../config";
import type { ChunkRecord, SearchResult } from "../types";
import type { VectorRepository } from "./types";

export class SupabaseVectorStore implements VectorRepository {
  private _client: SupabaseClient | null = null;

  constructor(
    private url: string,
    private key: string,
    private batchSize = pipelineConfig.vectorStore.batchSize,
    private matchThreshold = pipelineConfig.vectorStore.matchThreshold
  ) {}

  /** Lazy client initialization — won't crash at import time if env is missing */
  private get client(): SupabaseClient {
    if (!this._client) {
      this._client = createClient(this.url, this.key);
    }
    return this._client;
  }

  async upsert(
    chunks: ChunkRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const totalBatches = Math.ceil(chunks.length / this.batchSize);

    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      const { error } = await this.client.from("documents").upsert(
        batch.map((c) => ({
          id: c.id,
          content: c.text,
          metadata: c.metadata,
          embedding: c.embedding,
        }))
      );
      if (error) {
        throw new VectorStoreError(`Upsert failed at batch ${Math.floor(i / this.batchSize) + 1}: ${error.message}`);
      }
      onProgress?.(Math.floor(i / this.batchSize) + 1, totalBatches);
    }
  }

  async search(
    queryEmbedding: number[],
    topK: number = pipelineConfig.vectorStore.topK
  ): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: topK,
      match_threshold: this.matchThreshold,
    });

    if (error) {
      throw new VectorStoreError(`Search failed: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      score: row.similarity,
      text: row.content,
      metadata: row.metadata,
    }));
  }

  async deleteAll(): Promise<void> {
    console.warn("⚠️  deleteAll() called — this removes ALL documents from the store");
    const { error } = await this.client.from("documents").delete().neq("id", "");
    if (error) {
      throw new VectorStoreError(`Delete failed: ${error.message}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const { error } = await this.client.from("documents").select("id").limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

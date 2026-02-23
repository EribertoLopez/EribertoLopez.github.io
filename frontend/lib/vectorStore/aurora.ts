// lib/vectorStore/aurora.ts — Aurora PostgreSQL + pgvector adapter
//
// Uses the same RDS Proxy connection pattern as the existing backend.
// Requires pgvector extension enabled on the database.

import { Pool, PoolConfig } from "pg";
import { VectorStoreError } from "../errors";
import { pipelineConfig } from "../config";
import type { ChunkRecord, SearchResult } from "../types";
import type { VectorRepository } from "./types";

export class AuroraVectorStore implements VectorRepository {
  private _pool: Pool | null = null;

  constructor(private poolConfig?: PoolConfig) {}

  /** Lazy pool initialization using env vars or explicit config */
  private get pool(): Pool {
    if (!this._pool) {
      this._pool = new Pool(
        this.poolConfig ?? {
          host: process.env.DB_HOST ?? "localhost",
          port: parseInt(process.env.DB_PORT ?? "5432", 10),
          database: process.env.DB_NAME ?? "eribertolopez",
          user: process.env.DB_USER ?? "postgres",
          password: process.env.DB_PASSWORD ?? "postgres",
          ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
          max: 5,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
        }
      );
    }
    return this._pool;
  }

  /**
   * Ensures the documents table and pgvector extension exist.
   * Safe to call multiple times (idempotent).
   */
  async ensureSchema(dimension: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector");
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          embedding vector(${dimension})
        )
      `);
      // Index for approximate nearest neighbor search
      await client.query(`
        CREATE INDEX IF NOT EXISTS documents_embedding_idx
        ON documents
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
    } finally {
      client.release();
    }
  }

  async upsert(
    chunks: ChunkRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const batchSize = pipelineConfig.vectorStore.batchSize;
    const totalBatches = Math.ceil(chunks.length / batchSize);

    const client = await this.pool.connect();
    try {
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        // Build a single multi-row upsert
        const values: any[] = [];
        const placeholders: string[] = [];

        batch.forEach((chunk, idx) => {
          const offset = idx * 4;
          placeholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::vector)`
          );
          values.push(
            chunk.id,
            chunk.text,
            JSON.stringify(chunk.metadata),
            `[${chunk.embedding.join(",")}]`
          );
        });

        await client.query(
          `INSERT INTO documents (id, content, metadata, embedding)
           VALUES ${placeholders.join(", ")}
           ON CONFLICT (id) DO UPDATE SET
             content = EXCLUDED.content,
             metadata = EXCLUDED.metadata,
             embedding = EXCLUDED.embedding`,
          values
        );

        onProgress?.(Math.floor(i / batchSize) + 1, totalBatches);
      }
    } catch (error) {
      throw new VectorStoreError(`Aurora upsert failed: ${error}`, error);
    } finally {
      client.release();
    }
  }

  async search(
    queryEmbedding: number[],
    topK: number = pipelineConfig.vectorStore.topK
  ): Promise<SearchResult[]> {
    try {
      const embeddingStr = `[${queryEmbedding.join(",")}]`;
      const { rows } = await this.pool.query(
        `SELECT id, content, metadata,
                1 - (embedding <=> $1::vector) AS similarity
         FROM documents
         WHERE 1 - (embedding <=> $1::vector) >= $2
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        [embeddingStr, pipelineConfig.vectorStore.matchThreshold, topK]
      );

      return rows.map((row: any) => ({
        id: row.id,
        score: row.similarity,
        text: row.content,
        metadata: row.metadata,
      }));
    } catch (error) {
      throw new VectorStoreError(`Aurora search failed: ${error}`, error);
    }
  }

  async deleteAll(): Promise<void> {
    console.warn("⚠️  deleteAll() called — removing ALL documents from Aurora");
    try {
      await this.pool.query("TRUNCATE TABLE documents");
    } catch (error) {
      throw new VectorStoreError(`Aurora delete failed: ${error}`, error);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const { rows } = await this.pool.query("SELECT 1 AS ok");
      return rows[0]?.ok === 1;
    } catch {
      return false;
    }
  }

  /** Gracefully close the connection pool */
  async close(): Promise<void> {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }
}

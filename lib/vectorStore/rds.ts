// Phase 6 - RDS PostgreSQL + pgvector Vector Store
// Replaces Supabase pgvector with self-managed RDS PostgreSQL.
//
// This module provides:
// - Connection pooling via pg Pool
// - Vector similarity search (cosine distance)
// - Document upsert with embeddings
// - Schema initialization (CREATE EXTENSION, tables)
//
// LocalStack: Set USE_LOCALSTACK=true to connect to local PostgreSQL
// instead of RDS. See lib/aws-config.ts for connection details.
//
// See docs/AWS_MIGRATION_PLAN.md "Phase 6" for details.

// import { Pool } from "pg";
import { getDbConfig, isLocalStack } from "../aws-config";

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export class RdsVectorStore {
  // Connection config comes from lib/aws-config.ts:
  // - LocalStack mode: uses env vars (DB_HOST, DB_USER, etc.)
  // - Production: uses Secrets Manager credentials via RDS Proxy + IAM auth
  private readonly config = getDbConfig();

  // TODO: Initialize connection pool from Secrets Manager credentials
  // TODO: Use IAM database authentication as alternative

  async initialize(): Promise<void> {
    // TODO: CREATE EXTENSION IF NOT EXISTS vector;
    // TODO: Create documents table with vector column
    // TODO: Create HNSW or IVFFlat index for fast search
    throw new Error("Not implemented");
  }

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    // TODO: Batch INSERT ... ON CONFLICT UPDATE
    // TODO: Use parameterized queries to prevent SQL injection
    // TODO: Add transaction wrapping for atomicity
    throw new Error("Not implemented");
  }

  async search(embedding: number[], topK: number = 5): Promise<SearchResult[]> {
    // TODO: SELECT with cosine distance operator (<=>)
    // TODO: Filter by similarity threshold
    // TODO: Return content + metadata + similarity score
    throw new Error("Not implemented");
  }

  async close(): Promise<void> {
    // TODO: Drain connection pool
  }
}

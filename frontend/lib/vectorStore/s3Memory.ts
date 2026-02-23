// lib/vectorStore/s3Memory.ts — In-memory vector store backed by S3
//
// Stores pre-computed embeddings as a JSON file in S3.
// On Lambda cold start, loads the file into memory.
// Search is cosine similarity computed in-process — fast for small datasets.

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { VectorStoreError } from "../errors";
import { cosineSimilarity } from "../utils";
import type { ChunkRecord, SearchResult } from "../types";
import type { VectorRepository } from "./types";

interface StoredData {
  chunks: Array<{
    id: string;
    text: string;
    metadata: Record<string, string>;
    embedding: number[];
  }>;
  createdAt: string;
  count: number;
}

const DEFAULT_BUCKET = process.env.EMBEDDINGS_S3_BUCKET || "";
const DEFAULT_KEY = process.env.EMBEDDINGS_S3_KEY || "chat/embeddings.json";

export class S3MemoryVectorStore implements VectorRepository {
  private data: StoredData | null = null;
  private s3: S3Client;
  private bucket: string;
  private key: string;

  constructor(bucket?: string, key?: string, region?: string) {
    this.bucket = bucket || DEFAULT_BUCKET;
    this.key = key || DEFAULT_KEY;
    this.s3 = new S3Client({
      region: region ?? process.env.AWS_REGION ?? "us-east-1",
    });
  }

  /** Load embeddings from S3 into memory (called once on cold start) */
  private async ensureLoaded(): Promise<StoredData> {
    if (this.data) return this.data;

    try {
      const response = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key })
      );
      const body = await response.Body?.transformToString();
      if (!body) throw new Error("Empty response from S3");

      this.data = JSON.parse(body) as StoredData;
      console.log(
        `Loaded ${this.data.count} embeddings from s3://${this.bucket}/${this.key}`
      );
      return this.data;
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
        // No embeddings file yet — return empty
        this.data = { chunks: [], createdAt: new Date().toISOString(), count: 0 };
        return this.data;
      }
      throw new VectorStoreError(`Failed to load embeddings from S3: ${error.message}`, error);
    }
  }

  async upsert(
    chunks: ChunkRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    // Build the full dataset (replace all)
    const stored: StoredData = {
      chunks: chunks.map((c) => ({
        id: c.id,
        text: c.text,
        metadata: c.metadata,
        embedding: c.embedding,
      })),
      createdAt: new Date().toISOString(),
      count: chunks.length,
    };

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.key,
          Body: JSON.stringify(stored),
          ContentType: "application/json",
        })
      );
      this.data = stored;
      onProgress?.(1, 1);
      console.log(
        `Stored ${chunks.length} embeddings to s3://${this.bucket}/${this.key}`
      );
    } catch (error: any) {
      throw new VectorStoreError(`Failed to write embeddings to S3: ${error.message}`, error);
    }
  }

  async search(
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    const data = await this.ensureLoaded();

    // Compute cosine similarity against all chunks in memory
    const scored = data.chunks.map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      metadata: chunk.metadata,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by similarity descending, take top K
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map((s) => ({
      id: s.id,
      score: s.score,
      text: s.text,
      metadata: s.metadata,
    }));
  }

  async deleteAll(): Promise<void> {
    console.warn("⚠️  deleteAll() called — clearing in-memory store");
    this.data = { chunks: [], createdAt: new Date().toISOString(), count: 0 };
    // Also clear S3
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.key,
          Body: JSON.stringify(this.data),
          ContentType: "application/json",
        })
      );
    } catch (error: any) {
      throw new VectorStoreError(`Failed to clear S3 embeddings: ${error.message}`, error);
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureLoaded();
      return true;
    } catch {
      return false;
    }
  }
}

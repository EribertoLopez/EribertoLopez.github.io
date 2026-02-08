// lib/types.ts — Shared types across all pipeline modules

export interface LoadedDocument {
  filename: string;
  content: string;
  type: string;
}

export interface Chunk {
  id: string;
  text: string;
  source: string;
  metadata: Record<string, string>;
}

export interface ChunkRecord {
  id: string;
  embedding: number[];
  text: string;
  metadata: Record<string, string>;
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

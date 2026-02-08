import { pipelineConfig } from "../config";
import { SupabaseVectorStore } from "./supabase";
import type { VectorRepository } from "./types";

export type { VectorRepository } from "./types";

export function createVectorStore(): VectorRepository {
  return new SupabaseVectorStore(
    pipelineConfig.vectorStore.url(),
    pipelineConfig.vectorStore.key()
  );
}

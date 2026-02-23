import { pipelineConfig } from "../config";
import { AuroraVectorStore } from "./aurora";
import { SupabaseVectorStore } from "./supabase";
import type { VectorRepository } from "./types";

export type { VectorRepository } from "./types";

export function createVectorStore(): VectorRepository {
  const provider = pipelineConfig.vectorStore.provider;
  switch (provider) {
    case "aurora":
      return new AuroraVectorStore();
    case "supabase":
      return new SupabaseVectorStore(
        pipelineConfig.vectorStore.url(),
        pipelineConfig.vectorStore.key()
      );
    default:
      throw new Error(`Unknown vector store provider: ${provider}`);
  }
}

import { pipelineConfig } from "../config";
import { OllamaEmbedding } from "./ollama";
import { OpenAIEmbedding } from "./openai";
import type { EmbeddingProvider } from "./types";

export type { EmbeddingProvider } from "./types";

export function createEmbeddingProvider(): EmbeddingProvider {
  const { provider, ollama, openai } = pipelineConfig.embedding;
  switch (provider) {
    case "openai":
      return new OpenAIEmbedding(openai.model);
    case "ollama":
      return new OllamaEmbedding(ollama.baseUrl, ollama.model);
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }
}

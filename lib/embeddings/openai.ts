import OpenAI from "openai";
import { EmbeddingError } from "../errors";
import { withRetry } from "../utils";
import type { EmbeddingProvider } from "./types";

export class OpenAIEmbedding implements EmbeddingProvider {
  readonly name = "openai";
  readonly dimension = 1536;
  private client: OpenAI;

  constructor(private model = "text-embedding-3-small") {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async embed(text: string): Promise<number[]> {
    return withRetry(async () => {
      try {
        const res = await this.client.embeddings.create({
          model: this.model,
          input: text,
        });
        return res.data[0].embedding;
      } catch (error) {
        throw new EmbeddingError(`OpenAI embedding failed`, error);
      }
    });
  }

  async embedBatch(
    texts: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<number[][]> {
    return withRetry(async () => {
      try {
        const res = await this.client.embeddings.create({
          model: this.model,
          input: texts,
        });
        const results = res.data.map((d) => d.embedding);
        onProgress?.(texts.length, texts.length);
        return results;
      } catch (error) {
        throw new EmbeddingError(`OpenAI batch embedding failed`, error);
      }
    });
  }
}

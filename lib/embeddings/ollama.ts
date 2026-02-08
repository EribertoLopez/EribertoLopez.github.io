import { EmbeddingError } from "../errors";
import { withRetry } from "../utils";
import type { EmbeddingProvider } from "./types";

export class OllamaEmbedding implements EmbeddingProvider {
  readonly name = "ollama";
  readonly dimension = 768;

  constructor(
    private baseUrl = "http://localhost:11434",
    private model = "nomic-embed-text"
  ) {}

  async embed(text: string): Promise<number[]> {
    return withRetry(async () => {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt: text }),
      });
      if (!res.ok) {
        throw new EmbeddingError(`Ollama error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      return data.embedding;
    });
  }

  async embedBatch(
    texts: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      results.push(await this.embed(texts[i]));
      onProgress?.(i + 1, texts.length);
      // Rate limit: small delay between calls
      if (i < texts.length - 1) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    return results;
  }
}

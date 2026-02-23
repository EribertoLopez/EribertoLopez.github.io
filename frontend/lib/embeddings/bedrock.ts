// lib/embeddings/bedrock.ts — AWS Bedrock Titan embedding provider

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { EmbeddingError } from "../errors";
import { withRetry } from "../utils";
import type { EmbeddingProvider } from "./types";

const DEFAULT_MODEL_ID = "amazon.titan-embed-text-v2:0";
const TITAN_V2_DIMENSION = 1024;
const MAX_BATCH_SIZE = 20; // Process in batches to avoid throttling

export class BedrockEmbedding implements EmbeddingProvider {
  readonly name = "bedrock";
  readonly dimension = TITAN_V2_DIMENSION;
  private client: BedrockRuntimeClient;

  constructor(
    private modelId = DEFAULT_MODEL_ID,
    region?: string
  ) {
    this.client = new BedrockRuntimeClient({
      region: region ?? process.env.AWS_REGION ?? "us-east-1",
    });
  }

  async embed(text: string): Promise<number[]> {
    return withRetry(async () => {
      try {
        const command = new InvokeModelCommand({
          modelId: this.modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            inputText: text,
            dimensions: TITAN_V2_DIMENSION,
            normalize: true,
          }),
        });

        const response = await this.client.send(command);
        const body = JSON.parse(new TextDecoder().decode(response.body));
        return body.embedding as number[];
      } catch (error) {
        throw new EmbeddingError("Bedrock Titan embedding failed", error);
      }
    });
  }

  async embedBatch(
    texts: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<number[][]> {
    // Titan doesn't support batch natively — process sequentially in chunks
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((text) => this.embed(text))
      );
      results.push(...batchResults);
      onProgress?.(Math.min(i + MAX_BATCH_SIZE, texts.length), texts.length);
    }

    return results;
  }
}

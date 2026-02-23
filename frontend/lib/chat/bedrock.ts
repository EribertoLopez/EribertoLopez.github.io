// lib/chat/bedrock.ts — AWS Bedrock Claude chat provider

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { pipelineConfig } from "../config";
import { ChatError } from "../errors";
import type { ChatMessage } from "../types";
import type { ChatProvider } from "./types";

const DEFAULT_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

export class BedrockChat implements ChatProvider {
  readonly name = "bedrock";
  private client: BedrockRuntimeClient;

  constructor(
    private modelId?: string,
    region?: string
  ) {
    this.client = new BedrockRuntimeClient({
      region: region ?? process.env.AWS_REGION ?? "us-east-1",
    });
    this.modelId =
      modelId ?? process.env.BEDROCK_CHAT_MODEL_ID ?? DEFAULT_MODEL_ID;
  }

  async generate(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: pipelineConfig.chat.maxTokens,
          system: systemPrompt,
          messages: [...history, { role: "user", content: userMessage }],
        }),
      });

      const response = await this.client.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));

      const textBlock = body.content?.find(
        (block: any) => block.type === "text"
      );
      return (
        textBlock?.text || "I'm sorry, I couldn't generate a response."
      );
    } catch (error) {
      throw new ChatError("Bedrock Claude response failed", error);
    }
  }

  async generateStream(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<void> {
    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: pipelineConfig.chat.maxTokens,
          system: systemPrompt,
          messages: [...history, { role: "user", content: userMessage }],
        }),
      });

      const response = await this.client.send(command);

      if (!response.body) {
        throw new ChatError("No response stream from Bedrock");
      }

      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const parsed = JSON.parse(
            new TextDecoder().decode(event.chunk.bytes)
          );
          if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "text_delta"
          ) {
            onChunk(parsed.delta.text);
          }
        }
      }
    } catch (error) {
      if (error instanceof ChatError) throw error;
      throw new ChatError("Bedrock Claude streaming failed", error);
    }
  }
}

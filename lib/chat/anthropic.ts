// lib/chat/anthropic.ts — Anthropic (Claude) chat provider

import Anthropic from "@anthropic-ai/sdk";
import { pipelineConfig } from "../config";
import { ChatError } from "../errors";
import type { ChatMessage } from "../types";
import type { ChatProvider } from "./types";

export class AnthropicChat implements ChatProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: pipelineConfig.chat.model,
        max_tokens: pipelineConfig.chat.maxTokens,
        system: systemPrompt,
        messages: [...history, { role: "user", content: userMessage }],
      });

      const textBlock = response.content.find(
        (block) => block.type === "text"
      );
      return (
        textBlock?.text || "I'm sorry, I couldn't generate a response."
      );
    } catch (error) {
      throw new ChatError("AI response failed", error);
    }
  }

  async generateStream(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<void> {
    try {
      const stream = this.client.messages.stream({
        model: pipelineConfig.chat.model,
        max_tokens: pipelineConfig.chat.maxTokens,
        system: systemPrompt,
        messages: [...history, { role: "user", content: userMessage }],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          onChunk(event.delta.text);
        }
      }
    } catch (error) {
      throw new ChatError("AI streaming response failed", error);
    }
  }
}

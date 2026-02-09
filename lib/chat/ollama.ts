// lib/chat/ollama.ts — Ollama chat provider (via OpenAI-compatible API)

import OpenAI from "openai";
import { pipelineConfig } from "../config";
import { ChatError } from "../errors";
import type { ChatMessage } from "../types";
import type { ChatProvider } from "./types";

export class OllamaChat implements ChatProvider {
  readonly name = "ollama";
  private client: OpenAI;

  constructor(baseUrl: string, private model: string) {
    this.client = new OpenAI({
      baseURL: `${baseUrl}/v1`,
      apiKey: "ollama", // Ollama doesn't require a key, but the SDK expects one
    });
  }

  async generate(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: pipelineConfig.chat.maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userMessage },
        ],
      });

      return (
        response.choices[0]?.message?.content ||
        "I'm sorry, I couldn't generate a response."
      );
    } catch (error) {
      throw new ChatError("AI response failed (Ollama)", error);
    }
  }

  async generateStream(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: pipelineConfig.chat.maxTokens,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userMessage },
        ],
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          onChunk(text);
        }
      }
    } catch (error) {
      throw new ChatError("AI streaming response failed (Ollama)", error);
    }
  }
}

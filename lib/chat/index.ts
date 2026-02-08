// lib/chat/index.ts — Chat provider factory

import { pipelineConfig } from "../config";
import { AnthropicChat } from "./anthropic";
import { OllamaChat } from "./ollama";
import type { ChatProvider } from "./types";

export type { ChatProvider } from "./types";

export function createChatProvider(): ChatProvider {
  const { provider } = pipelineConfig.chat;
  switch (provider) {
    case "anthropic":
      return new AnthropicChat();
    case "ollama":
      return new OllamaChat(
        pipelineConfig.embedding.ollama.baseUrl,
        pipelineConfig.chat.ollamaModel
      );
    default:
      throw new Error(`Unknown chat provider: ${provider}`);
  }
}

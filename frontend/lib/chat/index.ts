// lib/chat/index.ts — Chat provider factory

import { pipelineConfig } from "../config";
import { AnthropicChat } from "./anthropic";
import { BedrockChat } from "./bedrock";
import { OllamaChat } from "./ollama";
import type { ChatProvider } from "./types";

export type { ChatProvider } from "./types";

export function createChatProvider(): ChatProvider {
  const { provider } = pipelineConfig.chat;
  switch (provider) {
    case "bedrock":
      return new BedrockChat(
        pipelineConfig.chat.bedrockModelId,
        pipelineConfig.chat.bedrockRegion
      );
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

// lib/chat/types.ts — ChatProvider interface

import type { ChatMessage } from "../types";

export interface ChatProvider {
  readonly name: string;
  generate(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string
  ): Promise<string>;
  generateStream(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<void>;
}

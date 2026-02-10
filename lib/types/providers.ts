// Provider interfaces for embeddings and chat
// Enables swapping between Ollama (local dev) and Bedrock (prod)

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ChatProvider {
  streamChat(
    messages: ChatMessage[],
    context: string,
    options?: ChatOptions
  ): AsyncGenerator<string>;
}

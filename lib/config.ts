// lib/config.ts — Single source of truth for all pipeline configuration

function env(key: string, fallback: string | number): string | number {
  const val = process.env[key];
  if (val === undefined) return fallback;
  return typeof fallback === "number" ? parseInt(val, 10) : val;
}

function envFloat(key: string, fallback: number): number {
  const val = process.env[key];
  return val !== undefined ? parseFloat(val) : fallback;
}

function envRequired(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const pipelineConfig = {
  chunking: {
    chunkSize: env("CHUNK_SIZE", 500) as number,
    overlap: env("CHUNK_OVERLAP", 100) as number,
  },
  embedding: {
    provider: (env("EMBEDDING_PROVIDER", "ollama") as string) as
      | "ollama"
      | "openai"
      | "bedrock",
    ollama: {
      baseUrl: env("OLLAMA_BASE_URL", "http://localhost:11434") as string,
      model: env("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text") as string,
    },
    openai: {
      model: env("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small") as string,
    },
    bedrock: {
      model: env("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0") as string,
      region: env("AWS_REGION", "us-east-1") as string,
    },
  },
  vectorStore: {
    provider: (env("VECTOR_STORE_PROVIDER", "supabase") as string) as
      | "supabase"
      | "aurora",
    url: () => envRequired("SUPABASE_URL"),
    key: () => envRequired("SUPABASE_SERVICE_ROLE_KEY"),
    batchSize: env("UPSERT_BATCH_SIZE", 100) as number,
    matchThreshold: envFloat("MATCH_THRESHOLD", 0.3),
    topK: env("TOP_K", 5) as number,
  },
  chat: {
    provider: (env("CHAT_PROVIDER", "ollama") as string) as
      | "ollama"
      | "anthropic"
      | "bedrock",
    model: env("CHAT_MODEL", "claude-sonnet-4-20250514") as string,
    ollamaModel: env("OLLAMA_CHAT_MODEL", "llama3.2") as string,
    bedrockModelId: env("BEDROCK_CHAT_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0") as string,
    bedrockRegion: env("AWS_REGION", "us-east-1") as string,
    maxTokens: env("CHAT_MAX_TOKENS", 1024) as number,
    maxMessageLength: env("CHAT_MAX_MESSAGE_LENGTH", 2000) as number,
    maxHistoryLength: env("CHAT_MAX_HISTORY", 50) as number,
  },
  rateLimit: {
    windowMs: env("RATE_LIMIT_WINDOW_MS", 60_000) as number,
    maxRequests: env("RATE_LIMIT_MAX_REQUESTS", 10) as number,
  },
};

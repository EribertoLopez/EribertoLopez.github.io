// lib/config.ts — Single source of truth for all pipeline configuration
//
// Uses getter functions so env vars are read at access time, not module load time.
// This allows dotenv.config() to run before config values are evaluated.

function env(key: string, fallback: string): string;
function env(key: string, fallback: number): number;
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
  get chunking() {
    return {
      chunkSize: env("CHUNK_SIZE", 500),
      overlap: env("CHUNK_OVERLAP", 100),
    };
  },
  get embedding() {
    return {
      provider: env("EMBEDDING_PROVIDER", "ollama") as "ollama" | "openai" | "bedrock",
      ollama: {
        baseUrl: env("OLLAMA_BASE_URL", "http://localhost:11434"),
        model: env("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"),
      },
      openai: {
        model: env("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
      },
      bedrock: {
        model: env("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0"),
        region: env("AWS_REGION", "us-east-1"),
      },
    };
  },
  get vectorStore() {
    return {
      provider: env("VECTOR_STORE_PROVIDER", "s3") as "s3" | "supabase" | "aurora",
      url: () => envRequired("SUPABASE_URL"),
      key: () => envRequired("SUPABASE_SERVICE_ROLE_KEY"),
      batchSize: env("UPSERT_BATCH_SIZE", 100),
      matchThreshold: envFloat("MATCH_THRESHOLD", 0.3),
      topK: env("TOP_K", 5),
    };
  },
  get chat() {
    return {
      provider: env("CHAT_PROVIDER", "ollama") as "ollama" | "anthropic" | "bedrock",
      model: env("CHAT_MODEL", "claude-sonnet-4-20250514"),
      ollamaModel: env("OLLAMA_CHAT_MODEL", "llama3.2"),
      bedrockModelId: env("BEDROCK_CHAT_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"),
      bedrockRegion: env("AWS_REGION", "us-east-1"),
      maxTokens: env("CHAT_MAX_TOKENS", 1024),
      maxMessageLength: env("CHAT_MAX_MESSAGE_LENGTH", 2000),
      maxHistoryLength: env("CHAT_MAX_HISTORY", 50),
    };
  },
  get rateLimit() {
    return {
      windowMs: env("RATE_LIMIT_WINDOW_MS", 60_000),
      maxRequests: env("RATE_LIMIT_MAX_REQUESTS", 10),
    };
  },
};

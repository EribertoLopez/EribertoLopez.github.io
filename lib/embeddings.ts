// lib/embeddings.ts
import OpenAI from "openai";

// Configuration - switches between Ollama (local) and OpenAI (production)
const USE_OPENAI = process.env.EMBEDDING_PROVIDER === "openai";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";
const OPENAI_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

// OpenAI client (only initialized if using OpenAI)
const openai = USE_OPENAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Converts text into a vector using Ollama (local).
 */
async function embedWithOllama(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding;
}

/**
 * Converts text into a vector using OpenAI (production).
 */
async function embedWithOpenAI(text: string): Promise<number[]> {
  if (!openai) throw new Error("OpenAI client not initialized");

  const response = await openai.embeddings.create({
    model: OPENAI_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Converts text into a vector (array of numbers).
 *
 * Uses Ollama locally (free, fast) or OpenAI in production (reliable, scalable).
 * Set EMBEDDING_PROVIDER=openai in production.
 *
 * @param text - The text to convert
 * @returns An array of numbers (the embedding vector)
 */
export async function embedText(text: string): Promise<number[]> {
  if (USE_OPENAI) {
    return embedWithOpenAI(text);
  }
  return embedWithOllama(text);
}

/**
 * Get the dimension of embeddings for the current provider.
 * Important: Supabase needs to know the vector dimension!
 */
export function getEmbeddingDimension(): number {
  if (USE_OPENAI) {
    // text-embedding-3-small = 1536 dimensions
    return 1536;
  }
  // nomic-embed-text = 768 dimensions
  return 768;
}

/**
 * Embeds multiple texts. OpenAI can batch, Ollama goes one at a time.
 *
 * @param texts - Array of texts to embed
 * @param onProgress - Optional callback for progress updates
 */
export async function embedBatch(
  texts: string[],
  onProgress?: (current: number, total: number) => void
): Promise<number[][]> {
  if (USE_OPENAI && openai) {
    // OpenAI supports batch embedding
    const response = await openai.embeddings.create({
      model: OPENAI_MODEL,
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }

  // Ollama: one at a time
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    const embedding = await embedWithOllama(texts[i]);
    embeddings.push(embedding);

    if (onProgress) {
      onProgress(i + 1, texts.length);
    }
  }
  return embeddings;
}

/**
 * Calculates how similar two vectors are.
 * Returns a number between -1 and 1, where 1 = identical.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

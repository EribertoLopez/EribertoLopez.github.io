// lib/vectorStore.ts
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

/**
 * Stores a chunk with its embedding in Supabase.
 */
export async function upsertChunk(
  id: string,
  embedding: number[],
  text: string,
  metadata: Record<string, string>
): Promise<void> {
  const { error } = await supabase.from("documents").upsert({
    id,
    content: text,
    metadata,
    embedding,
  });

  if (error) throw error;
}

/**
 * Stores multiple chunks at once.
 */
export async function upsertChunks(
  chunks: Array<{
    id: string;
    embedding: number[];
    text: string;
    metadata: Record<string, string>;
  }>
): Promise<void> {
  const batchSize = 100;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const { error } = await supabase.from("documents").upsert(
      batch.map((chunk) => ({
        id: chunk.id,
        content: chunk.text,
        metadata: chunk.metadata,
        embedding: chunk.embedding,
      }))
    );

    if (error) throw error;

    console.log(
      `  Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`
    );
  }
}

/**
 * Searches for chunks similar to the query using pgvector.
 *
 * @param queryEmbedding - The embedding of the search query
 * @param topK - How many results to return
 * @returns Array of matching chunks with their similarity scores
 */
export async function searchSimilar(
  queryEmbedding: number[],
  topK: number = 5
): Promise<
  Array<{
    id: string;
    score: number;
    text: string;
    metadata: Record<string, any>;
  }>
> {
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: topK,
    match_threshold: 0.0,
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    score: row.similarity,
    text: row.content,
    metadata: row.metadata,
  }));
}

/**
 * Deletes all documents (useful for re-ingesting).
 */
export async function deleteAll(): Promise<void> {
  const { error } = await supabase.from("documents").delete().neq("id", "");
  if (error) throw error;
}

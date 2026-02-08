// lib/chunking.ts

export interface Chunk {
  id: string;
  text: string;
  metadata: {
    source: string; // Which file this came from
    chunkIndex: number; // Which chunk number (0, 1, 2, ...)
  };
}

export interface ChunkingOptions {
  chunkSize: number; // Target size in characters
  overlap: number; // How much chunks should overlap
}

/**
 * Splits text into overlapping chunks.
 *
 * WHY OVERLAP?
 * Imagine a sentence that spans two chunks. Without overlap,
 * we might cut it in half and lose the meaning. Overlap ensures
 * we don't lose context at chunk boundaries.
 *
 * Example with overlap=50:
 * Chunk 1: "...end of chunk one. Start of important sentence..."
 * Chunk 2: "...of important sentence that continues here..."
 *          ↑ This part appears in BOTH chunks
 */
export function chunkText(
  text: string,
  source: string,
  options: ChunkingOptions = { chunkSize: 500, overlap: 100 }
): Chunk[] {
  const { chunkSize, overlap } = options;
  const chunks: Chunk[] = [];

  // Clean up the text (remove extra whitespace)
  const cleanText = text.replace(/\s+/g, " ").trim();

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    // Calculate end position
    let end = start + chunkSize;

    // If we're not at the end, try to break at a sentence
    if (end < cleanText.length) {
      // Look for a period, question mark, or newline near the end
      const breakPoint = cleanText.lastIndexOf(". ", end);
      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1; // Include the period
      }
    }

    // Extract the chunk
    const chunkText = cleanText.slice(start, end).trim();

    if (chunkText.length > 0) {
      chunks.push({
        id: `${source}-chunk-${chunkIndex}`,
        text: chunkText,
        metadata: {
          source,
          chunkIndex,
        },
      });
      chunkIndex++;
    }

    // Move start position (accounting for overlap)
    start = end - overlap;

    // Prevent infinite loop
    if (start <= 0 && chunkIndex > 0) {
      start = end;
    }
  }

  return chunks;
}

/**
 * Chunks multiple documents at once.
 */
export function chunkDocuments(
  documents: { filename: string; content: string }[],
  options?: ChunkingOptions
): Chunk[] {
  const allChunks: Chunk[] = [];

  for (const doc of documents) {
    const chunks = chunkText(doc.content, doc.filename, options);
    allChunks.push(...chunks);
  }

  return allChunks;
}

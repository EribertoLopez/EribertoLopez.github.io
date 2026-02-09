// scripts/test-search.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { embedText } from "../lib/embeddings";
import { searchSimilar } from "../lib/vectorStore";

async function main() {
  const query = process.argv[2] || "What is your experience with React?";
  const provider =
    process.env.EMBEDDING_PROVIDER === "openai" ? "OpenAI" : "Ollama";

  console.log(`🔍 Searching for: "${query}"`);
  console.log(`   (using ${provider} embeddings)\n`);

  // Embed the query
  const queryEmbedding = await embedText(query);

  // Search for similar chunks
  const results = await searchSimilar(queryEmbedding, 3);

  console.log(`📚 Top ${results.length} results:\n`);

  for (const result of results) {
    console.log(`--- Score: ${(result.score * 100).toFixed(1)}% ---`);
    console.log(`Source: ${result.metadata.source}`);
    console.log(`Text: ${result.text.substring(0, 200)}...`);
    console.log();
  }
}

main().catch(console.error);

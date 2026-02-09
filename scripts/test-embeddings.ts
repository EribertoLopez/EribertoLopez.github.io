// scripts/test-embeddings.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  embedText,
  cosineSimilarity,
  getEmbeddingDimension,
} from "../lib/embeddings";

async function main() {
  const provider =
    process.env.EMBEDDING_PROVIDER === "openai" ? "OpenAI" : "Ollama";
  console.log(`🔢 Testing embeddings with ${provider}...\n`);

  // Test 1: Generate an embedding
  const text1 = "I have 5 years of experience with React and TypeScript";
  console.log(`Text: "${text1}"`);

  const embedding1 = await embedText(text1);
  console.log(
    `Embedding length: ${embedding1.length} dimensions (expected: ${getEmbeddingDimension()})`
  );
  console.log(
    `First 5 values: [${embedding1
      .slice(0, 5)
      .map((n) => n.toFixed(4))
      .join(", ")}...]`
  );
  console.log();

  // Test 2: Compare similar texts
  const text2 = "React and TypeScript development experience";
  const text3 = "I love cooking Italian food";

  const embedding2 = await embedText(text2);
  const embedding3 = await embedText(text3);

  const similarity12 = cosineSimilarity(embedding1, embedding2);
  const similarity13 = cosineSimilarity(embedding1, embedding3);

  console.log("📊 Similarity comparison:");
  console.log(`"${text1.substring(0, 40)}..." vs`);
  console.log(
    `"${text2.substring(0, 40)}..." = ${(similarity12 * 100).toFixed(1)}% similar`
  );
  console.log();
  console.log(`"${text1.substring(0, 40)}..." vs`);
  console.log(
    `"${text3.substring(0, 40)}..." = ${(similarity13 * 100).toFixed(1)}% similar`
  );
  console.log();

  if (similarity12 > similarity13) {
    console.log("✅ Embeddings correctly identify similar content!");
  } else {
    console.log("❌ Something's wrong with the embeddings");
  }
}

main().catch(console.error);

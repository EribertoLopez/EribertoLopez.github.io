// scripts/test-chunking.ts
import { loadDocuments } from "../lib/documents";
import { chunkDocuments } from "../lib/chunking";

async function main() {
  // Load documents
  const docs = await loadDocuments("./documents");

  // Chunk them
  const chunks = chunkDocuments(docs, {
    chunkSize: 500,
    overlap: 100,
  });

  console.log(`📄 Loaded ${docs.length} documents`);
  console.log(`🧩 Created ${chunks.length} chunks\n`);

  // Show first 5 chunks as examples
  for (const chunk of chunks.slice(0, 5)) {
    console.log(`--- ${chunk.id} ---`);
    console.log(`Source: ${chunk.metadata.source}`);
    console.log(`Length: ${chunk.text.length} characters`);
    console.log(`Preview: ${chunk.text.substring(0, 150)}...`);
    console.log();
  }

  // Show chunk distribution per document
  console.log("📊 Chunk distribution:");
  const distribution: Record<string, number> = {};
  for (const chunk of chunks) {
    distribution[chunk.metadata.source] =
      (distribution[chunk.metadata.source] || 0) + 1;
  }
  for (const [source, count] of Object.entries(distribution)) {
    console.log(`  ${source}: ${count} chunks`);
  }
}

main().catch(console.error);

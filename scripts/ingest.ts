// scripts/ingest.ts
// Full ingestion pipeline: Load docs → Chunk → Embed → Store in Supabase

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { loadDocuments } from "../lib/documents";
import { chunkDocuments } from "../lib/chunking";
import { embedText } from "../lib/embeddings";
import { upsertChunks, deleteAll } from "../lib/vectorStore";

async function main() {
  const provider =
    process.env.EMBEDDING_PROVIDER === "openai" ? "OpenAI" : "Ollama";
  console.log(`🚀 Starting ingestion pipeline (embeddings via ${provider})...\n`);

  // Step 1: Load documents
  console.log("📄 Step 1: Loading documents...");
  const docs = await loadDocuments("./documents");
  console.log(`   Loaded ${docs.length} documents\n`);

  // Step 2: Chunk documents
  console.log("🧩 Step 2: Chunking documents...");
  const chunks = chunkDocuments(docs, {
    chunkSize: 500,
    overlap: 100,
  });
  console.log(`   Created ${chunks.length} chunks\n`);

  // Step 3: Generate embeddings
  console.log("🔢 Step 3: Generating embeddings (this may take a while)...");
  const chunksWithEmbeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk.text);

    chunksWithEmbeddings.push({
      id: chunk.id,
      embedding,
      text: chunk.text,
      metadata: {
        source: chunk.metadata.source,
        chunkIndex: String(chunk.metadata.chunkIndex),
      },
    });

    if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
      console.log(`   Embedded ${i + 1}/${chunks.length} chunks`);
    }
  }
  console.log();

  // Step 4: Store in Supabase
  console.log("🗄️ Step 4: Storing in Supabase...");
  console.log("   Clearing existing data...");
  await deleteAll();

  console.log("   Uploading new data...");
  await upsertChunks(chunksWithEmbeddings);

  console.log("\n✅ Ingestion complete!");
  console.log(
    `   ${docs.length} documents → ${chunks.length} chunks → stored in Supabase`
  );
}

main().catch(console.error);

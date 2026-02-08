// scripts/test-loader.ts
import { loadDocuments } from "../lib/documents";

async function main() {
  console.log("🔍 Loading documents...\n");

  const docs = await loadDocuments("./documents");

  console.log(`\n📚 Loaded ${docs.length} documents:\n`);

  for (const doc of docs) {
    console.log(`--- ${doc.filename} (${doc.type}) ---`);
    console.log(`Preview: ${doc.content.substring(0, 500)}...`);
    console.log();
  }
}

main().catch(console.error);

// scripts/setup-db.ts
// Run this ONCE to set up the database schema

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { getEmbeddingDimension } from "../lib/embeddings";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const dimension = getEmbeddingDimension();
  console.log(
    `🔧 Setting up database for ${dimension}-dimensional embeddings...\n`
  );

  // Check if the documents table exists
  const { error: tableError } = await supabase
    .from("documents")
    .select("id")
    .limit(1);

  if (tableError?.code === "42P01") {
    // Table doesn't exist
    console.log(`
⚠️  Run this SQL in your Supabase SQL Editor (Database > SQL Editor):

-------------------------------------------
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the documents table
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(${dimension}),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for fast similarity search
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to search for similar documents
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(${dimension}),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
-------------------------------------------

Then run this script again to verify.
    `);
    return;
  }

  console.log("✅ Database is ready!");
}

main().catch(console.error);

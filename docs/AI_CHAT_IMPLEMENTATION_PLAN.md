# 🤖 AI Chat Feature — Implementation Plan

> **Goal:** Build an AI assistant that answers questions about your professional experience  
> **Audience:** This guide is written for junior engineers — we'll explain concepts as we go!  
> **Timeline:** ~2-3 weeks across 7 feature branches

---

## 📚 Table of Contents

1. [How It All Works (The Big Picture)](#1-how-it-all-works-the-big-picture)
2. [Key Concepts Explained](#2-key-concepts-explained)
3. [Branch Strategy](#3-branch-strategy)
4. [Feature Branch Details](#4-feature-branch-details)
5. [Testing Strategy](#5-testing-strategy)
6. [Definition of Done](#6-definition-of-done)

---

## 1. How It All Works (The Big Picture)

### What We're Building

A chat widget on your portfolio website where visitors can ask questions like:
- "What's your experience with React?"
- "Tell me about a project you led"
- "What's your education background?"

The AI will answer using **your actual resume and documents** — not made-up information.

### The Two Main Flows

**Flow 1: Ingestion (Happens Once)**
```
Your Documents → Split into Chunks → Convert to Numbers (Embeddings) → Store in Database
```

**Flow 2: Chat (Happens Every Question)**
```
User Question → Find Relevant Chunks → Send to AI → Return Answer
```

### Visual Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│   📄 YOUR DOCUMENTS                     🗄️ VECTOR DATABASE                 │
│   ┌──────────────┐                     ┌──────────────────┐               │
│   │ resume.pdf   │                     │                  │               │
│   │ projects.md  │ ──── INGESTION ───► │  Stored as       │               │
│   │ cover.docx   │      (one time)     │  searchable      │               │
│   └──────────────┘                     │  vectors         │               │
│                                        └────────▲─────────┘               │
│                                                 │                          │
│   💬 USER ASKS QUESTION                         │ search                   │
│   ┌──────────────────┐                         │                          │
│   │ "What's your     │                         │                          │
│   │  React exp?"     │ ───► FIND RELEVANT ─────┘                          │
│   └──────────────────┘      CHUNKS                                        │
│                                │                                          │
│                                ▼                                          │
│                        ┌──────────────┐                                   │
│                        │   CLAUDE AI  │                                   │
│                        │   answers    │ ───► "I have 5 years of React..." │
│                        │   using your │                                   │
│                        │   documents  │                                   │
│                        └──────────────┘                                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Concepts Explained

### 🧩 What is "Chunking"?

**Problem:** Your resume might be 3 pages long. If someone asks "What's your React experience?", we don't want to send ALL 3 pages to the AI — that's wasteful and slow.

**Solution:** We split your documents into smaller pieces called "chunks" (like paragraphs). Then we only send the relevant chunks.

```
BEFORE (one big document):
┌─────────────────────────────────────────────────────────────┐
│ John Doe's Resume                                           │
│ Education: BS Computer Science...                           │
│ Work Experience: Senior Engineer at Company A...            │
│ Skills: React, TypeScript, Python...                        │
│ Projects: Built a dashboard that...                         │
│ ... (3 pages of text)                                       │
└─────────────────────────────────────────────────────────────┘

AFTER (chunks):
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Chunk 1:            │  │ Chunk 2:            │  │ Chunk 3:            │
│ Education: BS       │  │ Work Experience:    │  │ Skills: React,      │
│ Computer Science... │  │ Senior Engineer...  │  │ TypeScript...       │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

### 🔢 What are "Embeddings"?

**Problem:** Computers don't understand text the way humans do. They need numbers.

**Solution:** We convert text into a list of numbers (called a "vector" or "embedding") that captures the *meaning* of the text.

```
Text: "I have 5 years of React experience"
            │
            ▼
Embedding: [0.023, -0.156, 0.892, 0.445, ... ] (hundreds of numbers)
```

**Why this matters:** Similar meanings = similar numbers!

```
"React experience"     → [0.1, 0.5, 0.3, ...]
"React development"    → [0.1, 0.4, 0.3, ...]  ← Very similar!
"Cooking recipes"      → [0.9, 0.1, 0.8, ...]  ← Very different!
```

This lets us SEARCH for relevant chunks by comparing numbers.

---

### 🗄️ What is a "Vector Database"?

A special database designed to store embeddings and find similar ones quickly.

**Regular database:** "Find all users where name = 'John'"
**Vector database:** "Find all chunks that are similar to this question"

We'll use **Supabase** with the `pgvector` extension — it's a Postgres database with superpowers for storing and searching vectors. Supabase gives you a full database plus vector search in one place (free tier available).

---

### 🤖 What is "RAG"?

**RAG = Retrieval-Augmented Generation**

It's a fancy way of saying:
1. **Retrieval:** Find relevant information from your documents
2. **Augmented:** Add that information to the AI's prompt
3. **Generation:** AI generates an answer using that information

Without RAG, the AI makes up answers. With RAG, the AI uses YOUR actual documents.

---

## 3. Branch Strategy

We'll use **feature branches** that build on each other:

```
main
  │
  └── coral/ai-chat-implementation-plan (this plan)
        │
        ├── feature/01-document-loader
        │     └── Load and parse PDF, DOCX, MD files
        │
        ├── feature/02-text-chunking
        │     └── Split documents into chunks
        │
        ├── feature/03-embeddings
        │     └── Generate embeddings (Ollama local / OpenAI prod)
        │
        ├── feature/04-vector-store
        │     └── Store and search with Supabase + pgvector
        │
        ├── feature/05-chat-api
        │     └── Build /api/chat endpoint
        │
        ├── feature/06-chat-widget
        │     └── Frontend chat UI
        │
        └── feature/07-production-deploy
              └── ECS + infrastructure
```

**Merge order:** Each branch merges to `main` before starting the next one.

---

## 4. Feature Branch Details

---

### 🌿 Branch 1: `feature/01-document-loader`

**Goal:** Read different file types and extract their text content.

**What you'll learn:**
- Working with file systems in Node.js
- Parsing PDFs and Word documents
- Handling different file types

#### Files to Create

```
lib/
└── documents.ts    # Document loading functions

scripts/
└── test-loader.ts  # Test script

documents/           # Folder for your actual docs
├── resume.pdf
├── projects.md
└── accomplishments.txt
```

#### Step-by-Step Tasks

- [ ] **Task 1.1:** Create the `documents/` folder and add sample files
  ```bash
  mkdir documents
  # Add your resume.pdf, any .md files, etc.
  ```

- [ ] **Task 1.2:** Install required packages
  ```bash
  npm install pdf-parse mammoth
  npm install -D @types/pdf-parse
  ```

- [ ] **Task 1.3:** Create `lib/documents.ts`
  ```typescript
  // lib/documents.ts
  import fs from "fs";
  import path from "path";
  import pdf from "pdf-parse";
  import mammoth from "mammoth";

  // This type describes what a loaded document looks like
  export interface LoadedDocument {
    filename: string;
    content: string;
    type: "pdf" | "docx" | "markdown" | "text";
  }

  /**
   * Reads a single file and extracts its text content.
   * 
   * @param filePath - Full path to the file
   * @returns The extracted text content
   */
  async function extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === ".pdf") {
      // PDF files need special parsing
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      return data.text;
    }
    
    if (ext === ".docx") {
      // Word documents need mammoth to extract text
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    
    if ([".md", ".txt"].includes(ext)) {
      // Plain text files can be read directly
      return fs.readFileSync(filePath, "utf-8");
    }
    
    throw new Error(`Unsupported file type: ${ext}`);
  }

  /**
   * Loads all documents from a directory.
   * 
   * @param dirPath - Path to the documents folder
   * @returns Array of loaded documents with their content
   */
  export async function loadDocuments(dirPath: string): Promise<LoadedDocument[]> {
    // Get list of all files in the directory
    const files = fs.readdirSync(dirPath);
    
    const documents: LoadedDocument[] = [];
    
    for (const filename of files) {
      const filePath = path.join(dirPath, filename);
      
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }
      
      // Skip unsupported files
      const ext = path.extname(filename).toLowerCase();
      if (![".pdf", ".docx", ".md", ".txt"].includes(ext)) {
        console.log(`Skipping unsupported file: ${filename}`);
        continue;
      }
      
      try {
        const content = await extractText(filePath);
        
        documents.push({
          filename,
          content,
          type: ext === ".pdf" ? "pdf" : 
                ext === ".docx" ? "docx" : 
                ext === ".md" ? "markdown" : "text"
        });
        
        console.log(`✅ Loaded: ${filename} (${content.length} characters)`);
      } catch (error) {
        console.error(`❌ Failed to load ${filename}:`, error);
      }
    }
    
    return documents;
  }
  ```

- [ ] **Task 1.4:** Create test script `scripts/test-loader.ts`
  ```typescript
  // scripts/test-loader.ts
  import { loadDocuments } from "../lib/documents";

  async function main() {
    console.log("🔍 Loading documents...\n");
    
    const docs = await loadDocuments("./documents");
    
    console.log(`\n📚 Loaded ${docs.length} documents:\n`);
    
    for (const doc of docs) {
      console.log(`--- ${doc.filename} (${doc.type}) ---`);
      console.log(`Preview: ${doc.content.substring(0, 200)}...`);
      console.log();
    }
  }

  main().catch(console.error);
  ```

- [ ] **Task 1.5:** Test it works
  ```bash
  npx ts-node scripts/test-loader.ts
  ```

#### Definition of Done
- [ ] Can load PDF files and extract text
- [ ] Can load DOCX files and extract text
- [ ] Can load MD/TXT files
- [ ] Test script runs without errors
- [ ] At least 2 sample documents loaded successfully

---

### 🌿 Branch 2: `feature/02-text-chunking`

**Goal:** Split large documents into smaller, searchable pieces.

**What you'll learn:**
- Text processing techniques
- Why chunk size and overlap matter
- Working with metadata

#### Files to Create/Modify

```
lib/
├── documents.ts    # (from Branch 1)
└── chunking.ts     # NEW: Chunking functions

scripts/
└── test-chunking.ts  # Test script
```

#### Step-by-Step Tasks

- [ ] **Task 2.1:** Create `lib/chunking.ts`
  ```typescript
  // lib/chunking.ts

  export interface Chunk {
    id: string;
    text: string;
    metadata: {
      source: string;      // Which file this came from
      chunkIndex: number;  // Which chunk number (0, 1, 2, ...)
    };
  }

  export interface ChunkingOptions {
    chunkSize: number;   // Target size in characters
    overlap: number;     // How much chunks should overlap
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
            chunkIndex
          }
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
  ```

- [ ] **Task 2.2:** Create test script `scripts/test-chunking.ts`
  ```typescript
  // scripts/test-chunking.ts
  import { loadDocuments } from "../lib/documents";
  import { chunkDocuments } from "../lib/chunking";

  async function main() {
    // Load documents
    const docs = await loadDocuments("./documents");
    
    // Chunk them
    const chunks = chunkDocuments(docs, {
      chunkSize: 500,
      overlap: 100
    });
    
    console.log(`📄 Loaded ${docs.length} documents`);
    console.log(`🧩 Created ${chunks.length} chunks\n`);
    
    // Show first 3 chunks as examples
    for (const chunk of chunks.slice(0, 3)) {
      console.log(`--- ${chunk.id} ---`);
      console.log(`Source: ${chunk.metadata.source}`);
      console.log(`Length: ${chunk.text.length} characters`);
      console.log(`Preview: ${chunk.text.substring(0, 100)}...`);
      console.log();
    }
  }

  main().catch(console.error);
  ```

- [ ] **Task 2.3:** Test chunking
  ```bash
  npx ts-node scripts/test-chunking.ts
  ```

- [ ] **Task 2.4:** Experiment with different chunk sizes
  - Try 300, 500, 800 character chunks
  - Notice how it affects the number of chunks
  - Smaller = more precise search, more chunks
  - Larger = more context, fewer chunks

#### Definition of Done
- [ ] Text splits into chunks of approximately target size
- [ ] Chunks have overlap to preserve context
- [ ] Each chunk has an ID and metadata
- [ ] Test script shows reasonable chunk distribution

---

### 🌿 Branch 3: `feature/03-embeddings`

**Goal:** Convert text chunks into searchable vectors using a hybrid approach: **Ollama for local development**, **OpenAI for production**.

**What you'll learn:**
- Running AI models locally with Ollama
- Using OpenAI's embedding API
- Environment-based configuration
- What embeddings look like

#### Why Hybrid?
- **Local (Ollama):** Free, fast iteration, no API costs during development
- **Production (OpenAI):** Battle-tested, consistent quality, scales automatically

#### Prerequisites
```bash
# For local development - Install Ollama: https://ollama.com/download
# Then pull an embedding model:
ollama pull nomic-embed-text

# For production - Get an OpenAI API key: https://platform.openai.com/api-keys
```

#### Files to Create/Modify

```
lib/
├── documents.ts    # (from Branch 1)
├── chunking.ts     # (from Branch 2)
└── embeddings.ts   # NEW: Embedding functions

scripts/
└── test-embeddings.ts
```

#### Step-by-Step Tasks

- [ ] **Task 3.1:** Verify Ollama is running
  ```bash
  # Start Ollama if it's not running
  ollama serve
  
  # In another terminal, test it works
  curl http://localhost:11434/api/embeddings -d '{
    "model": "nomic-embed-text",
    "prompt": "Hello world"
  }'
  ```

- [ ] **Task 3.2:** Install OpenAI SDK
  ```bash
  npm install openai
  ```

- [ ] **Task 3.3:** Create `lib/embeddings.ts`
  ```typescript
  // lib/embeddings.ts
  import OpenAI from "openai";

  // Configuration - switches between Ollama (local) and OpenAI (production)
  const USE_OPENAI = process.env.EMBEDDING_PROVIDER === "openai";
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";
  const OPENAI_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

  // OpenAI client (only initialized if using OpenAI)
  const openai = USE_OPENAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
  ```

- [ ] **Task 3.4:** Create test script `scripts/test-embeddings.ts`
  ```typescript
  // scripts/test-embeddings.ts
  import * as dotenv from "dotenv";
  dotenv.config({ path: ".env.local" });
  
  import { embedText, cosineSimilarity, getEmbeddingDimension } from "../lib/embeddings";

  async function main() {
    const provider = process.env.EMBEDDING_PROVIDER === "openai" ? "OpenAI" : "Ollama";
    console.log(`🔢 Testing embeddings with ${provider}...\n`);
    
    // Test 1: Generate an embedding
    const text1 = "I have 5 years of experience with React and TypeScript";
    console.log(`Text: "${text1}"`);
    
    const embedding1 = await embedText(text1);
    console.log(`Embedding length: ${embedding1.length} dimensions (expected: ${getEmbeddingDimension()})`);
    console.log(`First 5 values: [${embedding1.slice(0, 5).map(n => n.toFixed(4)).join(", ")}...]`);
    console.log();
    
    // Test 2: Compare similar texts
    const text2 = "React and TypeScript development experience";
    const text3 = "I love cooking Italian food";
    
    const embedding2 = await embedText(text2);
    const embedding3 = await embedText(text3);
    
    const similarity12 = cosineSimilarity(embedding1, embedding2);
    const similarity13 = cosineSimilarity(embedding1, embedding3);
    
    console.log("📊 Similarity comparison:");
    console.log(`"${text1.substring(0, 30)}..." vs`);
    console.log(`"${text2.substring(0, 30)}..." = ${(similarity12 * 100).toFixed(1)}% similar`);
    console.log();
    console.log(`"${text1.substring(0, 30)}..." vs`);
    console.log(`"${text3.substring(0, 30)}..." = ${(similarity13 * 100).toFixed(1)}% similar`);
    console.log();
    
    if (similarity12 > similarity13) {
      console.log("✅ Embeddings correctly identify similar content!");
    } else {
      console.log("❌ Something's wrong with the embeddings");
    }
  }

  main().catch(console.error);
  ```

- [ ] **Task 3.5:** Run the test
  ```bash
  # Test with Ollama (local, default)
  npx ts-node scripts/test-embeddings.ts
  
  # Test with OpenAI (if you have API key set)
  EMBEDDING_PROVIDER=openai npx ts-node scripts/test-embeddings.ts
  ```

#### Definition of Done
- [ ] Ollama generates embeddings locally (768 dimensions for nomic-embed-text)
- [ ] OpenAI generates embeddings when configured (1536 dimensions for text-embedding-3-small)
- [ ] Similar texts have higher similarity scores
- [ ] Environment variable switches between providers

---

### 🌿 Branch 4: `feature/04-vector-store`

**Goal:** Store embeddings in Supabase (Postgres + pgvector) and search for similar content.

**What you'll learn:**
- Setting up Supabase with vector search
- SQL for vector similarity search
- Using Supabase client in TypeScript

#### Why Supabase?
- **Full database + vectors in one place** — no separate vector DB to manage
- **Postgres underneath** — familiar SQL, great tooling
- **Free tier is generous** — 500MB database, plenty for a portfolio
- **pgvector extension** — battle-tested vector similarity search

#### Prerequisites
1. Create a free Supabase account: https://supabase.com/
2. Create a new project
3. Get your project URL and API keys from Settings > API

#### Files to Create/Modify

```
lib/
├── documents.ts    # (from Branch 1)
├── chunking.ts     # (from Branch 2)
├── embeddings.ts   # (from Branch 3)
└── vectorStore.ts  # NEW: Supabase functions

scripts/
├── setup-db.ts     # One-time database setup
├── ingest.ts       # Full ingestion pipeline
└── test-search.ts  # Test searching

.env.local          # API keys (don't commit!)
```

#### Step-by-Step Tasks

- [ ] **Task 4.1:** Install Supabase client
  ```bash
  npm install @supabase/supabase-js
  ```

- [ ] **Task 4.2:** Create `.env.local` (add to .gitignore!)
  ```
  # Supabase
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  
  # Embeddings (for local dev, leave EMBEDDING_PROVIDER unset to use Ollama)
  # EMBEDDING_PROVIDER=openai
  # OPENAI_API_KEY=your-openai-key
  ```

- [ ] **Task 4.3:** Create `scripts/setup-db.ts` (one-time setup)
  ```typescript
  // scripts/setup-db.ts
  // Run this ONCE to set up the database schema
  
  import * as dotenv from "dotenv";
  dotenv.config({ path: ".env.local" });
  
  import { createClient } from "@supabase/supabase-js";
  import { getEmbeddingDimension } from "../lib/embeddings";

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for DDL
  );

  async function main() {
    const dimension = getEmbeddingDimension();
    console.log(`🔧 Setting up database for ${dimension}-dimensional embeddings...\n`);
    
    // Enable pgvector extension
    console.log("1. Enabling pgvector extension...");
    const { error: extError } = await supabase.rpc("exec_sql", {
      sql: "CREATE EXTENSION IF NOT EXISTS vector;"
    });
    
    // Note: If exec_sql doesn't exist, run this in Supabase SQL editor:
    // CREATE EXTENSION IF NOT EXISTS vector;
    
    // Create the documents table
    console.log("2. Creating documents table...");
    const { error: tableError } = await supabase.from("documents").select("id").limit(1);
    
    if (tableError?.code === "42P01") {
      // Table doesn't exist, create it
      // Run this SQL in Supabase SQL Editor:
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
  ```

- [ ] **Task 4.4:** Create `lib/vectorStore.ts`
  ```typescript
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
    // Supabase handles batching internally, but let's chunk for progress
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
      
      console.log(`  Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
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
  ): Promise<Array<{
    id: string;
    score: number;
    text: string;
    metadata: Record<string, any>;
  }>> {
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
  ```

- [ ] **Task 4.5:** Create the full ingestion script `scripts/ingest.ts`
  ```typescript
  // scripts/ingest.ts
  // This script runs the entire pipeline:
  // Load docs → Chunk → Embed → Store in Supabase
  
  import * as dotenv from "dotenv";
  dotenv.config({ path: ".env.local" });

  import { loadDocuments } from "../lib/documents";
  import { chunkDocuments } from "../lib/chunking";
  import { embedText } from "../lib/embeddings";
  import { upsertChunks, deleteAll } from "../lib/vectorStore";

  async function main() {
    const provider = process.env.EMBEDDING_PROVIDER === "openai" ? "OpenAI" : "Ollama";
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
      
      // Progress update
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
    console.log(`   ${docs.length} documents → ${chunks.length} chunks → stored in Supabase`);
  }

  main().catch(console.error);
  ```

- [ ] **Task 4.6:** Create search test `scripts/test-search.ts`
  ```typescript
  // scripts/test-search.ts
  import * as dotenv from "dotenv";
  dotenv.config({ path: ".env.local" });

  import { embedText } from "../lib/embeddings";
  import { searchSimilar } from "../lib/vectorStore";

  async function main() {
    const query = process.argv[2] || "What is your experience with React?";
    const provider = process.env.EMBEDDING_PROVIDER === "openai" ? "OpenAI" : "Ollama";
    
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
  ```

- [ ] **Task 4.7:** Run the full pipeline
  ```bash
  # First, set up the database (follow the SQL instructions)
  npx ts-node scripts/setup-db.ts
  
  # Run ingestion (with Ollama locally)
  npx ts-node scripts/ingest.ts
  
  # Test search
  npx ts-node scripts/test-search.ts "What programming languages do you know?"
  ```

#### ⚠️ Important: Embedding Dimension Consistency
When you switch between Ollama (768d) and OpenAI (1536d), you need to:
1. Re-run the database setup SQL with the correct dimension
2. Re-ingest all documents

For production, set `EMBEDDING_PROVIDER=openai` and use 1536-dimension vectors.

#### Definition of Done
- [ ] Supabase project created with pgvector enabled
- [ ] Database schema created (documents table + match_documents function)
- [ ] Ingestion script runs successfully
- [ ] Search returns relevant results
- [ ] Different queries return different relevant chunks

---

### 🌿 Branch 5: `feature/05-chat-api`

**Goal:** Build the API endpoint that powers the chat.

**What you'll learn:**
- Next.js API routes
- Streaming responses
- Prompt engineering

#### Files to Create

```
app/
└── api/
    └── chat/
        └── route.ts    # Chat API endpoint

lib/
├── ... (previous files)
└── ai.ts              # Claude API wrapper
```

#### Step-by-Step Tasks

- [ ] **Task 5.1:** Install Anthropic SDK
  ```bash
  npm install @anthropic-ai/sdk
  ```

- [ ] **Task 5.2:** Add API key to `.env.local`
  ```
  ANTHROPIC_API_KEY=your-api-key-here
  ```

- [ ] **Task 5.3:** Create `lib/ai.ts`
  ```typescript
  // lib/ai.ts
  import Anthropic from "@anthropic-ai/sdk";
  import { embedText } from "./embeddings";
  import { searchSimilar } from "./vectorStore";

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  /**
   * The system prompt tells Claude how to behave.
   * This is crucial for good responses!
   */
  function buildSystemPrompt(relevantChunks: string[]): string {
    return `You are an AI assistant on Eriberto Lopez's personal portfolio website. 
Your job is to answer questions about his professional background, skills, experience, and accomplishments.

IMPORTANT RULES:
1. ONLY use information from the documents provided below
2. If you don't know something, say "I don't have that information in my documents"
3. Be warm, professional, and concise (2-4 sentences unless more detail is requested)
4. If someone asks how to contact him, mention the contact page or scheduling a call
5. NEVER make up information not in the documents

DOCUMENTS:
---
${relevantChunks.join("\n\n---\n\n")}
---

Answer the user's question based on the documents above.`;
  }

  /**
   * Main function to generate a chat response.
   */
  export async function generateChatResponse(
    userMessage: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<string> {
    // Step 1: Find relevant document chunks
    const queryEmbedding = await embedText(userMessage);
    const relevantDocs = await searchSimilar(queryEmbedding, 5);
    const relevantChunks = relevantDocs.map((doc) => doc.text);
    
    // Step 2: Build the prompt
    const systemPrompt = buildSystemPrompt(relevantChunks);
    
    // Step 3: Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user", content: userMessage },
      ],
    });
    
    // Step 4: Extract the text response
    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text || "I'm sorry, I couldn't generate a response.";
  }
  ```

- [ ] **Task 5.4:** Create `app/api/chat/route.ts`
  ```typescript
  // app/api/chat/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import { generateChatResponse } from "@/lib/ai";

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const { message, history = [] } = body;
      
      if (!message) {
        return NextResponse.json(
          { error: "Message is required" },
          { status: 400 }
        );
      }
      
      const response = await generateChatResponse(message, history);
      
      return NextResponse.json({ response });
    } catch (error) {
      console.error("Chat API error:", error);
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }
  }
  ```

- [ ] **Task 5.5:** Test the API
  ```bash
  # Start the dev server
  npm run dev
  
  # In another terminal, test the endpoint
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "What is your experience with React?"}'
  ```

#### Definition of Done
- [ ] API endpoint returns responses
- [ ] Responses are based on your actual documents
- [ ] Conversation history is maintained
- [ ] Errors are handled gracefully

---

### 🌿 Branch 6: `feature/06-chat-widget`

**Goal:** Build the frontend chat interface.

**What you'll learn:**
- React components and state
- Streaming UI updates
- Responsive design

#### Files to Create

```
components/
├── ChatWidget.tsx      # Main chat component
├── ChatButton.tsx      # Floating button
├── ChatMessage.tsx     # Individual message
└── ChatInput.tsx       # Input field

app/
└── page.tsx           # Add chat widget to homepage
```

*(Detailed implementation in separate file due to length)*

#### Definition of Done
- [ ] Chat widget opens/closes
- [ ] Messages display correctly
- [ ] Input field works
- [ ] Responses stream in
- [ ] Mobile responsive

---

### 🌿 Branch 7: `feature/07-production-deploy`

**Goal:** Deploy the ingestion pipeline to AWS ECS.

**What you'll learn:**
- Docker containerization
- AWS ECS task definitions
- CI/CD with GitHub Actions

*(Detailed implementation in separate file)*

#### Definition of Done
- [ ] Dockerfile builds successfully
- [ ] ECS task definition created
- [ ] Ingestion can be triggered
- [ ] Production environment variables set

---

## 5. Testing Strategy

### Unit Tests
- Document loading functions
- Chunking functions
- Embedding similarity calculations

### Integration Tests
- Full ingestion pipeline
- Search and retrieval
- Chat API responses

### Manual Testing
- Chat widget UX
- Mobile responsiveness
- Error states

---

## 6. Definition of Done (Overall)

The feature is complete when:
- [ ] All 7 branches merged to main
- [ ] Chat widget works on production site
- [ ] Documents can be updated and re-ingested
- [ ] Response quality is good (based on manual testing)
- [ ] No API keys exposed in code
- [ ] Documentation updated

---

## Appendix: Helpful Commands

```bash
# Start local development
npm run dev

# Run ingestion locally
npx ts-node scripts/ingest.ts

# Test search
npx ts-node scripts/test-search.ts "your query here"

# Check Ollama is running
curl http://localhost:11434/api/tags

# View Supabase dashboard
# https://supabase.com/dashboard

# Test with OpenAI embeddings instead of Ollama
EMBEDDING_PROVIDER=openai npx ts-node scripts/ingest.ts
```

---

*Plan created by Coral 🪸 | 2026-02-08*

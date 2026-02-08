# 🔬 Spike: RAG Pipeline with Ollama Embeddings + ECS Deployment

> **Type:** Spike / Technical Investigation  
> **Status:** Draft  
> **Created:** 2026-02-08  
> **Author:** Coral 🪸

---

## Objective

Investigate and document how to:
1. Build a RAG (Retrieval-Augmented Generation) pipeline for the AI chat feature
2. Use Ollama for local embeddings during development
3. Deploy the ingestion pipeline to AWS ECS for production

---

## 1. RAG Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    INGESTION (runs once / on doc update)         │
│                                                                  │
│  Your Docs    Parse & Chunk      Embedding Model      Vector DB  │
│  (PDF, MD) ──► [LangChain] ──► [Ollama/Voyage] ──► [Pinecone]   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    QUERY TIME (per visitor question)             │
│                                                                  │
│  User Question ──► Embed ──► Vector Search ──► Build Prompt ──► Claude
│                                    │                    │
│                              top K chunks         system prompt +
│                                                   retrieved context
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Ollama Embeddings Integration

### 2.1 Local Setup

```bash
# Install embedding model
ollama pull nomic-embed-text      # 768 dimensions, good balance
# OR
ollama pull mxbai-embed-large     # 1024 dimensions, higher quality
```

### 2.2 LangChain.js Integration

```typescript
// lib/embeddings.ts
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

export const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
});

// Single text
const vector = await embeddings.embedQuery("What's your experience?");

// Batch
const vectors = await embeddings.embedDocuments(chunks);
```

### 2.3 Direct API (No LangChain)

```typescript
// lib/embeddings.ts
export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });
  
  const data = await response.json();
  return data.embedding;
}
```

---

## 3. Ingestion Pipeline

### 3.1 Script Structure

```typescript
// scripts/ingest.ts
import { embedText } from "../lib/embeddings";
import { upsertToVectorDB } from "../lib/vectorStore";
import { loadDocuments, chunkText } from "../lib/documents";

async function ingest() {
  // 1. Load docs from ./documents or S3
  const docs = await loadDocuments(process.env.DOCS_PATH || "./documents");
  
  // 2. Chunk into ~500 token pieces with overlap
  const chunks = docs.flatMap((doc) => 
    chunkText(doc.content, { 
      chunkSize: 500, 
      overlap: 100,
      metadata: { source: doc.filename }
    })
  );
  
  console.log(`📄 ${chunks.length} chunks to embed`);
  
  // 3. Embed each chunk
  for (const chunk of chunks) {
    const vector = await embedText(chunk.text);
    
    // 4. Store in vector DB
    await upsertToVectorDB({
      id: chunk.id,
      vector,
      metadata: chunk.metadata,
      text: chunk.text,
    });
    
    console.log(`✅ Embedded: ${chunk.id}`);
  }
  
  console.log("🎉 Ingestion complete!");
}

ingest();
```

### 3.2 Document Loading

```typescript
// lib/documents.ts
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export async function loadDocuments(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  const docs = [];
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const ext = path.extname(file).toLowerCase();
    
    let content: string;
    
    if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const data = await pdf(buffer);
      content = data.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;
    } else if ([".md", ".txt"].includes(ext)) {
      content = fs.readFileSync(filePath, "utf-8");
    } else {
      continue; // Skip unsupported files
    }
    
    docs.push({ filename: file, content });
  }
  
  return docs;
}
```

---

## 4. ECS Deployment Options

### Option A: ECS Task with Ollama Sidecar (GPU Required)

```
┌─────────────────────────────────────────────────────────────┐
│                     ECS Task (GPU Instance)                  │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Ollama         │◄───│  Ingestion Script               │ │
│  │  (sidecar)      │    │  - Load docs from S3            │ │
│  │  nomic-embed    │    │  - Chunk text                   │ │
│  │  localhost:11434│    │  - Call Ollama for embeddings   │ │
│  └─────────────────┘    │  - Upsert to Pinecone           │ │
│                         └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Task Definition:**
```json
{
  "family": "portfolio-ingestion",
  "requiresCompatibilities": ["EC2"],
  "cpu": "4096",
  "memory": "16384",
  "containerDefinitions": [
    {
      "name": "ollama",
      "image": "ollama/ollama:latest",
      "essential": true,
      "portMappings": [{ "containerPort": 11434 }],
      "resourceRequirements": [
        { "type": "GPU", "value": "1" }
      ]
    },
    {
      "name": "ingestion",
      "image": "your-ecr-repo/ingestion:latest",
      "essential": true,
      "dependsOn": [{ "containerName": "ollama", "condition": "HEALTHY" }],
      "environment": [
        { "name": "OLLAMA_BASE_URL", "value": "http://localhost:11434" },
        { "name": "PINECONE_API_KEY", "valueFrom": "arn:aws:secretsmanager:..." }
      ]
    }
  ]
}
```

**Pros:** Self-contained, no external API costs  
**Cons:** GPU instance required (~$0.50/hr for g4dn.xlarge)

---

### Option B: ECS Task with Managed Embedding API (Recommended)

```
┌──────────────────────────────────────────────────────────────┐
│                     ECS Task (Fargate - No GPU!)              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Ingestion Script                                       │ │
│  │  - Load docs from S3                                    │ │
│  │  - Chunk text                                           │ │
│  │  - Call Voyage AI / OpenAI for embeddings               │ │
│  │  - Upsert to Pinecone                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Task Definition:**
```json
{
  "family": "portfolio-ingestion",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "ingestion",
      "image": "your-ecr-repo/ingestion:latest",
      "essential": true,
      "environment": [
        { "name": "EMBEDDING_PROVIDER", "value": "voyage" }
      ],
      "secrets": [
        { "name": "VOYAGE_API_KEY", "valueFrom": "arn:aws:secretsmanager:..." },
        { "name": "PINECONE_API_KEY", "valueFrom": "arn:aws:secretsmanager:..." }
      ]
    }
  ]
}
```

**Pros:** No GPU needed, cheaper, simpler  
**Cons:** Small API cost (~$0.0001 per 1K tokens)

---

### Option C: Hybrid (Ollama Dev / Managed Prod)

```typescript
// lib/embeddings.ts
export async function embedText(text: string): Promise<number[]> {
  if (process.env.EMBEDDING_PROVIDER === "ollama") {
    // Local development
    return embedWithOllama(text);
  } else {
    // Production - use Voyage AI
    return embedWithVoyage(text);
  }
}
```

**Best of both worlds:**
- Free local dev with Ollama
- Cheap, fast prod with managed API

---

## 5. Cost Comparison

| Approach | Ingestion Cost | Query Cost | Complexity |
|----------|---------------|------------|------------|
| Ollama on GPU ECS | ~$0.50/hr (g4dn.xlarge) | Same instance | High |
| Voyage AI (managed) | ~$0.01 total | ~$0.10/month | Low |
| OpenAI Embeddings | ~$0.02 total | ~$0.15/month | Low |
| Ollama local (dev) | Free | N/A | Dev only |

---

## 6. Recommended Production Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCTION ARCHITECTURE                                        │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ S3 Bucket   │    │ ECS Task    │    │ Pinecone            │ │
│  │ /documents  │───►│ Fargate     │───►│ Vector DB           │ │
│  │             │    │ (triggered) │    │                     │ │
│  └─────────────┘    └──────┬──────┘    └──────────▲──────────┘ │
│        │                   │                      │             │
│        │                   ▼                      │             │
│        │            Voyage AI API                 │             │
│        │            (embeddings)                  │             │
│        │                                          │             │
│  EventBridge ◄──── S3 Event (on upload)          │             │
│                                                   │             │
│  ┌─────────────────────────────────────┐         │             │
│  │ Vercel (Next.js)                    │         │             │
│  │ - Website                           │─────────┘             │
│  │ - /api/chat (Claude + Pinecone)     │                       │
│  └─────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Spike Tasks / Next Steps

- [ ] Set up Ollama locally with `nomic-embed-text`
- [ ] Create basic ingestion script that reads markdown files
- [ ] Test embedding generation locally
- [ ] Set up Pinecone free tier account
- [ ] Test end-to-end: ingest → embed → store → retrieve
- [ ] Create Dockerfile for ingestion container
- [ ] Set up ECS task definition (Fargate)
- [ ] Create S3 bucket for document storage
- [ ] Set up EventBridge trigger for automatic ingestion
- [ ] Benchmark: Ollama vs Voyage AI (speed, quality)

---

## 8. Open Questions

1. **Vector DB choice:** Pinecone (managed) vs Supabase pgvector (self-hosted)?
2. **Embedding model:** nomic-embed-text vs mxbai-embed-large vs Voyage?
3. **Chunk size:** 500 tokens? 800? Need to test retrieval quality.
4. **Trigger mechanism:** S3 events? GitHub Actions? Manual?
5. **Cost threshold:** What's acceptable monthly spend?

---

## References

- [LangChain.js Ollama Embeddings](https://js.langchain.com/docs/integrations/text_embedding/ollama)
- [Ollama Embedding Models](https://ollama.com/library?q=embed)
- [Voyage AI Docs](https://docs.voyageai.com/)
- [Pinecone Quickstart](https://docs.pinecone.io/docs/quickstart)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)

---

*Spike by Coral 🪸 | 2026-02-08*

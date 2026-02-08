# AI Chat Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                          │
│  (GitHub Actions → ECS Fargate)                                    │
│                                                                    │
│  documents/          lib/loaders/       lib/chunking.ts             │
│  ┌──────────┐       ┌───────────┐      ┌──────────────┐            │
│  │ .md .pdf │──────▶│ Factory   │─────▶│ chunkText()  │            │
│  │ .docx    │       │ Registry  │      │ overlap=100  │            │
│  └──────────┘       └───────────┘      └──────┬───────┘            │
│                                               │                    │
│                     lib/embeddings/            ▼                    │
│                    ┌──────────────┐     ┌──────────────┐            │
│                    │  Strategy:   │────▶│  Supabase    │            │
│                    │  Ollama |    │     │  pgvector    │            │
│                    │  OpenAI     │     │  upsert()    │            │
│                    └──────────────┘     └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         CHAT PIPELINE                              │
│  (Vercel — Next.js Pages Router)                                   │
│                                                                    │
│  ChatWidget          /api/chat          lib/ai.ts                  │
│  ┌──────────┐       ┌───────────┐      ┌──────────────┐            │
│  │ React UI │──────▶│ Rate Limit│─────▶│ embedText()  │            │
│  │ localStorage│    │ Validate  │      │ searchSimilar│            │
│  └──────────┘       └───────────┘      └──────┬───────┘            │
│                                               │                    │
│                                               ▼                    │
│                                        ┌──────────────┐            │
│                                        │ Anthropic    │            │
│                                        │ Claude API   │            │
│                                        │ + RAG context│            │
│                                        └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Ingestion Pipeline
1. **Load** — `lib/documents.ts` reads files from `documents/` using factory-selected loaders (`lib/loaders/registry.ts`)
2. **Chunk** — `lib/chunking.ts` splits text into overlapping chunks (default 500 chars, 100 overlap) with sentence-boundary awareness
3. **Embed** — `lib/embeddings/index.ts` selects provider (Ollama or OpenAI) via Strategy pattern, generates vector embeddings
4. **Store** — `lib/vectorStore/supabase.ts` upserts chunk records into Supabase pgvector table in batches

### Chat Pipeline
1. **Input** — `ChatWidget.tsx` captures user message, sends to `/api/chat`
2. **Validate** — `pages/api/chat.ts` checks rate limits, message length, history length
3. **Retrieve** — `lib/ai.ts` embeds the query, searches Supabase for top-K similar chunks
4. **Generate** — Claude receives system prompt with retrieved chunks as sandboxed data, generates response
5. **Respond** — JSON response (or SSE stream) returned to widget

## Module Dependency Graph

```
pages/api/chat.ts
  ├── lib/ai.ts
  │   ├── lib/embeddings.ts → lib/embeddings/index.ts
  │   │   ├── lib/embeddings/ollama.ts
  │   │   └── lib/embeddings/openai.ts
  │   ├── lib/vectorStore.ts → lib/vectorStore/index.ts
  │   │   └── lib/vectorStore/supabase.ts
  │   ├── lib/config.ts
  │   └── lib/errors.ts
  ├── lib/rateLimit.ts
  └── lib/config.ts

scripts/ingest.ts
  ├── lib/documents.ts
  │   └── lib/loaders/registry.ts
  │       ├── lib/loaders/pdf.ts
  │       ├── lib/loaders/docx.ts
  │       └── lib/loaders/text.ts
  ├── lib/chunking.ts
  ├── lib/embeddings.ts
  └── lib/vectorStore.ts

components/ChatWidget.tsx
  ├── components/ChatButton.tsx
  ├── components/ChatInput.tsx
  └── components/ChatMessage.tsx
```

## Design Patterns

### Factory Pattern — Document Loaders (`lib/loaders/`)

**Why:** Each file type (PDF, DOCX, Markdown, TXT) requires different parsing logic. The Factory pattern decouples document loading from specific formats.

- **Interface:** `DocumentLoader` — `extensions: string[]` + `load(filePath): Promise<string>`
- **Registry:** `lib/loaders/registry.ts` — maps extensions to loader instances
- **Implementations:** `PdfLoader`, `DocxLoader`, `TextLoader`
- **Extension point:** Add a new loader class, register it in `registry.ts`

### Strategy Pattern — Embedding Providers (`lib/embeddings/`)

**Why:** Development uses free local Ollama (768-dim); production uses OpenAI API (1536-dim). The Strategy pattern allows runtime swapping via `EMBEDDING_PROVIDER` env var.

- **Interface:** `EmbeddingProvider` — `name`, `dimension`, `embed()`, `embedBatch()`
- **Factory function:** `createEmbeddingProvider()` in `lib/embeddings/index.ts`
- **Implementations:** `OllamaEmbedding`, `OpenAIEmbedding`
- **Selection:** `pipelineConfig.embedding.provider` (`"ollama"` | `"openai"`)

### Repository Pattern — Vector Store (`lib/vectorStore/`)

**Why:** Abstracts the storage backend so the vector store can be swapped without changing pipeline code.

- **Interface:** `VectorRepository` — `upsert()`, `search()`, `deleteAll()`, `ping()`
- **Factory function:** `createVectorStore()` in `lib/vectorStore/index.ts`
- **Implementation:** `SupabaseVectorStore` with lazy client initialization

### Pipeline Pattern — Ingestion (`scripts/ingest.ts`)

**Why:** The ingestion process is a sequential pipeline (Load → Chunk → Embed → Store) where each step transforms data for the next.

## Shared Types (`lib/types.ts`)

| Type | Fields | Used By |
|------|--------|---------|
| `LoadedDocument` | `filename`, `content`, `type` | Loaders → Chunker |
| `Chunk` | `id`, `text`, `source`, `metadata` | Chunker → Embedder |
| `ChunkRecord` | `id`, `embedding`, `text`, `metadata` | Embedder → VectorStore |
| `SearchResult` | `id`, `score`, `text`, `metadata` | VectorStore → AI |
| `ChatMessage` | `role`, `content` | API ↔ Widget |

## Error Hierarchy (`lib/errors.ts`)

```
PipelineError (step, cause)
  ├── DocumentLoadError   (step = "document-load")
  ├── EmbeddingError      (step = "embedding")
  ├── VectorStoreError    (step = "vector-store")
  └── ChatError           (step = "chat")
```

All errors carry `step` (pipeline stage) and `cause` (original error) for debugging.

## Configuration (`lib/config.ts`)

Single source of truth via `pipelineConfig` object. Uses `env()`, `envFloat()`, `envRequired()` helpers.

| Section | Key | Env Var | Default |
|---------|-----|---------|---------|
| chunking | chunkSize | `CHUNK_SIZE` | `500` |
| chunking | overlap | `CHUNK_OVERLAP` | `100` |
| embedding | provider | `EMBEDDING_PROVIDER` | `"ollama"` |
| embedding.ollama | baseUrl | `OLLAMA_BASE_URL` | `"http://localhost:11434"` |
| embedding.ollama | model | `OLLAMA_EMBEDDING_MODEL` | `"nomic-embed-text"` |
| embedding.openai | model | `OPENAI_EMBEDDING_MODEL` | `"text-embedding-3-small"` |
| vectorStore | url | `SUPABASE_URL` | **required** |
| vectorStore | key | `SUPABASE_SERVICE_ROLE_KEY` | **required** |
| vectorStore | batchSize | `UPSERT_BATCH_SIZE` | `100` |
| vectorStore | matchThreshold | `MATCH_THRESHOLD` | `0.5` |
| vectorStore | topK | `TOP_K` | `5` |
| chat | model | `CHAT_MODEL` | `"claude-sonnet-4-20250514"` |
| chat | maxTokens | `CHAT_MAX_TOKENS` | `1024` |
| chat | maxMessageLength | `CHAT_MAX_MESSAGE_LENGTH` | `2000` |
| chat | maxHistoryLength | `CHAT_MAX_HISTORY` | `50` |
| rateLimit | windowMs | `RATE_LIMIT_WINDOW_MS` | `60000` |
| rateLimit | maxRequests | `RATE_LIMIT_MAX_REQUESTS` | `10` |

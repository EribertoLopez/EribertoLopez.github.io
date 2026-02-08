# AI Chat Developer Guide

## Local Development Setup

### Prerequisites
- Node.js 20+
- [Ollama](https://ollama.com/) installed locally (for free local embeddings)
- Supabase project (free tier works)
- Anthropic API key

### Step-by-Step

```bash
# 1. Clone and checkout
git clone https://github.com/EribertoLopez/EribertoLopez.github.io.git
cd EribertoLopez.github.io
git checkout feature/07-production-deploy

# 2. Install dependencies
npm install

# 3. Pull the embedding model
ollama pull nomic-embed-text

# 4. Set up environment variables
cp .env.example .env.local  # or create manually
```

**`.env.local`** minimum:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
EMBEDDING_PROVIDER=ollama
```

```bash
# 5. Set up the database
npx tsx scripts/setup-db.ts
# Follow the SQL output — run it in Supabase SQL Editor

# 6. Add documents to documents/ directory (already has about.md, projects.md, resume.pdf)

# 7. Run ingestion
npx tsx scripts/ingest.ts

# 8. Start the dev server
npm run dev
# Visit http://localhost:3000 — click the chat bubble in bottom-right
```

## How to Add a New Document Type

**Pattern: Factory (Document Loaders)**

1. Create `lib/loaders/yourtype.ts`:

```typescript
import type { DocumentLoader } from "./types";

export class YourTypeLoader implements DocumentLoader {
  extensions = [".xyz"];

  async load(filePath: string): Promise<string> {
    // Parse file and return plain text
    return "extracted text";
  }
}
```

2. Register in `lib/loaders/registry.ts`:

```typescript
import { YourTypeLoader } from "./yourtype";

const loaders: DocumentLoader[] = [
  new PdfLoader(),
  new DocxLoader(),
  new TextLoader(),
  new YourTypeLoader(),  // ← add here
];
```

3. Optionally update `lib/documents.ts` `getDocumentType()` for metadata tagging.

## How to Add a New Embedding Provider

**Pattern: Strategy (Embedding Providers)**

1. Create `lib/embeddings/yourprovider.ts`:

```typescript
import type { EmbeddingProvider } from "./types";

export class YourProviderEmbedding implements EmbeddingProvider {
  readonly name = "yourprovider";
  readonly dimension = 1024;  // your model's output dimension

  async embed(text: string): Promise<number[]> {
    // Call your embedding API
  }

  async embedBatch(
    texts: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<number[][]> {
    // Batch implementation
  }
}
```

2. Add to factory in `lib/embeddings/index.ts`:

```typescript
import { YourProviderEmbedding } from "./yourprovider";

export function createEmbeddingProvider(): EmbeddingProvider {
  switch (provider) {
    case "yourprovider":
      return new YourProviderEmbedding();
    // ...existing cases
  }
}
```

3. Add config in `lib/config.ts` under `embedding`.

⚠️ **Important:** If you change the embedding dimension, you must recreate the Supabase table with the new `vector(N)` size and re-ingest all documents.

## How to Swap Vector Stores

**Pattern: Repository (Vector Store)**

1. Create `lib/vectorStore/yourstore.ts` implementing `VectorRepository`:

```typescript
import type { VectorRepository } from "./types";
import type { ChunkRecord, SearchResult } from "../types";

export class YourVectorStore implements VectorRepository {
  async upsert(chunks: ChunkRecord[], onProgress?): Promise<void> { ... }
  async search(queryEmbedding: number[], topK: number): Promise<SearchResult[]> { ... }
  async deleteAll(): Promise<void> { ... }
  async ping(): Promise<boolean> { ... }
}
```

2. Update `lib/vectorStore/index.ts` to return your implementation.

## How to Modify the Chat Prompt

Edit `buildSystemPrompt()` in **`lib/ai.ts`** (line ~14). The function receives retrieved chunks and returns the system prompt string.

Key sections:
- **Role definition** — "You are an AI assistant on Eriberto Lopez's personal portfolio website"
- **Rules** — ONLY use retrieved documents, don't fabricate
- **`<RETRIEVED_DOCUMENTS>`** — sandboxed context injection (prompt injection mitigation)

## How to Customize the Chat Widget

All widget code is in `components/`:

| File | Responsibility |
|------|---------------|
| `ChatWidget.tsx` | State management, API calls, message persistence (localStorage) |
| `ChatButton.tsx` | Floating action button (bottom-right) |
| `ChatInput.tsx` | Text input + send button |
| `ChatMessage.tsx` | Individual message bubble, renders Markdown for assistant messages |
| `ChatWidget.module.css` | All styles |

Key constants in `ChatWidget.tsx`:
- `MAX_HISTORY = 20` — sliding window for API calls
- `MAX_MESSAGE_LENGTH = 2000` — client-side validation
- `STORAGE_KEY = "chat-widget-messages"` — localStorage key

## Testing

```bash
# Test document loading
npx tsx scripts/test-loader.ts

# Test chunking
npx tsx scripts/test-chunking.ts

# Test embeddings (requires Ollama running or OpenAI key)
npx tsx scripts/test-embeddings.ts

# Test search (requires ingested data)
npx tsx scripts/test-search.ts
```

### What to Test
- **Loaders:** New file types parse correctly
- **Chunking:** Chunks respect size limits, overlap works, sentence boundaries honored
- **Embeddings:** Provider returns correct dimension vectors
- **Search:** Relevant chunks returned for sample queries
- **API:** Rate limiting, input validation, error responses
- **Widget:** Message persistence, clear history, keyboard shortcuts (Escape to close)

## Common Issues & Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Missing required env var: SUPABASE_URL` | Env not loaded | Check `.env.local` exists, restart dev server |
| Ollama connection refused | Ollama not running | Run `ollama serve` |
| `42P01` error from Supabase | Table doesn't exist | Run `scripts/setup-db.ts`, execute the SQL |
| Embeddings dimension mismatch | Switched providers without re-creating table | Recreate table with correct `vector(N)` dimension |
| `output: 'export'` in `next.config.js` | Static export can't serve API routes | Remove for Vercel deployment, or use `vercel dev` locally |
| Rate limited (429) | >10 requests/minute from same IP | Wait 60s, or adjust `RATE_LIMIT_MAX_REQUESTS` |

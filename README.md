# EribertoLopez.github.io

Personal portfolio and blog built with Next.js, featuring an AI-powered chat experience that lets visitors ask questions about my work, projects, and experience.

## What's Here

- **Portfolio & Blog** — Static pages built with Next.js, Markdown, and TypeScript
- **AI Chat Widget** — RAG-powered chat using Claude, with document ingestion, embeddings, and vector search
- **Documentation** — Architecture decisions, API reference, and deployment guides in [`docs/`](./docs/)

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node)

### Local Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Starting locally and using the AI chat

1. **Set up environment**  
   Create `.env.local` in the project root with at least:
   - `SUPABASE_URL` — your Supabase project URL (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key from Supabase (Project Settings → API)
   - `ANTHROPIC_API_KEY` — your Anthropic API key (e.g. `sk-ant-oat01-...` from [console.anthropic.com](https://console.anthropic.com))
   - `EMBEDDING_PROVIDER=ollama` (or `openai`; if OpenAI, add `OPENAI_API_KEY`)

2. **Create the Supabase table**  
   Run `npx tsx scripts/setup-db.ts`, then run the SQL it prints in the **Supabase dashboard → SQL Editor**.

3. **Embeddings (if using Ollama)**  
   Install [Ollama](https://ollama.com), run `ollama serve`, then `ollama pull nomic-embed-text`.

4. **Ingest documents**  
   Add content to the `documents/` folder (e.g. `about.md`, `projects.md`, `resume.pdf`). Then run:
   ```bash
   npx tsx scripts/ingest.ts
   ```

5. **Start the app**  
   From the repo root run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

6. **Use the chat**  
   Click the chat bubble (bottom-right) and ask questions that should be in your docs (e.g. “What’s Eriberto’s experience with Python?”, “Summarize the resume”).

**Troubleshooting:** Restart the dev server after changing `.env.local`. If answers are generic or missing, re-run `npx tsx scripts/ingest.ts`. For Ollama errors, ensure `ollama serve` is running and `nomic-embed-text` is pulled. Check the dev server terminal for 503 or other errors.

### Environment Variables

To enable the AI chat locally, create a `.env.local` file:

```bash
# Required
ANTHROPIC_API_KEY=your-key-here
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
EMBEDDING_PROVIDER=ollama          # "ollama" (local) or "openai"
OPENAI_API_KEY=your-key            # Required if EMBEDDING_PROVIDER=openai
CHAT_MODEL=claude-sonnet-4-20250514        # Default model
TOP_K=5                            # Number of chunks to retrieve
MATCH_THRESHOLD=0.5                # Similarity threshold (0-1)
```

> **Note:** The portfolio and blog work without any env vars. The AI chat features require the variables above.

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run typecheck` | Run TypeScript checks |

## Architecture

The AI chat uses a RAG (Retrieval-Augmented Generation) pipeline:

1. **Document Loading** — PDF, DOCX, and Markdown files are parsed
2. **Chunking** — Documents are split into searchable segments
3. **Embeddings** — Chunks are embedded via Ollama (local) or OpenAI
4. **Vector Store** — Embeddings stored in Supabase with pgvector
5. **Chat API** — `/api/chat` retrieves relevant chunks and generates responses with Claude

See [`docs/AI_CHAT_ARCHITECTURE.md`](./docs/AI_CHAT_ARCHITECTURE.md) for the full system design.

## Deployment

> ⚠️ **The deployment process is subject to change as the project evolves.**

**Portfolio (Static Site):**
- Built with `next build` using `output: 'export'` for static HTML
- Deployed to GitHub Pages

**AI Chat (API + Ingestion):**
- Chat API runs on Vercel (Next.js API routes)
- Ingestion pipeline runs on ECS Fargate via GitHub Actions
- Vector storage in Supabase (pgvector)

See [`docs/AI_CHAT_DEPLOYMENT.md`](./docs/AI_CHAT_DEPLOYMENT.md) for environment setup and deployment details.

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](./docs/AI_CHAT_ARCHITECTURE.md) | System design and data flow |
| [Developer Guide](./docs/AI_CHAT_DEVELOPER_GUIDE.md) | Contributing and local setup |
| [API Reference](./docs/AI_CHAT_API_REFERENCE.md) | Chat API endpoints |
| [Decisions](./docs/AI_CHAT_DECISIONS.md) | Architecture decision records |
| [Deployment](./docs/AI_CHAT_DEPLOYMENT.md) | Deployment and infrastructure |

## License

MIT

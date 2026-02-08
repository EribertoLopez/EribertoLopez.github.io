# AI Chat Documentation

This directory contains comprehensive documentation for the AI Chat feature — a RAG (Retrieval-Augmented Generation) powered chat widget that lets visitors ask questions about Eriberto's professional background.

## Feature Overview

The AI Chat system consists of two pipelines:

1. **Ingestion Pipeline** — Loads documents (PDF, DOCX, Markdown), chunks them, generates embeddings, and stores them in Supabase with pgvector
2. **Chat Pipeline** — Embeds user queries, retrieves relevant chunks via similarity search, and generates responses using Claude (Anthropic)

The chat widget appears as a floating button on the portfolio site.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./AI_CHAT_ARCHITECTURE.md) | System overview, data flow, design patterns, module graph, config reference |
| [Developer Guide](./AI_CHAT_DEVELOPER_GUIDE.md) | Local setup, extending loaders/embeddings/vector stores, testing |
| [API Reference](./AI_CHAT_API_REFERENCE.md) | `/api/chat` and `/api/health` endpoints — schemas, errors, curl examples |
| [Deployment](./AI_CHAT_DEPLOYMENT.md) | Environment variables, Supabase schema, Vercel config, ECS pipeline, rollback |
| [Decision Records](./AI_CHAT_DECISIONS.md) | ADRs for Supabase, hybrid embeddings, Strategy pattern, rate limiting, prompt injection |

## Key Files

```
lib/
├── ai.ts                    # RAG orchestration (retrieve + generate)
├── config.ts                # Central configuration
├── types.ts                 # Shared types
├── errors.ts                # Error hierarchy
├── chunking.ts              # Text chunking with overlap
├── documents.ts             # Document loading orchestrator
├── rateLimit.ts             # In-memory rate limiter
├── utils.ts                 # Retry, cosine similarity
├── loaders/                 # Factory pattern: document parsers
│   ├── types.ts             #   DocumentLoader interface
│   ├── registry.ts          #   Loader registry
│   ├── pdf.ts, docx.ts, text.ts
├── embeddings/              # Strategy pattern: embedding providers
│   ├── types.ts             #   EmbeddingProvider interface
│   ├── index.ts             #   Provider factory
│   ├── ollama.ts, openai.ts
└── vectorStore/             # Repository pattern: vector storage
    ├── types.ts             #   VectorRepository interface
    ├── index.ts             #   Store factory
    └── supabase.ts

components/
├── ChatWidget.tsx           # Main widget (state, API calls, persistence)
├── ChatButton.tsx           # Floating action button
├── ChatInput.tsx            # Message input
└── ChatMessage.tsx          # Message bubble (Markdown rendering)

pages/api/
├── chat.ts                  # Chat endpoint
└── health.ts                # Health check

scripts/
├── ingest.ts                # Full ingestion pipeline
├── setup-db.ts              # Database schema setup
├── test-*.ts                # Test scripts
```

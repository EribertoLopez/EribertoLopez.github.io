# AI Chat — Deployment Guide

## Architecture

- **Next.js App** → Vercel (auto-deployed on push to main)
- **Ingestion Pipeline** → AWS ECS Fargate (on-demand task)
- **Vector Database** → Supabase (managed Postgres + pgvector)
- **Embeddings** → OpenAI `text-embedding-3-small` (production)
- **Chat AI** → Anthropic Claude Sonnet

## Environment Variables

### Vercel (Next.js app)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### AWS ECS (Ingestion pipeline)
Stored in AWS Secrets Manager:
- `portfolio/supabase-url`
- `portfolio/supabase-service-role-key`
- `portfolio/openai-api-key`

## Setup Steps

### 1. Supabase
1. Create project at https://supabase.com
2. Run SQL from `npx tsx scripts/setup-db.ts` in SQL Editor
3. Note URL and keys

### 2. Vercel
1. Import repo, set environment variables
2. **Important:** Remove `output: 'export'` from `next.config.js` to enable API routes

### 3. AWS (for ingestion)
1. Create ECR repository: `portfolio-ingest`
2. Create ECS cluster: `portfolio-cluster`
3. Store secrets in Secrets Manager
4. Register task definition: `infra/ecs-task-definition.json`
5. Set GitHub Actions secrets: `AWS_ROLE_ARN`, `SUBNET_ID`, `SECURITY_GROUP_ID`

### 4. Initial Ingestion
```bash
# Local (with Ollama)
npx tsx scripts/ingest.ts

# Production (via GitHub Actions)
# Go to Actions tab → "Ingest Documents" → Run workflow
```

## Re-ingesting Documents

1. Update files in `documents/`
2. Push to main → auto-triggers ingestion workflow
3. Or manually trigger via GitHub Actions

## Important Notes

- `next.config.js` has `output: 'export'` which must be removed for API routes
- Switching between Ollama (768d) and OpenAI (1536d) requires re-creating the DB schema and re-ingesting
- The Supabase ivfflat index requires data to exist — run ingestion before testing search

# AI Chat Deployment Guide

## Environment Variables

### Vercel (Chat API)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key for Claude |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (not anon key) |
| `EMBEDDING_PROVIDER` | No | `"ollama"` or `"openai"` (default: `"ollama"`) |
| `OPENAI_API_KEY` | If openai | OpenAI API key (required when `EMBEDDING_PROVIDER=openai`) |
| `OPENAI_EMBEDDING_MODEL` | No | Default: `"text-embedding-3-small"` |
| `CHAT_MODEL` | No | Default: `"claude-sonnet-4-20250514"` |
| `CHAT_MAX_TOKENS` | No | Default: `1024` |
| `MATCH_THRESHOLD` | No | Similarity threshold 0-1 (default: `0.5`) |
| `TOP_K` | No | Number of chunks to retrieve (default: `5`) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: `60000`) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: `10`) |

### ECS Fargate (Ingestion Pipeline)

All of the above, plus:

| Variable | Required | Description |
|----------|----------|-------------|
| `CHUNK_SIZE` | No | Characters per chunk (default: `500`) |
| `CHUNK_OVERLAP` | No | Overlap between chunks (default: `100`) |
| `UPSERT_BATCH_SIZE` | No | Supabase upsert batch size (default: `100`) |

These are set as ECS task definition environment variables or from AWS Secrets Manager.

## Supabase Setup

### 1. Create Project

Create a free project at [supabase.com](https://supabase.com). Note the project URL and service role key from Settings → API.

### 2. Run Schema SQL

In Database → SQL Editor, run:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table (1536 for OpenAI, 768 for Ollama)
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast similarity search
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
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
```

⚠️ Adjust `vector(1536)` to `vector(768)` if using Ollama embeddings.

Alternatively, run `npx tsx scripts/setup-db.ts` which outputs the correct SQL for your configured provider.

## Vercel Deployment

### Configuration

The site uses Next.js Pages Router. Note that `next.config.js` has `output: 'export'` for static site generation — **this must be removed or overridden for API routes to work on Vercel**.

For Vercel deployment with API routes:
1. Remove `output: 'export'` from `next.config.js`
2. Set environment variables in Vercel project settings
3. Deploy via Vercel CLI or GitHub integration

### Important Notes
- API routes (`pages/api/*`) only work with Vercel's serverless functions, not static export
- The `EMBEDDING_PROVIDER` should be `"openai"` in production (Ollama is for local dev)

## ECS Ingestion Pipeline

### Architecture

```
GitHub Actions → Build Docker image → Push to ECR → Run ECS Fargate task
```

### Workflow (`.github/workflows/ingest.yml`)

**Triggers:**
- `workflow_dispatch` — manual trigger with optional reason
- `push` to `main` when files in `documents/` change

**Steps:**
1. Checkout code
2. Configure AWS credentials (OIDC via `role-to-assume`)
3. Login to Amazon ECR
4. Build `Dockerfile.ingest` and push to ECR (`portfolio-ingest` repository)
5. Run ECS Fargate task on `portfolio-cluster`
6. Wait for completion (15min timeout)
7. Check exit code and report

### Docker Image (`Dockerfile.ingest`)

Multi-stage build:
- **Builder stage:** Installs all dependencies
- **Runner stage:** Copies `node_modules`, `lib/`, `scripts/`, `documents/`
- **CMD:** `npx tsx scripts/ingest.ts`

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM role ARN for OIDC federation |
| `SUBNET_ID` | VPC subnet for Fargate task |
| `SECURITY_GROUP_ID` | Security group for Fargate task |

### Required AWS Resources

- ECR repository: `portfolio-ingest`
- ECS cluster: `portfolio-cluster`
- ECS task definition: `portfolio-ingest` (with env vars for Supabase, embedding provider)
- VPC with public subnet (Fargate needs internet access for Supabase/OpenAI)

## Rollback Procedures

### Chat API (Vercel)
- Vercel maintains deployment history — rollback via Vercel dashboard → Deployments → Promote previous
- Or revert the Git commit and push

### Ingestion
- Documents are stored in Git — revert the `documents/` change and re-trigger ingestion
- Manual re-ingestion: GitHub Actions → Actions → "Ingest Documents" → Run workflow
- The pipeline calls `deleteAll()` before upserting, so each run is a clean replace

### Database
- Supabase has point-in-time recovery (Pro plan)
- For free tier: re-run ingestion to rebuild from source documents

## Monitoring & Health Checks

- **`GET /api/health`** — Returns 200 if API keys configured, 503 otherwise
- **Vercel logs** — Function logs available in Vercel dashboard
- **ECS task logs** — CloudWatch Logs (configured in task definition)
- **Supabase dashboard** — Monitor database size, query performance, API usage

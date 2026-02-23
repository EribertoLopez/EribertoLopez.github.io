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
3. Store secrets in Secrets Manager (see names in `infra/ecs-task-definition.json`)
4. Register task definition: `aws ecs register-task-definition --cli-input-json file://infra/ecs-task-definition.json`
5. Set GitHub Actions secrets: `AWS_ROLE_ARN`, `SUBNET_ID`, `SECURITY_GROUP_ID`

### 4. Initial Ingestion
```bash
# Local (with Ollama)
npx tsx scripts/ingest.ts

# Production (via GitHub Actions)
# Go to Actions tab → "Ingest Documents" → Run workflow
```

## Health Check

The `/api/health` endpoint returns the status of required services:
```bash
curl https://your-site.vercel.app/api/health
```
Returns 200 if all required env vars are configured, 503 if any are missing.

## Re-ingesting Documents

1. Update files in `documents/`
2. Push to main → auto-triggers ingestion workflow
3. Or manually trigger via GitHub Actions
4. The workflow now **waits for task completion** and reports success/failure

## Rollback Strategy

### If ingestion produces bad data:

**Option 1: Re-ingest from previous commit**
```bash
# In GitHub Actions, manually trigger with a specific commit
git checkout <previous-good-commit> -- documents/
git push  # Triggers automatic re-ingestion
```

**Option 2: Restore Supabase from backup**
1. Go to Supabase Dashboard → Project Settings → Database → Backups
2. Restore to the point-in-time before the bad ingestion

**Option 3: Manual re-ingestion with known-good data**
```bash
# Checkout the last known good state
git log --oneline documents/  # Find the good commit
git checkout <commit> -- documents/
npx tsx scripts/ingest.ts     # Re-ingest locally
```

### If the Next.js app has issues:

1. **Vercel auto-rollback:** Go to Vercel Dashboard → Deployments → click "..." on a previous deployment → "Promote to Production"
2. **Git revert:** `git revert HEAD && git push` triggers a new clean deployment

### Prevention:
- The ingestion workflow now verifies task exit code before marking success
- Consider adding a smoke test step (query a known question, verify results) as a future improvement
- Add `ingestion_run_id` to chunk metadata for traceability

## Important Notes

- `next.config.js` has `output: 'export'` which must be removed for API routes
- Switching between Ollama (768d) and OpenAI (1536d) requires re-creating the DB schema and re-ingesting
- The Supabase ivfflat index requires data to exist — run ingestion before testing search
- Rate limiting is in-memory only — resets on deploy. Use Redis/Upstash for persistent rate limiting in production

# Vector Store Migration Guide

## Current: S3 In-Memory (Phase A)

Embeddings are stored as a single JSON file in S3. On Lambda cold start, the file is loaded into memory and cosine similarity search runs in-process.

**Architecture:**
```
Ingest: documents/ → chunk → Bedrock Titan embed → embeddings.json → S3
Query:  S3 → Lambda memory → cosine search → top K chunks → Bedrock Claude → response
```

**Limits:**
- ~1,000 chunks comfortably (Lambda 512MB memory)
- ~40MB embeddings file (1024 dimensions × 1,000 chunks)
- No metadata filtering (full scan only)
- Full re-ingest on every document change

---

## When to Migrate to RDS pgvector (Phase B)

**Trigger any ONE of these:**

| Signal | Threshold | Why |
|--------|-----------|-----|
| Chunk count | > 500 chunks | Memory pressure on Lambda |
| Embeddings file size | > 20MB | Cold start latency increases |
| Cold start latency | > 3 seconds | User experience degrades |
| Need metadata filtering | Any | S3 store doesn't support `WHERE source = 'resume'` |
| Need incremental updates | Any | S3 store does full replace on every ingest |
| Multiple data sources | > 5 sources | Want to query/filter by source |

**How to check current state:**
```bash
# Check embeddings file size
aws s3api head-object \
  --bucket $EMBEDDINGS_S3_BUCKET \
  --key chat/embeddings.json \
  --query 'ContentLength' --output text

# Check chunk count
aws s3 cp s3://$EMBEDDINGS_S3_BUCKET/chat/embeddings.json - | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Chunks: {data[\"count\"]}')
print(f'File size: {sys.getsizeof(json.dumps(data)) / 1024 / 1024:.1f} MB')
"
```

---

## Migration Steps (S3 → RDS pgvector)

### 1. Provision RDS PostgreSQL

**Option A: RDS PostgreSQL micro (cheapest, ~$15/mo)**
```bash
aws rds create-db-instance \
  --db-instance-identifier eribertolopez-chat-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.4 \
  --master-username chatadmin \
  --manage-master-user-password \
  --allocated-storage 20 \
  --publicly-accessible \
  --region us-east-1
```

**Option B: Aurora Serverless v2 (scales, ~$50-100/mo)**
- Use CDK — the `infrastructure/lib/database.ts` stack already exists
- Configure minimum 0.5 ACU

### 2. Enable pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Update environment variables

```bash
# In Lambda environment or .env
VECTOR_STORE_PROVIDER=aurora
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=eribertolopez
DB_USER=chatadmin
DB_PASSWORD=<from-secrets-manager>
DB_SSL=true
```

### 4. Run the Aurora schema setup

The `AuroraVectorStore` auto-creates the table on first use via `ensureSchema()`, or manually:

```sql
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1024)  -- 1024 for Bedrock Titan v2
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 5. Re-run ingestion

```bash
# Trigger via GitHub Actions or locally
VECTOR_STORE_PROVIDER=aurora npx tsx scripts/ingest.ts
```

### 6. Update CDK stack

Add VPC placement + security group to the Lambda so it can reach RDS. The `chat-api-stack.ts` already has the VPC props — just uncomment and wire them.

### 7. Verify and cut over

```bash
# Test the /health endpoint
curl https://your-api-gw-url/health

# Test a chat query
curl -X POST https://your-api-gw-url/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are Eriberto skills?"}'
```

### 8. Decommission S3 store

Once verified, you can delete the embeddings S3 bucket or keep it as a backup.

---

## Cost Comparison

| Phase | Monthly Cost | What You Get |
|-------|-------------|-------------|
| **A: S3 In-Memory** | ~$0 | Good for < 500 chunks |
| **B: RDS micro** | ~$15/mo | Good for < 100K chunks, metadata filtering |
| **B: Aurora Serverless** | ~$50-100/mo | Auto-scaling, good for production workloads |

---

## No Code Changes Required

The vector store uses the Strategy pattern. Switching providers is an env var change:

```
VECTOR_STORE_PROVIDER=s3       → S3MemoryVectorStore
VECTOR_STORE_PROVIDER=aurora   → AuroraVectorStore (pgvector)
VECTOR_STORE_PROVIDER=supabase → SupabaseVectorStore
```

The Lambda handler, RAG pipeline, chat UI, and ingest script are all provider-agnostic.

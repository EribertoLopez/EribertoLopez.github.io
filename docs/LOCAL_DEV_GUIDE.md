# Local Development Guide — AWS Stack with LocalStack

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- AWS CLI v2 (optional, for `awslocal` wrapper)
- [LocalStack CLI](https://docs.localstack.cloud/getting-started/installation/) (optional but recommended)

## Quick Start

```bash
# 1. Start LocalStack + PostgreSQL
./scripts/localstack-setup.sh up

# 2. Set environment
cp .env.example .env.local
# Add: USE_LOCALSTACK=true

# 3. Install dependencies
npm install

# 4. Run the dev server
npm run dev
```

## Environment Variables

| Variable | Local Value | Description |
|----------|------------|-------------|
| `USE_LOCALSTACK` | `true` | Routes AWS SDK calls to LocalStack |
| `LOCALSTACK_ENDPOINT` | `http://localhost:4566` | LocalStack endpoint (default) |
| `AWS_REGION` | `us-east-1` | AWS region |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `chatdev` | PostgreSQL user |
| `DB_PASSWORD` | `localdev123` | PostgreSQL password |
| `DB_NAME` | `portfolio_chat` | PostgreSQL database |

## What's Running

| Service | URL | Purpose |
|---------|-----|---------|
| LocalStack | `http://localhost:4566` | S3, Lambda, API Gateway, DynamoDB, SQS, SSM, Secrets Manager |
| PostgreSQL + pgvector | `localhost:5432` | Vector store (mirrors RDS Phase 6) |

## Using AWS CLI with LocalStack

```bash
# Option 1: awslocal wrapper (if localstack CLI installed)
awslocal s3 ls
awslocal dynamodb list-tables

# Option 2: AWS CLI with --endpoint-url
aws --endpoint-url=http://localhost:4566 s3 ls
```

## Testing CDK Stacks Locally

```bash
cd infra
USE_LOCALSTACK=true npx cdklocal bootstrap
USE_LOCALSTACK=true npx cdklocal deploy --all
```

## Services Setup

The init script (`localstack/init/01-setup-resources.sh`) automatically creates:
- S3 bucket: `eribertolopez-site`
- SSM parameters: `/chat-api/url`, `/chat-api/allowed-origins`
- Secrets Manager: `portfolio-chat/db-credentials`
- DynamoDB table: `chat-rate-limits`
- SQS queue: `ingestion-queue`

PostgreSQL init (`localstack/init-db/01-init-pgvector.sql`) creates:
- `vector` extension
- `documents` table with embedding column
- HNSW index for similarity search

## Lifecycle

```bash
./scripts/localstack-setup.sh up      # Start
./scripts/localstack-setup.sh status   # Check health
./scripts/localstack-setup.sh logs     # View logs
./scripts/localstack-setup.sh down     # Stop (preserves data)
./scripts/localstack-setup.sh clean    # Stop + delete all data
```

## Limitations

- **Bedrock is not emulated** — LocalStack community edition doesn't support Bedrock. For local chat/embedding testing, use Ollama providers (already configured in `lib/embeddings/ollama.ts` and `lib/chat/ollama.ts`).
- **CloudFront** — Stubbed only. Test S3 serving directly.
- **Lambda** — Requires Docker-in-Docker. Works with `LAMBDA_EXECUTOR=docker-reuse`.

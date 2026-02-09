# PR Review Notes — AWS Migration (PRs #33-38)

## Overall Assessment

The migration plan is well-structured with clear phase separation. The code is mostly stubs/TODOs which is appropriate for draft PRs establishing the architecture. Below are findings per PR.

---

## PR #33 — Phase 1: AWS Foundation (feature/aws-foundation)

**Strengths:**
- ✅ S3 encryption and BlockPublicAccess configured correctly
- ✅ Security headers policy is comprehensive (HSTS, X-Frame-Options, XSS Protection)
- ✅ Bucket versioning enabled with RETAIN removal policy

**Concerns:**
- ⚠️ **Missing ACM + CloudFront distribution** — The core of Phase 1 is still TODO. Without the distribution, this stack doesn't serve content.
- ⚠️ **No OIDC role implementation** — Critical for CI/CD (Phase 5 depends on this). Should be completed before moving to later phases.
- 💡 **Suggestion:** Add `cdk-nag` for automated CDK security checks. Add it to `infra/package.json`.

---

## PR #34 — Phase 2: Chat API (feature/aws-chat-api)

**Strengths:**
- ✅ Input validation with length limits and type checking
- ✅ CORS origin allowlist (not wildcard)
- ✅ Scoped IAM — Bedrock permissions locked to specific model ARNs
- ✅ Error handling maps known errors to 400, unknowns to 500

**Concerns:**
- ⚠️ **No request ID / correlation ID** — Add `event.requestContext.requestId` to error logs for traceability.
- ⚠️ **ALLOWED_ORIGINS from env var is fragile** — Empty string splits to `[""]`, which would allow empty origin. Fixed with `.filter(Boolean)` ✅ but should also handle undefined origin (reject, not allow first origin).
- ⚠️ **No rate limiting at Lambda level** — The TODO mentions API Gateway throttling (100 burst, 50 sustained) but there's no per-IP/per-user rate limiting. Consider DynamoDB-backed rate limiting.
- 💡 **Suggestion:** Add `X-Request-Id` response header. Add structured JSON logging (not just `console.error`).

---

## PR #35 — Phase 3: Bedrock Providers (feature/bedrock-providers)

**Strengths:**
- ✅ Clean provider interfaces (`EmbeddingProvider`, `ChatProvider`)
- ✅ Streaming support via `AsyncGenerator<string>`
- ✅ Provider abstraction enables Ollama (local) ↔ Bedrock (prod) swapping

**Concerns:**
- ⚠️ **No retry/backoff in interfaces** — The commit message mentions "retry" but the types don't enforce it. Add `RetryConfig` to `ChatOptions`.
- ⚠️ **No error types** — Provider errors should be typed (e.g., `ThrottlingError`, `ModelNotAvailableError`) for proper upstream handling.
- ⚠️ **Missing concrete Bedrock implementation** — `lib/embeddings/bedrock.ts` and `lib/chat/bedrock.ts` exist but were not modified in this PR. The provider interfaces should be implemented there.
- 💡 **Suggestion:** Add a `ProviderFactory` that reads `CHAT_PROVIDER` / `EMBEDDING_PROVIDER` env vars and returns the correct implementation.

---

## PR #36 — Phase 4: Codebase Migration (feature/aws-codebase-migration)

**Strengths:**
- ✅ Tracking document for migration changes

**Concerns:**
- ⚠️ **No actual code changes** — This PR only has a docs commit. The Next.js static export config, environment variable migration, and API endpoint changes are still needed.
- 💡 **Suggestion:** Should include `next.config.js` changes for `output: 'export'`, removal of server-side API routes in favor of Lambda, and `NEXT_PUBLIC_CHAT_API_URL` wiring.

---

## PR #37 — Phase 5: CI/CD (feature/aws-cicd)

**Strengths:**
- ✅ Concurrency groups prevent parallel deploys
- ✅ Environment protection on production jobs
- ✅ Separate workflows per concern (infra, site, API, ingestion)
- ✅ Path-based triggers (only deploy what changed)
- ✅ Smoke test patterns included (commented)

**Concerns:**
- ⚠️ **No actual AWS credentials configuration** — All OIDC steps are commented out. Depends on Phase 1 OIDC role.
- ⚠️ **deploy-site doesn't trigger on config changes** — `next.config.*` is included but `tsconfig.json` and `.env*` are not.
- ⚠️ **No rollback strategy** — If smoke test fails, there's no automatic rollback (re-deploy previous S3 content, revert Lambda).
- 💡 **Suggestion:** Add a `test` job before deploy (lint, type-check, unit tests). Add `workflow_dispatch` to all workflows for manual triggers.

---

## PR #38 — Phase 6: RDS PostgreSQL + pgvector (feature/rds-pgvector)

**Strengths:**
- ✅ RDS Proxy for Lambda connection pooling (critical for db.t4g.micro)
- ✅ IAM auth preferred over password auth
- ✅ SSL enforcement via parameter group
- ✅ VPC endpoints instead of NAT Gateway ($32/mo savings)
- ✅ Cost warning in comments

**Concerns:**
- ⚠️ **All implementation is TODO** — VPC, security groups, RDS instance, proxy, endpoints are all stubs.
- ⚠️ **RdsVectorStore has no parameterized queries yet** — Comment mentions preventing SQL injection but implementation is missing.
- ⚠️ **No migration strategy** — How to migrate data from Supabase to RDS? Need a migration script.
- ⚠️ **No connection error handling** — Pool exhaustion, connection timeouts, retry on transient failures.
- 💡 **Suggestion:** Add a health check method to `RdsVectorStore`. Consider using `pg-pool` events for monitoring.

---

## Cross-Cutting Concerns

1. **No unit tests anywhere** — Every PR should include at least basic tests for the code it adds.
2. **No shared error handling pattern** — Each phase handles errors differently. Create `lib/errors.ts` with typed error classes (already exists but not used in new code).
3. **Environment variable validation** — No startup validation that required env vars are set. App will fail at runtime with cryptic errors.
4. **LocalStack integration added** ✅ — `lib/aws-config.ts` provides `USE_LOCALSTACK` toggle, `docker-compose.localstack.yml` runs full local stack.

---

## Recommended Priority

1. Complete Phase 1 (CloudFront distribution + OIDC role) — everything depends on it
2. Add unit tests to Phases 2 & 3 (Lambda handler + providers)
3. Implement Phase 4 code changes (static export)
4. Wire up Phase 5 workflows once OIDC role exists
5. Phase 6 is optional — Supabase free tier works fine for a portfolio site

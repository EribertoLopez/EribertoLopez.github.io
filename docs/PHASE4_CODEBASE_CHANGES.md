# Phase 4: Codebase Changes

> Tracking document for codebase modifications needed to support AWS deployment.
> See docs/AWS_MIGRATION_PLAN.md "Phase 4" for full details.

## Required Changes

### 1. Next.js Static Export Configuration
- [ ] Set `output: "export"` in next.config.js
- [ ] Remove any server-side API routes (moved to Lambda)
- [ ] Ensure all pages work with static export
- [ ] Configure `trailingSlash: true` for S3 compatibility

### 2. ChatWidget URL Configuration
- [ ] Replace hardcoded localhost API URL with environment variable
- [ ] Use `NEXT_PUBLIC_CHAT_API_URL` for the API Gateway endpoint
- [ ] Update fetch calls to use the configured URL
- [ ] Add CORS headers handling on client side

### 3. Environment Variable Cleanup
- [ ] Remove Vercel-specific env vars
- [ ] Remove OpenAI/Anthropic API key references
- [ ] Add AWS-specific env vars to `.env.example`
- [ ] Document all required env vars

### 4. Provider Abstraction
- [ ] Create provider interface for embeddings
- [ ] Create provider interface for chat LLM
- [ ] Implement Bedrock providers (Phase 3)
- [ ] Keep Ollama providers for local dev

### 5. Build Pipeline Updates
- [ ] Update build script for static export
- [ ] Add API URL injection at build time
- [ ] Test static export locally before deploying

## Risks
- Static export may break dynamic routes — audit all pages
- Chat widget must handle API latency (Lambda cold starts ~1-2s)
- CORS misconfiguration will silently break chat

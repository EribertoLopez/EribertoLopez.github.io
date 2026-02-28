# RAG Quality Improvement Spike

**Date:** 2026-02-27
**Status:** Complete
**Author:** Pod Lead (Surfside)

## Current State

The chat widget works E2E (widget → API Gateway → Lambda → Bedrock), but response quality is poor. Two root causes:

### Problem 1: Garbage In, Garbage Out (Content Quality)
The ingest pipeline processes **all 54 markdown files** from `frontend/content/`, including:
- **24 resume versions** (many outdated, one is pure Lorem Ipsum placeholder)
- **21 cover letters** (job-specific, not useful for general portfolio chat)
- **6 blog posts** (some are Next.js boilerplate: "hello world", "dynamic routing", "markdown preview")
- **3 project pages** (some duplicated)

The vector store is polluted with redundant, outdated, and irrelevant chunks. When a visitor asks "What does Eriberto do?", retrieval may surface Lorem Ipsum or a 2021 cover letter instead of his current Lead Engineer role.

**This is the #1 issue.** No amount of retrieval tuning fixes bad source data.

### Problem 2: Chunking Strategy
Current: fixed 800-char chunks with 200-char overlap, boundary-aware (breaks at `\n\n`, `. `, `\n`).

Issues:
- **No section awareness** — a resume chunk might start mid-bullet-point, losing the section header ("Experience" vs "Skills" vs "Education")
- **Metadata is minimal** — only `sourceType` and `title` are attached. No section name, date range, or company
- **All resume versions are ingested** — 24 files × ~5 chunks = ~120 resume chunks competing in retrieval, most outdated

### Problem 3: Retrieval (Cosine Similarity Only)
- No re-ranking — top-K cosine results go straight to the prompt
- No score threshold — low-relevance chunks still get included
- TOP_K=5 is fixed — some queries need more context, some less
- No query expansion — "What's Eriberto's background?" won't match specific skill keywords

---

## Investigation Findings

### 1. Content Curation (Effort: S — highest impact)

**Recommendation: Curate a single source-of-truth content set.**

Instead of ingesting every markdown file, create a curated `content/_chat/` directory with:
- **One current resume** (latest: `eriberto-lopez-resume-01-25-26.md`)
- **A skills/expertise summary** (hand-written or LLM-generated from resume)
- **Selected project descriptions** (real projects only, no duplicates)
- **A personal bio/about page** (if one exists)

Exclude: old resume versions, cover letters, boilerplate blog posts, Lorem Ipsum files.

Alternative: Add an `ingestable: true` frontmatter flag and filter in the ingest script.

### 2. Section-Aware Chunking (Effort: M)

**Recommendation: Split by markdown headers first, then by size.**

Replace the current `chunkText()` with a two-pass approach:
1. Split on `## Header` boundaries (each section becomes a candidate chunk)
2. If a section exceeds 800 chars, sub-chunk with overlap
3. Prepend section context to each chunk: `[Resume > Experience > Lead Engineer at HSF]`

This preserves semantic boundaries. A chunk about "Fund-A-Scholar" will carry its parent context ("Lead Engineer at Hispanic Scholarship Fund").

```typescript
function chunkMarkdown(text: string, metadata: Record<string, string>): Chunk[] {
  const sections = text.split(/(?=^##\s)/m);
  const chunks: Chunk[] = [];
  let currentHeader = metadata.title || 'Document';

  for (const section of sections) {
    const headerMatch = section.match(/^##\s+(.+)/);
    if (headerMatch) currentHeader = headerMatch[1];

    if (section.length <= 800) {
      chunks.push({ text: `[${currentHeader}] ${section}`, header: currentHeader });
    } else {
      // Sub-chunk large sections with overlap
      for (const sub of chunkText(section, 800, 200)) {
        chunks.push({ text: `[${currentHeader}] ${sub}`, header: currentHeader });
      }
    }
  }
  return chunks;
}
```

### 3. Bedrock Reranking (Effort: M)

**Recommendation: Add Bedrock Rerank API call after initial retrieval.**

AWS Bedrock now offers a native [Rerank API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Rerank.html). Flow becomes:

1. Embed query → cosine search → top 15 candidates (over-retrieve)
2. Call `Rerank` with query + 15 candidates → get relevance-scored results
3. Take top 5 reranked results → build system prompt

This is the single biggest retrieval quality improvement. Cosine similarity is a blunt instrument — reranking uses a cross-encoder model that considers query-document interaction, catching semantic matches that embedding similarity misses.

```typescript
import { BedrockAgentRuntimeClient, RerankCommand } from "@aws-sdk/client-bedrock-agent-runtime";

async function rerankResults(query: string, docs: {text: string, score: number}[]) {
  const client = new BedrockAgentRuntimeClient({ region: REGION });
  const resp = await client.send(new RerankCommand({
    queries: [{ type: "TEXT", textQuery: { text: query } }],
    sources: docs.map(d => ({
      type: "INLINE",
      inlineDocumentSource: {
        type: "TEXT",
        textDocument: { text: d.text }
      }
    })),
    rerankingConfiguration: {
      type: "BEDROCK_RERANKING_MODEL",
      bedrockRerankingConfiguration: {
        modelConfiguration: { modelArn: "arn:aws:bedrock:us-east-1::foundation-model/amazon.rerank-v1:0" }
      }
    }
  }));
  return resp.results; // sorted by relevance score
}
```

**Considerations:**
- Adds ~200-400ms latency per query
- Additional Bedrock cost (check pricing)
- Requires `bedrock:InvokeModel` permission for the reranker model + `@aws-sdk/client-bedrock-agent-runtime` dependency

### 4. Score Threshold & Dynamic TOP_K (Effort: S)

**Recommendation: Add minimum similarity threshold and cap at score drop-off.**

```typescript
const MIN_SCORE = 0.3;
const MAX_DROP = 0.15; // stop if score drops more than 15% from previous

function filterResults(results: {score: number}[]) {
  const filtered = [];
  for (const r of results) {
    if (r.score < MIN_SCORE) break;
    if (filtered.length > 0 && (filtered[filtered.length-1].score - r.score) > MAX_DROP) break;
    filtered.push(r);
  }
  return filtered.slice(0, 8); // hard cap
}
```

### 5. Query Expansion (Effort: S-M)

**Recommendation: Defer.** For a portfolio site with <100 chunks, query expansion adds complexity without meaningful improvement. The reranker handles semantic mismatch better.

If needed later: use Claude to rephrase the query before embedding ("What technologies does Eriberto know?" → also embed "programming languages skills tools frameworks").

### 6. Bedrock Knowledge Bases (Effort: L — NOT recommended now)

Bedrock Knowledge Bases is a managed RAG service (S3 data source → automatic chunking → managed vector store → retrieval API). It handles chunking, embedding, and retrieval automatically.

**Why not now:**
- Introduces managed infrastructure we don't control (managed OpenSearch Serverless or Pinecone)
- Our S3 in-memory approach works fine for <100 chunks
- We lose the learning/customization value of building it ourselves
- Monthly cost for OpenSearch Serverless (~$700/mo minimum) is absurd for this use case

**When to reconsider:** If we hit >500 chunks or need multi-modal retrieval.

---

## Top 3 Recommendations (Priority Order)

| # | Change | Effort | Impact | Latency | Cost |
|---|--------|--------|--------|---------|------|
| 1 | **Curate content set** — ingest only latest resume + real projects, exclude old/placeholder files | S (1-2h) | 🔴 Critical | None | $0 |
| 2 | **Section-aware chunking** — split on `##` headers, prepend section context | M (3-4h) | 🟠 High | None | $0 |
| 3 | **Bedrock reranking** — over-retrieve 15, rerank to top 5 | M (3-4h) | 🟠 High | +200-400ms | ~$0.01/query |

**Bonus (quick wins):**
- Add score threshold (MIN_SCORE=0.3) — S (30min)
- Improve system prompt with persona context — S (30min)

### Implementation Order
1. Content curation first (fixes the root cause)
2. Section-aware chunking (better chunks = better retrieval)
3. Re-ingest with improved pipeline
4. Test and measure baseline quality
5. Add reranking if quality still insufficient

---

## Appendix: Current Ingest Stats
- **Files ingested:** 54 (all markdown in `frontend/content/`)
- **Chunks stored:** 54 (in S3 `chat/embeddings.json`, 940KB)
- **Chunk size:** 800 chars with 200 overlap
- **Embedding model:** Titan Embed Text v2 (1024 dimensions)
- **LLM:** Claude 3 Haiku via Bedrock
- **Vector search:** Cosine similarity, TOP_K=5, no threshold

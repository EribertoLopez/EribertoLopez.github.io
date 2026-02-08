# AI Chat API Reference

## POST `/api/chat`

RAG-powered chat endpoint. Embeds the user query, retrieves relevant document chunks from Supabase, and generates a response via Claude.

### Request

```json
{
  "message": "What is Eriberto's experience with Python?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ],
  "stream": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | ✅ | User's message. Max 2000 chars (configurable via `CHAT_MAX_MESSAGE_LENGTH`). |
| `history` | `ChatMessage[]` | No | Conversation history. Max 50 messages (configurable via `CHAT_MAX_HISTORY`). Default: `[]` |
| `stream` | `boolean` | No | Enable SSE streaming. Default: `false` |

### Non-Streaming Response (200)

```json
{
  "response": "Eriberto has extensive experience with Python, including...",
  "remaining": 8
}
```

| Field | Type | Description |
|-------|------|-------------|
| `response` | `string` | AI-generated answer |
| `remaining` | `number` | Remaining requests in rate limit window |

### Streaming Response (200)

When `stream: true`, returns `text/event-stream`:

```
data: {"text":"Eriberto"}

data: {"text":" has"}

data: {"text":" extensive"}

data: [DONE]
```

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "Message is required and must be a string" }` | Missing/invalid message |
| `400` | `{ "error": "Message too long (max 2000 chars)" }` | Exceeds max length |
| `400` | `{ "error": "History must be an array" }` | Invalid history format |
| `400` | `{ "error": "Conversation too long (max 50 messages)" }` | Too many history messages |
| `405` | `{ "error": "Method not allowed" }` | Non-POST request |
| `429` | `{ "error": "Too many requests...", "retryAfterMs": 60000 }` | Rate limited |
| `503` | `{ "error": "<ChatError message>" }` | Embedding/vector/AI service failure |
| `500` | `{ "error": "Failed to generate response" }` | Unexpected error |

### Rate Limiting

- **Window:** 60 seconds (configurable via `RATE_LIMIT_WINDOW_MS`)
- **Max requests:** 10 per window per IP (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Implementation:** In-memory sliding window (`lib/rateLimit.ts`). Resets on server restart.
- **IP detection:** `X-Forwarded-For` header (Vercel proxy), falls back to `req.socket.remoteAddress`

---

## GET `/api/health`

Health check endpoint. No authentication required.

### Response (200 or 503)

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "anthropicKey": "configured",
  "supabaseUrl": "configured",
  "embeddingProvider": "openai"
}
```

Returns `200` when both `anthropicKey` and `supabaseUrl` are `"configured"`. Returns `503` if either is `"missing"`.

---

## Authentication

**None.** The API is public. Protection is via:
- Rate limiting (IP-based)
- Input validation (length limits)
- Prompt injection mitigation (sandboxed context in `<RETRIEVED_DOCUMENTS>` tags)

---

## Example curl Commands

```bash
# Non-streaming chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are Eriberto'\''s skills?"}'

# Streaming chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about his projects", "stream": true}'

# With conversation history
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you elaborate?",
    "history": [
      {"role": "user", "content": "What does Eriberto do?"},
      {"role": "assistant", "content": "He is a software engineer..."}
    ]
  }'

# Health check
curl http://localhost:3000/api/health
```

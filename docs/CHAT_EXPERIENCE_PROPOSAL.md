# 💬 Chat Experience Proposal

> Let recruiters have a conversation with your experience

## The Vision

Instead of a static resume, recruiters can ask questions like:
- "What's your experience with distributed systems?"
- "Tell me about a time you led a team through a difficult project"
- "What tech stack are you most comfortable with?"

The AI responds based on your actual experiences, projects, and career history.

---

## Architecture Options

### Option A: Context-Stuffed Claude (Recommended for MVP)

**How it works:**
- Your resume, projects, and experiences are compiled into a structured document
- Each chat message sends this context + conversation history to Claude
- Claude responds as "you" based on the context

**Pros:**
- Simple to implement
- No vector DB needed
- Your experience data is small enough to fit in context
- Fast responses

**Cons:**
- Uses more tokens per request
- Limited to ~100k tokens of context

**Tech Stack:**
```
Next.js + Vercel AI SDK + Claude API
```

**Cost Estimate:** ~$0.01-0.05 per conversation (depending on length)

---

### Option B: RAG (Retrieval-Augmented Generation)

**How it works:**
- Embed your experiences into vectors
- On each question, retrieve relevant chunks
- Send only relevant context to Claude

**Pros:**
- More efficient token usage
- Scales to larger knowledge bases
- Can add blog posts, projects, etc.

**Cons:**
- More complex setup
- Needs vector DB (Pinecone, Supabase, etc.)
- Retrieval quality affects responses

**Tech Stack:**
```
Next.js + LangChain/LlamaIndex + Embeddings + Vector DB + Claude
```

---

### Option C: Hybrid (Best of Both)

**How it works:**
- Core resume/bio always in context
- RAG for detailed project stories and blog posts
- Graceful fallback for out-of-scope questions

**This is the long-term play** but overkill for MVP.

---

## Recommended MVP Approach

### Phase 1: Data Preparation
Create a structured knowledge base:

```
/data
  /experiences
    hsf.md           # HSF role, projects, achievements
    strateos.md      # Strateos experience
    research.md      # DARPA/UT research
  /projects
    recipe-automation.md
    internal-tools.md
    autoprotocol.md
  /meta
    bio.md           # Personal info, interests
    skills.md        # Technical skills, tools
    goals.md         # What you're looking for
```

### Phase 2: Chat API
Create an API route that:
1. Loads all experience data as context
2. Adds system prompt defining personality/boundaries
3. Handles conversation history
4. Returns Claude's response

```typescript
// pages/api/chat.ts
import Anthropic from '@anthropic-ai/sdk';

const experienceContext = loadExperiences(); // Your structured data

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: `You are Eri Lopez's portfolio assistant. Answer questions about 
             Eri's experience, skills, and projects based on the following context.
             Be helpful, professional, and conversational.
             
             ${experienceContext}`,
    messages,
  });
  
  return response;
}
```

### Phase 3: Chat UI
Simple chat interface on the portfolio:
- Floating chat button or dedicated /chat page
- Clean, professional design
- Suggested questions to get started
- Mobile-friendly

---

## System Prompt Design

Critical for good experience:

```
You are an AI assistant representing Eri Lopez's professional portfolio.

PERSONALITY:
- Professional but personable
- Confident about experiences, honest about limitations
- Enthusiastic about technical topics

BOUNDARIES:
- Only discuss information in the provided context
- For personal questions (salary expectations, availability), 
  suggest reaching out directly
- Don't make up experiences or projects

SUGGESTED BEHAVIORS:
- Offer to elaborate on interesting projects
- Connect experiences to the recruiter's potential needs
- Highlight relevant skills when answering

CONTEXT:
[Your experiences, projects, skills loaded here]
```

---

## Hosting Considerations

**Current:** GitHub Pages (static only)

**Options:**
1. **Migrate to Vercel** — Free tier, API routes work out of box
2. **Separate API** — Keep static site, deploy API to Vercel/Railway
3. **Edge Functions** — Cloudflare Workers, but more complex

**Recommendation:** Migrate to Vercel. It's free for this scale and deploys from the same repo.

---

## Security Considerations

- [ ] Rate limiting to prevent abuse
- [ ] API key stored in environment variables (never client-side)
- [ ] Optional: require email capture before chat
- [ ] Content moderation (Claude has built-in safety)
- [ ] Logging for analytics (what do recruiters ask?)

---

## Implementation Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Structure experience data | 2-3 hours |
| 2 | Set up Vercel + API route | 1-2 hours |
| 3 | Build chat UI component | 2-3 hours |
| 4 | System prompt tuning | 1 hour |
| 5 | Testing + polish | 2 hours |

**Total: ~10-12 hours** for MVP

---

## Open Questions

1. **Scope:** Just resume, or include blog posts and projects too?
2. **Personality:** How casual vs. formal should the AI be?
3. **Lead capture:** Require email before chatting?
4. **Analytics:** Track what recruiters ask about most?
5. **Fallback:** What happens for off-topic questions?

---

## Example Interactions

**Recruiter:** "What's your experience with React?"

**AI:** "I've been working with React for about 5 years now. At HSF, I built the internal tools platform entirely in React with Next.js — it handles scholarship application processing and student tracking. Before that at Strateos, I worked on React components for the lab automation dashboard. I'm also comfortable with the broader ecosystem: TypeScript, Tailwind, state management with Zustand or Redux. Want me to go deeper on any specific project?"

---

**Recruiter:** "Tell me about a challenging project you led"

**AI:** "At Hispanic Scholarship Fund, I led the engineering team through building our internal tools platform from scratch. The challenge was that we had zero engineering infrastructure when I joined — no CI/CD, no code review process, no established patterns.

I had to simultaneously build the product, establish engineering practices, and mentor junior developers. We shipped the platform in about 6 months, and it now handles thousands of scholarship applications annually.

The key lesson was balancing speed with sustainability — we couldn't afford to accumulate tech debt, but we also had real deadlines. Would you like to hear more about the technical architecture or the team dynamics?"

---

## Next Steps

1. **Discuss:** Does this approach make sense?
2. **Decide:** MVP scope (what experiences to include)
3. **Build:** Start with data structuring
4. **Deploy:** Set up Vercel
5. **Iterate:** Tune based on real usage

---

*Proposal by Coral 🪸 | 2026-02-07*

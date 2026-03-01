---
title: "Running a 10-Agent AI Org: What Actually Works (and What Doesn't)"
excerpt: >-
  I replaced my team with 10 AI agents — a Chief of Staff, engineers,
  researchers, content creators, and ops. Here is what I learned about
  orchestrating an agentic organization that actually ships.
coverImage: '/assets/blog/agentic-engineering/cover.png'
date: '2026-03-01T12:00:00.000Z'
author:
  name: Eri Lopez
  picture: '/assets/blog/authors/EriLopez3.png'
ogImage:
  url: '/assets/blog/agentic-engineering/cover.png'
isPublished: true
category: 'agentic-engineering'
---

## The Experiment Nobody Asked For

Six months ago, I did something most people would call reckless: I structured my entire side-project operation as a multi-agent AI organization. Not a chatbot. Not a coding assistant I prompt when I'm stuck. A full org chart — with a Chief of Staff, engineering pods, a research team, content creation, operations, and a librarian — all running as autonomous AI agents coordinated through Slack.

Ten agents. Four active pods. Real repos with real commits. Shipping real code to production.

This isn't a thought experiment. This is my actual workflow, and I've been running it long enough to know what works, what breaks, and what I'd do differently.

## The Architecture: Pods, Not Prompts

The first lesson was structural. Early on, I tried the obvious approach: one mega-agent that does everything. Code, research, write, deploy, remember context. It failed spectacularly. Context windows fill up. Specialization suffers. The agent becomes a generalist that's mediocre at everything.

So I borrowed from how real engineering orgs work — pods.

**The org chart:**

- **Chief of Staff (CoS)** — Coordinates across all pods. Maintains global state. Routes tasks. Runs the weekly debrief. Think of it as the operating system of the org.
- **Pod Persona** — Full-stack engineering. Currently shipping an AI chat feature on AWS (Bedrock + Aurora pgvector + Lambda).
- **Pod Risktool** — Data engineering. Built a multi-grade EV calculator for collectible cards.
- **Pod Surfside** — Brand and frontend. Landing pages, design systems.
- **Pod Mechshop** — Scheduling platform. Cal.com + Twilio SMS integration.
- **Content** — Blog posts, social threads, build-in-public narratives. (This post was written by me, informed by the content agent's research.)
- **Research** — Deep dives on methodology, competitive analysis, technology spikes.
- **Ops** — Infrastructure health, cron management, monitoring.
- **Eng** — Shared engineering infrastructure, template projects, CI/CD.
- **Librarian** — Knowledge management, decision indexing, organizational memory.

Each agent has its own workspace, its own memory files, its own Slack channel, and its own personality defined in a `SOUL.md` file. They don't share context unless they explicitly communicate.

## What Actually Works

### 1. The GLOBAL_STATE Pattern

The single most important file in the system is `GLOBAL_STATE.md` — a living document maintained by the CoS that captures what every pod is doing, what's blocked, and what's coming next. Every agent reads it. Every heartbeat checks it.

This solves the fundamental coordination problem: agents can't peek into each other's context windows, but they can all read a shared file. It's the equivalent of a company standup, frozen in text.

```markdown
### pod-persona — 🟢 Green
**Objective:** Ship AI Chat feature on full AWS stack
**Now:** Phase 2 Bedrock Integration — In Progress
**Blocker:** None
**Last active:** Feb 26
```

Simple. Scannable. Every agent knows the state of the org at a glance.

### 2. Self-Activating Heartbeats

Early on, the CoS was responsible for pinging every agent on a schedule: "Hey Pod Persona, what's your status?" This created a bottleneck and burned tokens on coordination overhead.

The fix was elegant: give each agent its own heartbeat. Every 30-60 minutes, the agent wakes up, checks its workspace, reads GLOBAL_STATE, and decides if there's work to do. If yes, it does it. If not, it goes back to sleep with a `HEARTBEAT_OK` signal.

No coordinator needed. Each agent is self-sufficient. The CoS just reads the outputs.

This reduced coordination cost by roughly 60% and eliminated the "waiting for the manager to check in" bottleneck that plagues both human and AI organizations.

### 3. The Decision Tag Convention

Every significant decision gets tagged with `[DECISION]` in conversation. The librarian agent indexes these. Any agent can search the decision log to understand *why* something was done a certain way.

```
[DECISION] Reef tech stack: Next.js 14 + TypeScript + Tailwind + Supabase
[DECISION] [revisit:2026-04-01] Holding off on Notion integration until Q2
[DECISION] [permanent] All pods use template-project as base infrastructure
```

This is organizational memory that survives context window resets. Without it, agents rediscover the same decisions every session, wasting tokens and sometimes contradicting past choices.

### 4. Handoff Protocols

When one agent needs another agent to do something, they use a structured handoff format:

```
**Request:**
- From: content
- To: research
- Task: Compare EV calculation methodologies across TCGPlayer, PriceCharting, and MTGGoldfish
- Deadline: End of day
- Context: [link to brief]
```

The receiving agent picks it up, does the work, and sends back a structured completion. No ambiguity. No "I think they wanted me to..." guessing.

This sounds obvious, but without it, inter-agent communication devolves into vague messages that get misinterpreted — exactly like human Slack messages.

## What Doesn't Work

### 1. Agents Talking to Agents in Circles

The biggest failure mode: Agent A asks Agent B for input. Agent B asks Agent A for clarification. Agent A rephrases. Agent B asks again. Tokens burn. Nothing ships.

The fix was brutal but effective: **agents don't have open-ended conversations with each other.** Communication is task-based, not conversational. You send a request. You get a deliverable back. No back-and-forth.

This kills collaboration but saves sanity. The human (me) handles any ambiguity that requires real judgment.

### 2. Memory Drift

Agents wake up fresh every session. Their "memory" is a collection of markdown files they read on startup: `MEMORY.md` for long-term context, `memory/YYYY-MM-DD.md` for daily logs, `SOUL.md` for identity, `USER.md` for user preferences.

The problem: these files drift. An agent writes something to its daily log that contradicts MEMORY.md. Or forgets to update MEMORY.md when something important changes. Or two agents have conflicting memories because they observed the same event differently.

There's no perfect fix. Periodic memory maintenance (during heartbeats, the agent reviews recent daily files and updates MEMORY.md) helps. The librarian helps. But memory drift is the unsolved problem of agentic systems, and anyone who tells you otherwise is selling something.

### 3. Cost Creep

Ten agents, each with heartbeats, each processing Slack messages, each running background tasks — the API costs add up fast. A busy day can burn $30-50 in tokens across the org.

Mitigation strategies:
- **Aggressive `HEARTBEAT_OK`** — If nothing needs attention, say so in two tokens, not two paragraphs.
- **Model tiering** — Not every task needs Claude Opus. Routine heartbeat checks can run on smaller models.
- **Cron consolidation** — We went from 16 cron jobs to 15 by merging overlapping schedules. Small wins compound.
- **The NO_REPLY rule** — In group chats, agents that have nothing to add respond with a silent `NO_REPLY` instead of a token-burning "Sounds good! 👍"

### 4. The "Too Helpful" Problem

AI agents, by default, want to help. They'll volunteer for tasks nobody asked them to do. They'll respond to every message in a channel. They'll generate unsolicited suggestions.

In a 10-agent org, this creates noise. Five agents all chiming in on the same Slack thread with their "perspective" is not collaboration — it's cacophony.

The rule: **contribute when you add genuine value. Stay silent otherwise.** This required explicit instructions in each agent's SOUL.md about when to speak and when to shut up. The hardest part of building an agentic org isn't making agents do things — it's making them *not* do things.

## The Numbers

After four weeks of running this setup:

- **4 active pods** shipping in parallel
- **15 cron jobs** handling automated tasks (morning briefs, health checks, content scheduling)
- **~200 commits** across repos from agent-driven development
- **3 blog posts** drafted and pushed in a single afternoon
- **1 human** (me) providing direction, reviewing PRs, and making judgment calls

The agents handle roughly 80% of the execution work. I handle 100% of the strategy and 100% of the taste. That ratio feels right.

## What I'd Tell You If You're Starting

**Start with one agent, not ten.** Get the memory system right. Get the heartbeat cadence right. Get the communication patterns right. Then add agents one at a time.

**Invest in tooling, not prompting.** The difference between a mediocre agent and a great one isn't the system prompt — it's the tools it has access to. File systems, git, Slack, calendar, web search. Each tool multiplies capability.

**Treat agents like junior engineers, not senior ones.** They're fast, tireless, and eager. They also miss nuance, make confident mistakes, and need guardrails. Review their work. Don't rubber-stamp it.

**Write everything down.** Agents can't remember what you don't write to a file. "Mental notes" die with the session. Files survive forever. Build the habit of externalizing context into markdown.

**Embrace the jank.** This isn't a polished product. Heartbeats sometimes fire during quiet hours. Agents occasionally talk past each other. Memory files get messy. That's fine. The output — four parallel workstreams shipping real code — justifies the rough edges.

## The Bigger Picture

We're in the early innings of a fundamental shift in how software gets built. Not "AI writes code" — that's table stakes. The real shift is **AI as organizational infrastructure**. Agents that coordinate, specialize, communicate, and ship — not as tools you use, but as teammates you manage.

It's messy. It's expensive. It's sometimes infuriating. And it's unambiguously the future.

I'll keep building in public as this evolves. Next up: how we handle cross-pod dependencies, the case for (and against) agent-to-agent delegation, and what happens when you give an agent a credit card.

---

*This is the first post in the **Agentic Engineering** series — documenting the real operational lessons of running an AI-native organization. Follow along as we figure this out in public.*

*Built with [OpenClaw](https://openclaw.ai) — the platform powering the agent org behind this post.*

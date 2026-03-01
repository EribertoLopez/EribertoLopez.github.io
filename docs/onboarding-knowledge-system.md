# Onboarding: The Self-Improving Knowledge Base System

The knowledge system is a structured `.cursor/` directory that gives AI coding agents project-specific context — conventions, patterns, known issues, and safety rules. When agents understand your project, they produce better code with fewer mistakes. You set it up once, and a CI pipeline keeps it current after every merge to `main`.

---

## Prerequisites

Before you begin, make sure you have:

- A repository with at least a `README.md` and identifiable layer directories (e.g., `backend/`, `frontend/`, `infrastructure/`)
- **Cursor IDE** (or any AI coding tool that supports rules files, such as Claude Code or Copilot Chat)
- Access to the bootstrap prompt document: [`docs/bootstrap-knowledge-system.md`](bootstrap-knowledge-system.md)

> **Info:** The bootstrap document is a single prompt you feed to an AI agent. It contains all the schemas, templates, and instructions needed to generate the full knowledge system.

---

## What You Get — Directory Structure

After bootstrapping, your repo will contain the following structure:

```
.cursor/
├── cli.json                     # Permissions for the improve agent (read + write expertise)
├── cli-question.json            # Read-only permissions for question agent
├── knowledge/
│   └── expertise.yaml           # THE structured knowledge base (core artifact)
└── rules/
    ├── project-knowledge.mdc    # Always-on: "read expertise.yaml before answering"
    ├── backend.mdc              # Glob-scoped rules for backend/**
    ├── frontend.mdc             # Glob-scoped rules for frontend/**
    ├── infrastructure.mdc       # Glob-scoped rules for infrastructure/**
    ├── codegen.mdc              # Glob-scoped rules for codegen/**
    ├── commit-conventions.md    # Conventional commits + knowledge awareness
    └── ...                      # One .mdc per layer in your project

.pipelines/  (or .github/workflows/)
├── improve-agent-prompt.md      # Instructions for the post-merge improvement agent
└── <ci>-knowledge-improve.yml   # CI pipeline that runs the improve agent
```

### File Reference

| File | Purpose | Customized per project? |
|------|---------|------------------------|
| `expertise.yaml` | Single source of truth for project knowledge — patterns, conventions, known issues, best practices | Yes — fully populated from your codebase |
| `project-knowledge.mdc` | Cursor rule that tells agents to read `expertise.yaml` before answering any question | Minimal — just update the file path if needed |
| `backend.mdc`, `frontend.mdc`, etc. | Per-layer rules scoped to a glob pattern (e.g., `backend/**`). Contain layer-specific conventions, do/don't lists, and references | Yes — one per layer, content reflects your stack |
| `commit-conventions.md` | Defines commit message format and includes a rule to update `expertise.yaml` when patterns change | Light customization — adjust types/scopes to your team |
| `cli.json` / `cli-question.json` | Permission configs for CI agents — controls which files the improve and question agents can read/write | Light customization — update paths if your structure differs |
| `improve-agent-prompt.md` | The prompt CI feeds to the AI agent after each merge to update `expertise.yaml` | Yes — references your specific file paths and conventions |
| CI pipeline YAML | Runs the improve agent on merge to `main`, with loop prevention | Yes — depends on your CI system (GitHub Actions, Azure Pipelines, etc.) |

---

## How to Bootstrap — Step by Step

### Option A: Prompt an AI Agent (Recommended)

This is the fastest path. An AI agent reads your codebase and generates all files in one session.

1. **Open a new session** in Cursor, Claude Code, or your preferred AI coding tool, pointed at your target repo

2. **Paste the entire contents** of [`docs/bootstrap-knowledge-system.md`](bootstrap-knowledge-system.md) as your prompt

3. **Prefix it with this instruction:**

   > Execute this bootstrap prompt against this repository. Analyze the codebase first, then create all files described in Phases 2–8.

4. **The agent will execute 8 phases:**
   - **Phase 1** — Analyze your README, `package.json`, and directory structure
   - **Phase 2** — Create `expertise.yaml` populated with your project's actual patterns
   - **Phase 3** — Create `project-knowledge.mdc` (always-on rule)
   - **Phase 4** — Create per-layer `.mdc` rules matching your directories
   - **Phase 5** — Create `commit-conventions.md`
   - **Phase 6** — Create the improve-agent prompt
   - **Phase 7** — Create CLI permission configs
   - **Phase 8** — Create the CI pipeline

5. **Review the generated files** — especially `expertise.yaml` — and commit them

> **Warning:** The agent may add speculative entries to `expertise.yaml` that aren't evidenced by your code. Review every entry and prune anything that doesn't match reality.

### Option B: Manual Setup

If you prefer full control:

1. Copy the `.cursor/` directory structure from the template above
2. Create each file following the schemas documented in [`bootstrap-knowledge-system.md`](bootstrap-knowledge-system.md)
3. Populate `expertise.yaml` by hand, referencing your actual codebase conventions
4. Set up the CI pipeline for your CI/CD system

This approach is slower but ensures every entry is intentional.

---

## Key Concepts to Understand

| Concept | What It Means |
|---------|---------------|
| **Stable sections** | `overview`, `core_implementation`, `patterns`, `safety_protocols` — these define the structure of `expertise.yaml` and rarely change after initial setup |
| **Mutable sections** | `best_practices`, `known_issues`, `potential_enhancements` — updated by the CI improve agent after every merge to `main` |
| **PRESERVE / APPEND / DATE / REMOVE** | The framework for safe updates: **preserve** valid entries, **append** new learnings with timestamps, only **remove** entries with clear evidence of obsolescence. This prevents the agent from accidentally deleting hard-won knowledge |
| **Per-layer rules (.mdc)** | Cursor rules that activate only when editing files matching a glob (e.g., `backend/**`). This keeps agent context focused and relevant |
| **Improve agent** | A post-merge CI step that reads recent commits, diffs, and PR descriptions, then updates `expertise.yaml` with new patterns or resolved issues |
| **Loop prevention** | The CI pipeline skips runs triggered by its own `chore(knowledge):` commits to avoid infinite loops |

---

## Tips for a Good Bootstrap

- **Be specific in your prompt** — If your directory names are non-obvious (e.g., `lib/` instead of `backend/`), tell the agent explicitly which directories are your "layers"
- **Review `expertise.yaml` carefully** — The agent may miss conventions or add entries based on assumptions. Prune anything not evidenced by actual code
- **Keep it under 500 lines** — Start lean and let the CI improve agent grow it organically over time. A bloated initial file leads to stale entries
- **Adapt the CI pipeline** — The bootstrap document includes examples for both GitHub Actions and Azure Pipelines. Pick the one that matches your CI system
- **Don't skip safety protocols** — Always include "never commit secrets" and "never force push" at minimum. These protect against common agent mistakes
- **Update `CLAUDE.md`** — If your repo uses Claude Code, add a reference to `expertise.yaml` in your `CLAUDE.md` so the agent reads it on every session

---

## After Bootstrapping — Verification Checklist

Use this checklist to confirm everything is set up correctly:

- [ ] `expertise.yaml` is valid YAML and populated with real project data (not placeholder text)
- [ ] `project-knowledge.mdc` has `alwaysApply: true` set
- [ ] One `.mdc` rule exists per major directory, each with a correct glob scope
- [ ] `commit-conventions.md` matches your team's commit message style
- [ ] CI pipeline includes loop prevention (skips on `chore(knowledge):` commits)
- [ ] Improve agent prompt references the correct file paths for your repo
- [ ] `cli.json` grants write access only to `expertise.yaml` (not to source code)
- [ ] A test merge to `main` triggers the improve agent and produces a valid update

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Agent didn't create all files | Re-run with a more explicit prompt: _"You missed Phases 5-8. Please create the commit conventions, improve-agent prompt, CLI configs, and CI pipeline."_ |
| `expertise.yaml` has placeholder text | Replace placeholders with real values from your codebase, or re-run Phase 2 with more context |
| CI pipeline loops infinitely | Ensure the pipeline checks for `chore(knowledge):` in the commit message and skips if found |
| Per-layer rules don't activate | Verify the glob pattern in each `.mdc` file matches your directory structure exactly |
| Improve agent makes bad updates | Review and tighten the improve-agent prompt — add explicit "do not" rules for patterns it gets wrong |

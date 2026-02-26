# Bootstrap Knowledge Improvement System

Use this prompt with an AI agent to replicate the self-improving knowledge structure in any Cursor project. Provide this entire document as context and instruct the agent to execute it against your repository.

---

## Prompt

You are bootstrapping a **self-improving knowledge system** for a Cursor-based project. This system consists of a structured expertise file, per-layer rules, an improve-agent prompt, and a CI pipeline that automatically analyzes recent commits and updates the knowledge base after merges.

The system follows the **PRESERVE/APPEND/DATE/REMOVE** framework from agentic engineering: knowledge grows conservatively through delta-based updates, not full rewrites. Existing insights are preserved, new learnings are appended with timestamps, and entries are only removed with clear evidence of obsolescence.

### Phase 1: Analyze the Codebase

Before creating anything, understand the project structure:

1. Read the project's `README.md`, `package.json` (or equivalent), and any existing documentation
2. Identify the primary directories and their purposes (e.g., `backend/`, `frontend/`, `infrastructure/`)
3. Identify the key conventions already in use (naming, testing, deployment patterns)
4. Identify the CI/CD system in use (Azure Pipelines, GitHub Actions, GitLab CI, etc.)
5. Note any existing `.cursor/rules/` files to avoid overwriting them

### Phase 2: Create the Expertise File

Create `.cursor/knowledge/expertise.yaml` following this exact schema. Populate each section from your codebase analysis:

```yaml
# {Project Name} Expertise
# Structured knowledge base for the project.
# Mutable sections: best_practices, known_issues, potential_enhancements,
#   *.examples, *.real_examples, decision_trees.*.observed_usage
# Stable sections: overview, core_implementation, key_operations (structure),
#   patterns (structure), safety_protocols
# Last updated: {YYYY-MM-DD}

overview:
  description: |
    {One paragraph describing what this project does.}
  scope: |
    {What this knowledge base covers and excludes.}
  rationale: |
    {Why a unified knowledge base vs separate docs -- focus on cross-cutting
    patterns that emerge between layers.}

core_implementation:
  primary_directories:
    - path: {directory}/
      purpose: {What this directory contains and does}
    # Repeat for each major directory

  key_conventions:
    - name: {Convention Name}
      summary: {Brief description of the convention}
    # Repeat for each convention (naming, testing, deployment, etc.)

key_operations:
  # Define 4-6 key operations developers perform regularly
  {operation_id}:
    name: {Human-readable name}
    description: {What this operation does}
    when_to_use: {When a developer would perform this}
    approach: |
      {Step-by-step instructions}
    pitfalls:
      - what: {Common mistake}
        why: {Why it happens}
        instead: {What to do instead}
    examples:
      - command: {example command}
        note: {What it does}

decision_trees:
  # Define 1-3 key decision points developers face
  {decision_id}:
    name: {Decision name}
    entry_point: {The question this tree answers}
    branches:
      - condition: {If this is true}
        action: {Do this}
    timestamp: {YYYY-MM-DD}

patterns:
  # Document 2-4 key architectural patterns in the codebase
  {pattern_id}:
    name: {Pattern name}
    context: {When this pattern applies}
    implementation: |
      {How the pattern works, step by step}
    trade_offs:
      - advantage: {Pro}
        cost: {Con}
    real_examples:
      - file: {path/to/exemplar}
        note: {What it demonstrates}

safety_protocols:
  - protocol: Never Commit Secrets
    description: Do not commit API keys, credentials, .env files, or any sensitive data
    rationale: Secrets in git history are permanent and cannot be fully removed
    exception: None
    timestamp: {YYYY-MM-DD}

  - protocol: Never Force Push to Shared Branches
    description: Do not use git push --force on shared branches without explicit team approval
    rationale: Rewrites history, breaks collaborators' local repos
    exception: User explicitly requests it for a known reason on a personal branch
    timestamp: {YYYY-MM-DD}

  # Add 1-3 project-specific safety protocols (e.g., "Run Build Before Deploy",
  # "Test Migrations Locally First")

# --- MUTABLE SECTIONS BELOW ---

best_practices:
  - category: {Category Name}
    practices:
      - practice: {Best practice description}
        evidence: {Why this is a best practice -- cite file, commit, or observation}
        timestamp: {YYYY-MM-DD}

known_issues:
  # Leave empty initially or populate from TODO.md / issue tracker
  # - issue: {Description}
  #   workaround: {How to work around it}
  #   status: open
  #   evidence: {How it was discovered}
  #   timestamp: {YYYY-MM-DD}

potential_enhancements:
  # Leave empty initially or populate from TODO.md / roadmap
  # - enhancement: {Description}
  #   rationale: {Why it would help}
  #   effort: low|medium|high
  #   impact: {Expected benefit}
  #   timestamp: {YYYY-MM-DD}
```

**Guidelines for populating:**
- The `overview`, `core_implementation`, `key_operations`, `patterns`, and `safety_protocols` sections are **stable** -- they define structure and should rarely change
- The `best_practices`, `known_issues`, and `potential_enhancements` sections are **mutable** -- the improve agent updates these over time
- Keep the file under 500 lines initially; it will grow organically
- Every entry in mutable sections must have a `timestamp` field
- Only add patterns you can evidence from the actual codebase

### Phase 3: Create the Project Knowledge Rule

Create `.cursor/rules/project-knowledge.mdc`:

```markdown
---
alwaysApply: true
description: Use project knowledge base before answering; follow safety and conventions
---

# Project knowledge

Before answering any question about this project:

1. **Read** [`.cursor/knowledge/expertise.yaml`](.cursor/knowledge/expertise.yaml) -- it is the project's structured knowledge base reflecting current patterns and known issues.
2. **Follow** all `safety_protocols` and `core_implementation.key_conventions` defined there.
3. **Prefer** documented `best_practices`, `patterns`, and `key_operations` over generic suggestions; consider `known_issues` and workarounds when relevant.

{One sentence describing your project's architecture for quick context.}
```

This rule is `alwaysApply: true`, so every Cursor interaction reads the expertise file first.

### Phase 4: Create Per-Layer Rules

For each major directory in the project, create a glob-scoped `.mdc` rule in `.cursor/rules/`. Each rule should:
- Activate only for files in that directory (via `globs`)
- List 2-3 files the agent should read before making changes in that layer
- Define CRITICAL constraints (things that must never be done)
- Define IMPORTANT constraints (things that should be followed)
- Define PREFERRED practices (stylistic preferences)

Template for each layer rule (`.cursor/rules/{layer}.mdc`):

```markdown
---
description: {Layer} development -- {brief description of layer's technology}
globs: {layer}/**
alwaysApply: false
---

# {Layer} Development Rules

## Context

Before making {layer} changes, read:

- {path/to/key/file1} for {what it provides}
- {path/to/key/file2} for {what it provides}

## Constraints

**CRITICAL:**

- {Absolute must-follow rule, e.g., "Do not edit generated files"}
- {Another critical rule}

**IMPORTANT:**

- {Should-follow pattern, e.g., "Use the service factory for dependency injection"}
- {Another important rule}

**PREFERRED:**

- {Stylistic preference, e.g., "Keep handler logic thin; delegate to services"}
```

### Phase 5: Create the Commit Conventions Rule

Create `.cursor/rules/commit-conventions.md`:

```markdown
# Commit Conventions

## Atomic Commits

Each commit must represent a **single logical change**. The repository should be in a working state at every commit.

- One feature, fix, or refactor per commit
- Include related test changes in the same commit as the implementation
- If a commit introduces a new pattern worth capturing, include the knowledge update (`.cursor/knowledge/expertise.yaml`) in the same commit

## Conventional Commits Format

```
<type>(<scope>): <description>
```

**Valid types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`, `style`

**Scope** is optional but encouraged. Use the layer name: {list your layer names, e.g., backend, frontend, infrastructure, knowledge}.

**Description** must be:
- Present tense ("add", not "added")
- Lowercase first letter
- No trailing period
- 72 characters max

## Knowledge Base Updates

If your changes introduce a new pattern, resolve an issue, or reveal a best practice:
- Update the relevant **mutable** section in `.cursor/knowledge/expertise.yaml` in the same commit
- Add a `timestamp: YYYY-MM-DD`
- Mutable sections: `best_practices`, `known_issues`, `potential_enhancements`, `*.examples`, `*.real_examples`
```

### Phase 6: Create the Improve Agent Prompt

Create `.pipelines/improve-agent-prompt.md` (or `.github/prompts/improve-agent-prompt.md` for GitHub Actions):

```markdown
# Knowledge Improvement Agent

## Goal
The expertise file reflects accurate, evidence-based learnings from recent commits. Existing valid patterns are preserved. New entries include timestamps and evidence. No speculative entries exist -- only patterns observed in actual commits.

## Context

The knowledge base lives at `.cursor/knowledge/expertise.yaml`. It follows a structured YAML schema with both **stable** and **mutable** sections.

**Stable sections (DO NOT rewrite):**
- `overview` - project scope
- `core_implementation` - directory structure and conventions
- `key_operations` structure - operation names and descriptions
- `patterns` structure - pattern names and implementations
- `safety_protocols` - immutable safety rules

**Mutable sections (YOU update these):**
- `best_practices` - evolving guidance with evidence
- `known_issues` - current limitations and workarounds
- `potential_enhancements` - improvement roadmap
- `key_operations.*.examples` - real examples from the repo
- `key_operations.*.pitfalls` - newly discovered pitfalls
- `patterns.*.real_examples` - links to exemplar commits
- `decision_trees.*.observed_usage` - usage statistics

## Phase 1: Reflect -- Analyze Recent Changes

Run these commands to understand what changed:

```bash
git log --oneline -20
git log --format="%h %s" -20
git diff HEAD~10..HEAD --stat
```

For each recent commit, identify:
1. **New patterns**: Did a commit introduce a reusable approach?
2. **Resolved issues**: Did a commit fix a known problem?
3. **New pitfalls**: Did a commit reveal an anti-pattern or edge case?
4. **Best practices**: Did a commit demonstrate a practice worth codifying?

Read `.cursor/knowledge/expertise.yaml` to understand the current state of the knowledge base.

## Phase 2: Curate -- Apply Update Rules

Apply the PRESERVE/APPEND/DATE/REMOVE framework:

### PRESERVE
Keep existing entries that are still valid. Do not rewrite or rephrase working patterns. If an entry is still accurate, leave it unchanged.

### APPEND
Add new learnings as new entries in the appropriate mutable section. Every new entry MUST include a `timestamp` field with today's date in YYYY-MM-DD format.

**For best_practices:**
```yaml
- practice: Description of the practice
  evidence: Why this is a good practice (cite commit or observation)
  timestamp: YYYY-MM-DD
```

**For known_issues:**
```yaml
- issue: Description of the issue
  workaround: How to work around it
  status: open
  evidence: How it was discovered (cite commit hash or file)
  timestamp: YYYY-MM-DD
```

**For potential_enhancements:**
```yaml
- enhancement: Description
  rationale: Why it would help
  effort: low|medium|high
  impact: Expected benefit
  timestamp: YYYY-MM-DD
```

### DATE
Every new entry gets a `timestamp: YYYY-MM-DD` field. This is mandatory.

### REMOVE
Only remove entries when there is clear evidence they are wrong or obsolete:
- 3+ commits contradicting the pattern
- Technology changed fundamentally
- Pattern caused measurable harm

## Critical Constraints

1. **Delta-based updates only.** Do NOT rewrite the entire file. Full rewrites lose hard-won insights.
2. **Preserve YAML structure.** Do not change indentation conventions, key names, or section ordering.
3. **No stable section modifications.** Do not touch overview, core_implementation structure, safety_protocols, or pattern/operation names.
4. **Maximum 10 new entries per run.** Quality over quantity.
5. **Resolve known_issues when fixed.** Change `status` to `resolved` and add the resolving commit hash.
6. **No speculative entries.** Only add patterns observed in actual commits.

## Output

After updating `.cursor/knowledge/expertise.yaml`, output a brief improvement report:

```
## Knowledge Improvement Report

**Commits analyzed:** [range]

**Best practices added:**
- [practice]: [evidence]

**Issues resolved:**
- [issue]: resolved by [commit]

**Issues discovered:**
- [issue]: [evidence]

**Enhancements proposed:**
- [enhancement]: [rationale]

**Entries removed:**
- [entry]: [reason]

**No changes needed:** [if nothing noteworthy was found]
```

Start output directly with the report header. If no changes are needed, output only:

## Knowledge Improvement Report
**No changes needed:** [brief reason]
```

### Phase 7: Create CLI Permission Configs

Create `.cursor/cli.json` for the improve agent (read + write expertise):

```json
{
  "permissions": {
    "allow": [
      "Read(.cursor/knowledge/**)",
      "Read(.cursor/rules/**)",
      "Write(.cursor/knowledge/expertise.yaml)",
      "Shell(git log --oneline -20)",
      "Shell(git log --format=\"%h %s\" -20)",
      "Shell(git diff HEAD~10..HEAD --stat)"
    ],
    "deny": [
      "Shell(git push *)",
      "Shell(gh pr create *)"
    ]
  }
}
```

Create `.cursor/cli-question.json` for a read-only question agent:

```json
{
  "permissions": {
    "allow": [
      "Read(**)"
    ],
    "deny": [
      "Write(**)",
      "Shell(**)"
    ]
  }
}
```

### Phase 8: Create the CI Pipeline

Create a CI pipeline that runs the improve agent after merges to your development branch. The pipeline should:

1. **Check for loop prevention** -- skip if the last commit matches `^chore(knowledge):`
2. **Install the Cursor CLI** (or equivalent agentic tool)
3. **Run the improve agent** with the prompt from Phase 6
4. **Check expertise file size** -- warn if it exceeds 500 lines
5. **Commit and push** if expertise.yaml was modified

The commit message must be: `chore(knowledge): update expertise from recent commits`
The push must use explicit branch targeting (e.g., `git push origin HEAD:$(Build.SourceBranch)` for Azure Pipelines, or `git push origin HEAD:${{ github.ref }}` for GitHub Actions) because CI environments often run in detached HEAD state.

**Important CI learnings:**
- Write prompts to files instead of inline YAML multiline strings (colons in prompts break YAML parsing)
- Use loop prevention to avoid infinite trigger cycles
- Set a timeout (5 minutes) on the agent step
- Treat agent failures as warnings, not errors (pipeline should not fail on agent issues)

### Phase 9: Verify the System

After creating all files, verify:

1. `.cursor/knowledge/expertise.yaml` -- valid YAML, populated from codebase analysis
2. `.cursor/rules/project-knowledge.mdc` -- `alwaysApply: true`, references expertise.yaml
3. `.cursor/rules/{layer}.mdc` -- one per major directory, glob-scoped
4. `.cursor/rules/commit-conventions.md` -- conventional commits with knowledge awareness
5. `.pipelines/improve-agent-prompt.md` -- improve agent prompt with PRESERVE/APPEND/DATE/REMOVE
6. `.cursor/cli.json` -- permissions for improve agent
7. `.cursor/cli-question.json` -- read-only permissions for question agent
8. CI pipeline YAML -- triggers on dev branch, loop prevention, commit + push

### Summary of Files Created

```
.cursor/
├── cli.json                          # Improve agent permissions
├── cli-question.json                 # Read-only question agent permissions
├── knowledge/
│   └── expertise.yaml                # Structured knowledge base (THE core artifact)
└── rules/
    ├── project-knowledge.mdc         # Always-on rule: read expertise before answering
    ├── {layer1}.mdc                  # Per-layer rules (glob-scoped)
    ├── {layer2}.mdc
    ├── {layerN}.mdc
    └── commit-conventions.md         # Conventional commits with knowledge awareness

.pipelines/  (or .github/workflows/)
├── improve-agent-prompt.md           # The improve agent's instructions
└── {ci}-knowledge-improve.yml        # CI pipeline that runs the improve agent
```

### Key Principles (from Agentic Engineering)

1. **Knowledge bases are gardens, not databases.** Prune, transplant, and let things go fallow. The goal is usefulness, not comprehensiveness.
2. **Conservative updates protect against the second system effect.** Early patterns came from real pain. Default to preservation.
3. **Timestamps are accountability, not decoration.** Every dated addition answers "when did we learn this?"
4. **Delta-based updates over full rewrites.** Full rewrites cause context collapse and lose 40%+ of original insights. Measured impact: 75% fewer rollouts with delta-based updates.
5. **Learning separation in multi-agent systems.** Agents execute tasks (read expertise); learning happens post-hoc (improve agent writes expertise). This prevents race conditions.
6. **Size governance.** Set a warning threshold (500 lines) and hard limit (1000 lines). When exceeded, prune low-value tactical entries before adding new ones.

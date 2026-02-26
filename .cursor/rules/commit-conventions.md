# Commit Conventions

Rules for atomic, knowledge-aware commits following the agentic SDLC lifecycle.

## Atomic Commits

Each commit must represent a **single logical change**. The repository should be in a working state at every commit.

- One feature, fix, or refactor per commit
- Include related test changes in the same commit as the implementation
- If a commit introduces a new pattern worth capturing, include the knowledge update (`.cursor/knowledge/expertise.yaml`) in the same commit
- Never bundle unrelated changes (e.g., a bug fix and a new feature)

## Conventional Commits Format

All commit messages must follow Conventional Commits:

```
<type>(<scope>): <description>
```

**Valid types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`, `style`

**Scope** is optional but encouraged. Use the layer name: `backend`, `frontend`, `infrastructure`, `codegen`, `pipelines`, `knowledge`.

**Description** must be:
- Present tense ("add", not "added")
- Lowercase first letter
- No trailing period
- 72 characters max

### Examples

```
feat(backend): add rate limiting middleware for API Gateway
fix(frontend): resolve hydration error on projects page
chore(infrastructure): enable SQS stack toggle
docs(codegen): document x-entity extension usage
ci(pipelines): add knowledge improvement pipeline
chore(knowledge): update expertise from recent commits
```

## Commit Message Voice

State what changed directly. Use active present tense:

- "add rate limiting middleware" (not a narrative about the change)
- "resolve hydration error on projects page" (not an explanation of the process)

Commit messages describe the change itself. The first word is a verb in present tense matching the commit type (add, fix, update, remove, refactor).

## Knowledge Base Updates

### During Normal Development

If your changes introduce a new pattern, resolve an issue, or reveal a best practice:
- Update the relevant **mutable** section in `.cursor/knowledge/expertise.yaml` in the same commit
- Add a timestamp: `timestamp: YYYY-MM-DD`
- Mutable sections: `best_practices`, `known_issues`, `potential_enhancements`, `*.examples`, `*.real_examples`

### During Parallel Agent Execution

When multiple agents execute tasks in parallel:
- Do NOT update `expertise.yaml` during execution
- Knowledge updates happen post-hoc via the improve-agent pipeline
- This prevents race conditions where one agent's writes overwrite another's

### Automated Improvement (Post-Merge)

After PR merge to dev/main, the knowledge improvement pipeline runs automatically:
- Analyzes recent git history
- Updates mutable expertise sections
- Commits as `chore(knowledge): update expertise from recent commits`
- Do NOT manually duplicate what the pipeline will capture

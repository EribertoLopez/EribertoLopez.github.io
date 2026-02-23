# Project Knowledge

Before answering any question or making any change in this project, read `.cursor/knowledge/expertise.yaml` — it is the project's structured knowledge base reflecting current patterns, known issues, and best practices. It is maintained by a CI pipeline and updated on every merge to main.

Follow all `safety_protocols` and `core_implementation.key_conventions` defined there.

This project is a personal portfolio with serverless backend: OpenAPI and Mustache drive codegen and TypeORM entities; infrastructure is CDK-based on AWS.

## Layer Rules

When working in a specific layer, read the corresponding rules file:

- **Backend** (`backend/**`): Read `.cursor/rules/backend.mdc` — Lambda handlers, TypeORM, service factory pattern. Never edit generated files.
- **Frontend** (`frontend/**`): Read `.cursor/rules/frontend.mdc` — Next.js Pages Router, generated API client. Never hardcode API URLs.
- **Infrastructure** (`infrastructure/**`): Read `.cursor/rules/infrastructure.mdc` — CDK stacks, project-config.ts is the single source of truth for naming.
- **Codegen** (`codegen/**`): Read `.cursor/rules/codegen.mdc` — OpenAPI spec with x-entity extensions. Always run `npm run codegen` after spec changes.

## Commit Conventions

Follow `.cursor/rules/commit-conventions.md`:

- Conventional commits: `<type>(<scope>): <description>`
- Valid types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`, `style`
- Scope is the layer name: `backend`, `frontend`, `infrastructure`, `codegen`, `knowledge`
- One logical change per commit. Include related tests in the same commit.

## Knowledge Maintenance

If your changes introduce a new pattern, resolve a known issue, or reveal a best practice:
- Update the relevant **mutable** section in `.cursor/knowledge/expertise.yaml` in the same commit
- Add a `timestamp: YYYY-MM-DD` to every new entry
- Mutable sections: `best_practices`, `known_issues`, `potential_enhancements`, `*.examples`, `*.real_examples`
- See `.pipelines/improve-agent-prompt.md` for the full PRESERVE/APPEND/DATE/REMOVE framework

## Safety Protocols

- Never commit secrets, API keys, credentials, or .env files
- Never force push to shared branches without explicit approval
- Never edit generated files — change the spec and regenerate
- Run build before deploy; test migrations locally first

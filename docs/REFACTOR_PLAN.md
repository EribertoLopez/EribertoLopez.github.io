# Monorepo Refactor Plan

**Goal:** Migrate EribertoLopez.github.io from a single Next.js app (Pages Router, GitHub Pages) to a full-stack monorepo (App Router, AWS CDK, S3+CloudFront) using the template-project architecture as the foundation — while preserving the existing personal portfolio frontend.

**PR Prefix:** `REFACTOR-###`

---

## Architecture Overview

### Current State (main branch)
```
EribertoLopez.github.io/
├── pages/              # Next.js Pages Router
├── components/         # Portfolio UI (NavBar, Sidebar, Resume, etc.)
├── lib/                # Markdown parsing, config utils
├── styles/             # Tailwind + CSS Modules
├── _posts/             # Markdown blog posts
├── _projects/          # Markdown project pages
├── _resumes/           # Markdown resume
├── public/             # Static assets
├── .github/workflows/  # GitHub Actions → GitHub Pages
└── package.json        # Single app
```

### Target State
```
EribertoLopez.github.io/
├── frontend/           # Next.js 14 App Router (portfolio UI)
│   ├── app/            # App Router pages
│   ├── components/     # Existing portfolio components
│   ├── lib/            # Utils, markdown, API client
│   ├── styles/         # Tailwind + CSS Modules
│   ├── content/        # _posts, _projects, _resumes (moved here)
│   ├── providers/      # Theme provider
│   ├── hooks/          # Custom hooks
│   ├── types/          # TypeScript types
│   └── public/         # Static assets
├── backend/            # Lambda functions (rspack, TypeORM)
│   ├── src/
│   │   ├── functions/  # Lambda handlers
│   │   ├── services/   # Business logic
│   │   ├── migrations/ # TypeORM migrations
│   │   └── utils/      # Shared utilities
│   └── rspack.config.js
├── infrastructure/     # AWS CDK stacks
│   ├── bin/            # CDK app entry, config, naming
│   └── lib/            # Stack definitions (VPC, Lambda, Frontend, DB, etc.)
├── codegen/            # OpenAPI spec + code generation
│   ├── openapi.yaml    # API source of truth
│   ├── config.yaml     # Codegen configuration
│   └── templates/      # Mustache templates (entities, services)
├── .pipelines/         # Azure Pipelines (reference/inspiration)
├── .github/workflows/  # GitHub Actions (active CI/CD)
├── docker-compose.yaml # Local dev (Postgres + LocalStack)
├── scripts/            # Dev scripts
└── package.json        # Root orchestration
```

---

## PR Plan

### REFACTOR-001: Monorepo Scaffold
**Branch:** `coral/refactor-001-monorepo-scaffold`
**Depends on:** nothing (base PR)

Create the empty monorepo directory structure and root orchestration.

**Tasks:**
- [ ] Create `frontend/`, `backend/`, `infrastructure/`, `codegen/`, `scripts/`, `.pipelines/` directories
- [ ] Create root `package.json` with workspace scripts (`install:all`, `frontend:dev`, `frontend:build`, `start:local`, `dev`, `build`, `deploy`, etc.) modeled after template
- [ ] Add root `.nvmrc` pinning Node 22
- [ ] Add root `docker-compose.yaml` (Postgres + LocalStack + Swagger UI)
- [ ] Add root `.gitignore` updates for monorepo patterns
- [ ] Add `codegen/config.yaml` and `codegen/templates/` directory (from template)
- [ ] Add placeholder `codegen/openapi.yaml` (empty spec with project metadata, no paths yet)

**Parallel:** None — this is the foundation.

---

### REFACTOR-002: Backend Skeleton
**Branch:** `coral/refactor-002-backend-skeleton`
**Depends on:** REFACTOR-001

Copy the template-project backend structure with all HSF-specific code stripped out.

**Tasks:**
- [ ] Copy `backend/package.json` — prune HSF-specific deps (stripe, twilio) but keep core (aws-sdk, pg, typeorm, rspack, etc.)
- [ ] Copy `backend/rspack.config.js`, `backend/tsconfig.json`
- [ ] Create `backend/src/functions/` — empty handler stubs
- [ ] Create `backend/src/services/` — `DatabaseService.ts`, `serviceFactory.ts` (stripped of scholar logic)
- [ ] Create `backend/src/migrations/` — empty index
- [ ] Create `backend/src/utils/corsUtils.ts` (from template)
- [ ] Verify `npm run backend:build` produces `backend/dist/` via rspack

**Parallel with:** REFACTOR-003, REFACTOR-004, REFACTOR-005

---

### REFACTOR-003: Infrastructure (CDK)
**Branch:** `coral/refactor-003-infrastructure`
**Depends on:** REFACTOR-001

Copy the template-project infrastructure with project config updated for the portfolio site.

**Tasks:**
- [ ] Copy full `infrastructure/` directory from template
- [ ] Update `project-config.ts`:
  - `projectName: "EribertoLopez"`
  - `projectSlug: "eribertolopez"`
  - `projectDisplayName: "Eriberto-Lopez-Portfolio"`
- [ ] Update `env-config.ts` — change DB name to `eribertolopez`
- [ ] Update `frontend.ts` — change bucket name to `eribertolopez-frontend-{env}`
- [ ] Set initial stack toggles: `cache: false`, `sqs: false`, `ecs: false`, `ecr: false`
- [ ] Copy `infrastructure/package.json`, `tsconfig.json`, `cdk.json`
- [ ] Copy VPC config files (`vpc-local-config.json`, etc.)
- [ ] Verify `cdklocal synth` works with the new config

**Parallel with:** REFACTOR-002, REFACTOR-004, REFACTOR-005

---

### REFACTOR-004: Frontend Migration
**Branch:** `coral/refactor-004-frontend-migration`
**Depends on:** REFACTOR-001

Move all existing frontend code into `frontend/` and migrate from Pages Router to App Router.

**Tasks:**

#### 4a. Move files into `frontend/`
- [ ] Move `components/` → `frontend/components/`
- [ ] Move `pages/` → `frontend/pages/` (temporary, will convert)
- [ ] Move `styles/` → `frontend/styles/`
- [ ] Move `public/` → `frontend/public/`
- [ ] Move `lib/` → `frontend/lib/`
- [ ] Move `interfaces/` → `frontend/types/`
- [ ] Move `@types/` → `frontend/@types/`
- [ ] Move `_posts/`, `_projects/`, `_resumes/` → `frontend/content/`
- [ ] Move `tailwind.config.js` → `frontend/tailwind.config.js`
- [ ] Move `postcss.config.js` → `frontend/postcss.config.mjs`
- [ ] Move `tsconfig.json` → `frontend/tsconfig.json`
- [ ] Create `frontend/package.json` (based on current root, aligned with template structure)

#### 4b. Upgrade to App Router
- [ ] Create `frontend/app/layout.tsx` — root layout with ThemeProvider
- [ ] Create `frontend/app/page.tsx` — home page (migrate from `pages/index.tsx`)
- [ ] Migrate `pages/latest/` → `frontend/app/latest/`
- [ ] Migrate `pages/projects/` → `frontend/app/projects/`
- [ ] Migrate `pages/resume/` → `frontend/app/resume/`
- [ ] Migrate `pages/contact/` → `frontend/app/contact/`
- [ ] Migrate `pages/mscs/` → `frontend/app/mscs/`
- [ ] Remove `pages/_app.tsx`, `pages/_document.tsx` (replaced by layout.tsx)
- [ ] Update `lib/api.ts` — adjust paths for content directory (`content/_posts` etc.)

#### 4c. Adopt template patterns
- [ ] Create `frontend/providers/theme-provider.tsx`
- [ ] Create `frontend/config/theme.ts`
- [ ] Create `frontend/hooks/` directory
- [ ] Update `frontend/next.config.mjs` (from template: export mode, experimental flags)
- [ ] Add `frontend/components.json` (shadcn config for future use)
- [ ] Update `frontend/.eslintrc.json`

#### 4d. Dependency alignment
- [ ] Pin Next.js to 14.2.x
- [ ] Pin TypeScript to ^5
- [ ] Keep existing deps: gray-matter, remark, remark-html, remark-gfm, unified, lucide-react, classnames, date-fns
- [ ] Add from template: clsx, tailwind-merge, tailwindcss-animate, next-themes
- [ ] Pin Node engine to >=22

#### 4e. Verify
- [ ] `npm run frontend:dev` serves the site
- [ ] `npm run frontend:build` produces static export in `frontend/out/`
- [ ] All pages render correctly
- [ ] CSS Modules + Tailwind work
- [ ] Markdown content loads properly

**Parallel with:** REFACTOR-002, REFACTOR-003, REFACTOR-005

---

### REFACTOR-005: CI/CD (GitHub Actions)
**Branch:** `coral/refactor-005-cicd`
**Depends on:** REFACTOR-001

Replace the GitHub Pages workflow with AWS deployment, keep Azure Pipelines as reference.

**Tasks:**

#### 5a. Copy Azure Pipelines (reference only)
- [ ] Copy `.pipelines/` directory from template (all YAML files)
- [ ] Add comment header in each file: "Reference from template-project — not active"

#### 5b. Refactor GitHub Actions
- [ ] Create `.github/workflows/deploy-frontend.yml`:
  - Trigger: push to main (frontend/** changes)
  - Steps: checkout → setup Node 22 → install → build frontend → CDK deploy frontend stack
  - AWS credentials via GitHub secrets
- [ ] Create `.github/workflows/deploy-backend.yml`:
  - Trigger: push to main (backend/** changes)
  - Steps: checkout → setup Node 22 → install → rspack build → CDK deploy backend stack
- [ ] Create `.github/workflows/deploy-infrastructure.yml`:
  - Trigger: push to main (infrastructure/** changes)
  - Steps: CDK diff → CDK deploy
- [ ] Create `.github/workflows/pr-check.yml`:
  - Trigger: PR to main
  - Steps: lint + typecheck + build (frontend + backend)
- [ ] Remove old `.github/workflows/nextjs.yml`

**Parallel with:** REFACTOR-002, REFACTOR-003, REFACTOR-004

---

### REFACTOR-006: Integration & Local Dev
**Branch:** `coral/refactor-006-integration`
**Depends on:** REFACTOR-002, REFACTOR-003, REFACTOR-004, REFACTOR-005

Wire everything together and verify the full local dev experience.

**Tasks:**
- [ ] Verify `npm run install:all` installs all workspaces
- [ ] Verify `docker-compose up -d` starts Postgres + LocalStack
- [ ] Verify `npm run frontend:dev` works
- [ ] Verify `npm run backend:build` works
- [ ] Verify `cdklocal deploy` provisions local stacks
- [ ] Verify `npm run start:local` brings up the full local environment
- [ ] Update root `README.md` with new setup instructions
- [ ] Clean up: remove root-level `pages/`, `components/`, `lib/`, etc. that were moved
- [ ] Update `CNAME` file location and DNS considerations doc

**Parallel:** None — this is the integration step.

---

## Dependency Graph

```
REFACTOR-001 (scaffold)
  ├── REFACTOR-002 (backend)      ──┐
  ├── REFACTOR-003 (infrastructure) ──┼── REFACTOR-006 (integration)
  ├── REFACTOR-004 (frontend)      ──┤
  └── REFACTOR-005 (CI/CD)        ──┘
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CI/CD | GitHub Actions | Simpler, free, already in use. Azure Pipelines kept as reference. |
| Hosting | S3 + CloudFront via CDK | Moving compute to AWS per requirements |
| UI Framework | Keep CSS Modules + Tailwind | Preserve existing frontend; Chakra migration deferred |
| API Contract | OpenAPI 3.0 (codegen/) | Source of truth for frontend↔backend types, entities, service interfaces |
| Backend | Full skeleton from template | Ready for future API features (AI chat, etc.) |
| Node.js | 22.x | Match template-project requirement |
| Next.js | 14.2.x | Match template-project, stable App Router |

## OpenAPI as Source of Truth

The `codegen/openapi.yaml` defines:
- **Schemas** → generates TypeORM entities (`x-entity`, `x-table-name`, `x-primary-key`)
- **Paths** → generates service interfaces and implementations
- **API Gateway integration** → `x-amazon-apigateway-integration` directives drive CDK Lambda wiring

The codegen pipeline (via `codegen/config.yaml` + Mustache templates) auto-generates:
- `entities/*.entity.ts` — TypeORM entities from schemas
- `services/*.service.interface.ts` — Service interfaces from paths
- `services/*.service.ts` — Base service implementations
- `models/*.ts` — TypeScript types from schemas

This ensures frontend types, backend entities, and API contracts are always in sync.

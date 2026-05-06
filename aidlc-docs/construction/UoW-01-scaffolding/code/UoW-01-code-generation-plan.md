# Code Generation Plan — UoW-01 Project Scaffolding

**Unit**: UoW-01 — Project scaffolding + monorepo + CI + dev scripts
**Tier**: Greenfield
**Stacks in scope**: Frontend (Web), Backend (Node.js)
**Stories implemented**: (foundation — none directly, enables all)
**Generated at**: 2026-05-04T00:28:30Z

This is the **plan** the pod will sign at Gate #3. No code is written until that signature is in place.

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC/`
- **Layout**: greenfield, multi-stack monorepo (per ADR-006)
- **Application code**: at workspace root inside `web/`, `api/`, `shared/`, `infra/`, `scripts/` directories
- **Documentation**: stays at `aidlc-docs/` (NEVER mixed with code)

---

## Files to be created (exhaustive list)

### Repo root
- `package.json` (root) — pnpm workspace declaration
- `pnpm-workspace.yaml` — declares `web`, `api`, `shared` packages
- `.nvmrc` — `22`
- `.editorconfig`
- `.gitignore`
- `.gitattributes`
- `.prettierrc.cjs`
- `tsconfig.base.json` — shared TS config (strict mode)
- `README.md` — quickstart for the pod
- `.env.example` — placeholders for `DATABASE_URL`, `REDIS_URL`, `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY`, `LLM_PROVIDER_API_KEY`, `PORT`

### `web/`
- `web/package.json`
- `web/next.config.mjs`
- `web/tsconfig.json` (extends base)
- `web/.eslintrc.cjs`
- `web/tailwind.config.ts`
- `web/postcss.config.mjs`
- `web/app/layout.tsx` — `<html lang="en-IN">`, meaningful `<title>` (NFR-A11Y-08)
- `web/app/page.tsx` — placeholder home redirecting to `/chat` (route created in UoW-05)
- `web/app/globals.css` — Tailwind directives
- `web/lib/log.ts` — placeholder structured-log shim
- `web/vitest.config.ts`
- `web/tests/smoke.spec.ts` — single test asserting layout renders
- `web/.env.example` (subset of root)

### `api/`
- `api/package.json`
- `api/nest-cli.json`
- `api/tsconfig.json` (extends base)
- `api/tsconfig.build.json`
- `api/.eslintrc.js`
- `api/src/main.ts` — Nest bootstrap; reads `PORT`; pino logger configured with the 10 codiste-required fields
- `api/src/app.module.ts` — root module; only imports `HealthModule`
- `api/src/health/health.module.ts`
- `api/src/health/health.controller.ts` — `GET /health` → `{status:'ok', ts}`
- `api/src/health/health.controller.spec.ts` — single test
- `api/prisma/schema.prisma` — generator + datasource only; no models yet
- `api/vitest.config.ts`
- `api/test/app.e2e-spec.ts` — single e2e: GET /health → 200
- `api/.env.example` (subset of root)

### `shared/`
- `shared/openapi.yaml` — OpenAPI 3.1 with `info` + a single `/health` GET
- `shared/widget-schemas/.gitkeep`
- `shared/intents/.gitkeep`
- `shared/types/.gitkeep`
- `shared/package.json` — small package that re-exports generated types (filled later)

### `infra/`
- `infra/docker-compose.yml` — local-only postgres:15 (with pgvector image) + redis:7 with AOF
- `infra/postgres/init.sql` — `CREATE EXTENSION IF NOT EXISTS vector;`
- `infra/README.md`

### `scripts/`
- `scripts/dev.sh` — sequenced: docker-compose → install → api & web in parallel
- `scripts/ci.sh` — entry that calls `ci-web.sh` and/or `ci-api.sh` based on `CHANGED_PATHS` env (set by GH Actions path-filter step)
- `scripts/ci-web.sh` — install + lint + typecheck + vitest + license-audit
- `scripts/ci-api.sh` — install + lint + typecheck + vitest + license-audit + e2e against compose
- `scripts/seed-pilot-users.ts` — placeholder (top of file: `// TODO: implement in UoW-02 once User entity exists`)

### `.github/workflows/`
- `.github/workflows/ci.yml` — minimal as designed in nfr-design.md § 1; least-privilege `permissions: contents: read`

### Root tooling
- `.husky/` — optional pre-commit hook running lint-staged (kept off by default; opt-in commented)
- `lint-staged.config.cjs`

**Total**: ≈ 38 files across 6 top-level directories.

---

## Steps (the order I'll write things in Part 2)

### Step 1 — Project structure setup
- [ ] Create root `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.gitignore`, `.gitattributes`, `.editorconfig`, `tsconfig.base.json`, `.prettierrc.cjs`, `.env.example`, `README.md`
- [ ] Initialize `web/` with Next.js 14 App Router scaffold (manual, not `create-next-app`, so the file set is deterministic and audited)
- [ ] Initialize `api/` with NestJS 10 scaffold (manual)
- [ ] Initialize `shared/` with empty package + placeholder OpenAPI
- [ ] Initialize `infra/docker-compose.yml`
- [ ] Lockfile: run `pnpm install` once to produce `pnpm-lock.yaml`

### Step 2 — Shared Contracts
- [ ] Author `shared/openapi.yaml` with only the `/health` endpoint (proves the contract pipeline works)
- [ ] Add `pnpm gen:contracts` script — placeholder that prints "no contracts yet" so the script exists; full generator wired in UoW-02

### Step 3 — Domain Layer (BE)
- N/A — no domain entities in UoW-01

### Step 4 — Persistence Layer (BE)
- [ ] Initialize `api/prisma/schema.prisma` with generator + datasource ONLY (no models — those start in UoW-02)

### Step 5 — API Layer (BE)
- [ ] `api/src/health/` — module + controller + spec
- [ ] Wire `HealthModule` into `app.module.ts`

### Step 6 — Frontend
- [ ] `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/globals.css`
- [ ] `web/lib/log.ts` placeholder
- [ ] One smoke test

### Step 7 — Tooling, lint, format
- [ ] ESLint + Prettier configs per stack
- [ ] `lint-staged` config (kept opt-in)
- [ ] License-audit shell snippet integrated into `ci-web.sh` and `ci-api.sh`

### Step 8 — Tests (smoke level)
- [ ] `web/tests/smoke.spec.ts` — render layout, expect `<title>` non-empty + `<html lang>` non-empty
- [ ] `api/test/app.e2e-spec.ts` — GET /health → 200, body shape matches
- [ ] `api/src/health/health.controller.spec.ts` — unit test for the controller

### Step 9 — Eval scaffolding (AI/ML extension)
- N/A — no LLM in UoW-01. The `evals/` directory is created at top-level by UoW-06 (orchestrator) when LLM calls first appear.

### Step 10 — CI workflow
- [ ] `.github/workflows/ci.yml` per nfr-design.md § 1

### Step 11 — Final validation
- [ ] `pnpm install --frozen-lockfile` succeeds
- [ ] `bash scripts/ci.sh` succeeds locally (sets `CHANGED_PATHS=web,api,shared`)
- [ ] `bash scripts/dev.sh` brings everything up; `curl localhost:3000/health` returns 200; web placeholder loads

---

## Compliance Summary (extensions enabled)

| Extension | Rule scope applicable to UoW-01 | Status |
|-----------|----------------------------------|--------|
| Security Baseline (full) | License audit, secrets handling, CI least-privilege, dep CVE scan | **Compliant — covered by Steps 1, 7, 10** |
| AI/ML Lifecycle (full) | None applicable (no LLM) | **N/A** |
| Property-Based Testing (partial) | None applicable (no business logic) | **N/A** |
| Accessibility (Level A) | NFR-A11Y-08 (`<html lang>` + `<title>`) | **Compliant — covered in Step 6** |

---

## Test plan summary

| Layer | Tests in this UoW |
|-------|-------------------|
| Unit | 1 BE (`health.controller.spec.ts`) + 1 FE (`smoke.spec.ts`) |
| Integration / e2e | 1 BE e2e (`app.e2e-spec.ts` — GET /health) |
| Contract | OpenAPI lints (`@redocly/cli lint`) — included in `ci-api.sh` |
| Coverage target | not gated for UoW-01 (the meaningful business code starts at UoW-02) |

---

## Dependencies introduced (top-level — exact versions pinned in lockfile at Step 1)

### `web/` (≈ 12 deps)
next, react, react-dom, tailwindcss, postcss, autoprefixer, typescript, @types/{node,react,react-dom}, vitest, @vitest/ui, eslint, eslint-config-next, prettier, @testing-library/react, @testing-library/jsdom

### `api/` (≈ 12 deps)
@nestjs/{common,core,platform-express,testing}, reflect-metadata, rxjs, pino, pino-pretty (dev), prisma, @prisma/client, vitest, @vitest/ui, supertest, @types/supertest, eslint, eslint-config-prettier, prettier

### Shared (root devDeps)
typescript, prettier, husky (opt-in), lint-staged, @redocly/cli, jq

**License audit will run as the last step of each `ci-*.sh`**; any AGPL/GPL appearance fails the pipeline.

---

## What I will NOT do in Part 2

- Touch `aidlc-docs/` — application code never lives there
- Create files outside the file list above
- Pull in any dependency not listed (a new dep requires a plan amendment)
- Wire any business module (`auth/`, `orchestrator/`, `agents/*`, etc.) — those are later UoWs
- Run `git push` or open a PR — pod handles git/PR steps; my code lands as uncommitted working-tree changes
- Run `npm install` / `pnpm install` against a remote registry without showing the lockfile diff in the Stage 13 Code Review

---

## Risk register for this UoW

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Dependency drift between scaffold and codiste preset | Low | All versions pinned in `package.json`; reviewed in Stage 13 |
| `pnpm install` failure on pod's machine due to corp registry | Medium | README documents the pnpm registry override step |
| docker-compose Postgres image fails on Apple Silicon | Low | `pgvector/pgvector:pg15` ships arm64 since 2024; documented in `infra/README.md` |
| Lint config conflicts between Next.js + NestJS | Low | Per-stack `.eslintrc` files keep configs isolated |

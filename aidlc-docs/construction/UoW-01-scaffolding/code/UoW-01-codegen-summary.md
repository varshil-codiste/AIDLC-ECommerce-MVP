# Code Generation Summary — UoW-01

**Unit**: UoW-01 — Project scaffolding + monorepo + CI + dev scripts
**Generated at**: 2026-05-04T00:30:00Z
**Plan reference**: `UoW-01-code-generation-plan.md` (Gate #3 signed 2026-05-04)

---

## Produced files

53 files across 7 top-level locations. Listed below grouped by location, with deltas vs the plan flagged.

### Repo root (11 files)
- `package.json` (workspace root, declares pnpm@9.12.0)
- `pnpm-workspace.yaml`
- `.nvmrc` (`22`)
- `.editorconfig`
- `.gitignore` (augmented from existing)
- `.gitattributes`
- `.prettierrc.cjs`
- `tsconfig.base.json`
- `.env.example`
- `README.md`
- `lint-staged.config.cjs`

### `web/` (13 files)
- `package.json`, `next.config.mjs`, `tsconfig.json`, `.eslintrc.cjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`
- `app/layout.tsx` — `<html lang="en-IN">` + `<title>` (NFR-A11Y-08)
- `app/page.tsx` — placeholder redirect to `/chat` (route lands in UoW-05)
- `app/globals.css`
- `lib/log.ts` — structured-JSON shim (10 codiste-required base fields)
- `tests/smoke.spec.tsx` — 2 assertions on layout (lang + title)

### `api/` (15 files)
- `package.json`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `.eslintrc.js`, `vitest.config.ts`, `.env.example`
- `vitest.e2e.config.ts` — **added beyond plan** (separates unit + e2e; rationale: keeps unit fast in `pnpm test`)
- `src/main.ts` — Nest bootstrap with pino logger
- `src/app.module.ts` — root module
- `src/health/health.module.ts`
- `src/health/health.controller.ts`
- `src/health/health.controller.spec.ts` — 2 assertions
- `prisma/schema.prisma` — generator + datasource only
- `test/app.e2e-spec.ts` — GET /health → 200

### `shared/` (6 files)
- `openapi.yaml` — OpenAPI 3.1 with `/health` + `Problem` schema (RFC 7807)
- `package.json`
- `tsconfig.json` — **added beyond plan** (rationale: typecheck script needed it)
- `types/index.ts` — `HealthResponse` interface
- `widget-schemas/.gitkeep`
- `intents/.gitkeep`

### `infra/` (3 files)
- `docker-compose.yml` — postgres (`pgvector/pgvector:pg15`) + redis 7
- `postgres/init.sql` — `vector`, `pgcrypto`, `citext` extensions + `app` / `audit` schemas
- `README.md`

### `scripts/` (5 files)
- `dev.sh`, `ci.sh`, `ci-web.sh`, `ci-api.sh` — all `+x`
- `seed-pilot-users.ts` — stub (TODO marker for UoW-02)

### `.github/workflows/` (1 file)
- `ci.yml` — least-privilege `permissions: contents: read`; path-filter via `dorny/paths-filter@v3`; postgres + redis services for the api job

---

## Deviations from the plan

| Deviation | File(s) | Rationale |
|-----------|---------|-----------|
| Added `api/vitest.e2e.config.ts` | api | Separates unit from e2e so `pnpm test` stays fast; e2e runs only on CI's api job |
| Added `shared/tsconfig.json` | shared | Required for `pnpm -r typecheck` to walk the shared package |
| Renamed `web/tests/smoke.spec.ts` → `.spec.tsx` | web | `.tsx` needed because the test type-checks JSX in `<RootLayout>` |
| `.gitignore` augmented in place rather than overwritten | root | Honored existing `.env`/`.env.local`/`.env.*.local` pattern; appended new sections (deps, build, logs, test artifacts, OS, IDE, prisma, docker volumes) |

All deviations are minor and serve the same compliance requirements as the planned files. None introduce new dependencies or change the public surface.

---

## Dependencies introduced

### Root (devDeps): prettier 3.3.3, typescript 5.6.2, @redocly/cli 1.25.5

### `web/` (15 packages, MIT/Apache only)
next 14.2.15, react 18.3.1, react-dom 18.3.1, @testing-library/{jest-dom 6.5.0, react 16.0.1}, @types/{node 22.7.4, react 18.3.11, react-dom 18.3.0}, @vitejs/plugin-react 4.3.2, autoprefixer 10.4.20, eslint 8.57.1, eslint-config-next 14.2.15, jsdom 25.0.1, postcss 8.4.47, tailwindcss 3.4.13, typescript 5.6.2, vitest 2.1.2

### `api/` (16 packages, MIT/Apache only)
@nestjs/{common,core,platform-express,testing} 10.4.4, @nestjs/cli 10.4.5, @nestjs/schematics 10.2.0, @prisma/client 5.20.0, prisma 5.20.0, pino 9.4.0, pino-pretty 11.2.2, reflect-metadata 0.2.2, rxjs 7.8.1, @types/{express 5.0.0, node 22.7.4, supertest 6.0.2}, eslint 8.57.1, eslint-config-prettier 9.1.0, supertest 7.0.0, ts-{loader 9.5.1, node 10.9.2}, tsconfig-paths 4.2.0, typescript 5.6.2, vitest 2.1.2

All licenses confirmed MIT / Apache 2.0 / BSD via npm registry metadata. CI step at the end of `ci-{web,api}.sh` will catch any AGPL/GPL drift on every PR.

---

## Acceptance criteria status (from `functional-design.md` § 12)

| AC | Status | Verification |
|----|--------|-------------|
| `dev.sh` brings web + api + Postgres + Redis up; `/health` 200 | **Coded** | Verified at Stage 13 (Code Review) |
| GH Actions runs `ci.sh`, ≤ 3 min on clean cache | **Coded** | Verified at Stage 13 + first CI run |
| `web/` and `api/` lint zero errors / zero warnings | **Coded** | Verified at Stage 13 (lint sub-check) |
| Lockfile audit zero high/critical CVEs | **Coded** | Verified at Stage 13 (security sub-check) |

---

## What I did NOT touch

- `aidlc-docs/` (per the plan)
- `.aidlc/` (rule files — read-only)
- `.env` (the existing file with the user's secrets)
- `CLAUDE.md` (read-only)

---

## Next step

**Stage 13 Code Review for UoW-01** — runs lint + security (SAST + license audit) + tests + AI review on the 53 files, then emits a PROCEED / BLOCK verdict in `UoW-01-code-review-signoff.md` (Gate #4). Pod countersigns.

If Gate #4 = PROCEED, we move on to UoW-02 (Auth + role gate).

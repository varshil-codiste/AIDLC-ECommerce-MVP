# Tech Stack Decisions — UoW-01 Project Scaffolding

**Unit**: UoW-01
**Locked at**: 2026-05-04T00:28:00Z
**Source**: stack-selection-questions.md Q1–Q7 = A on every question

These decisions are **inherited by every later UoW** unless explicitly overridden.

---

## Frontend (Web)

| Decision | Value |
|----------|-------|
| Framework | **Next.js 14** (App Router) |
| UI library | Tailwind + shadcn/ui (codiste preset) |
| Server-state | TanStack Query (codiste preset; introduced when needed in UoW-05) |
| Test runner | Vitest |
| Lint / format | ESLint + Prettier |
| Conventions file | `construction/stacks/web-conventions.md` (loaded for codegen) |

## Backend (Node.js)

| Decision | Value |
|----------|-------|
| Framework | **NestJS 10** |
| ORM | **Prisma 5** |
| Logger | pino (codiste preset) |
| Test runner | Vitest |
| Lint / format | ESLint + Prettier |
| Conventions file | `construction/stacks/be-node-conventions.md` (loaded for codegen) |

## Cross-cutting

| Decision | Value |
|----------|-------|
| Package manager | **pnpm** (workspaces) |
| Node.js version | **22 LTS** (pinned in `.nvmrc` + `package.json` engines) |
| TypeScript | 5.x strict mode |
| Contract format | OpenAPI 3.1 (codiste preset; per ADR-005) |
| Auth | JWT RS256 + argon2id (locked at Stage 4 / Stage 6) |
| Vector store | pgvector (locked at ADR-002) |
| Event bus | Redis Streams (locked at ADR-004) |

## Out-of-scope for UoW-01 (deferred to later UoWs / Stage 16)

- LLM provider choice → finalized in UoW-11 (highest LLM-cost UoW; cost projection required)
- Cloud target → Stage 11 of a later UoW + Stage 16 IaC
- Datadog deferred — using OTel + self-hosted Grafana per BR § 2.3 hybrid-lean

---

## Conventions files referenced (already in `.aidlc/aidlc-rule-details/construction/stacks/`)

| File | Loaded for |
|------|-----------|
| `web-conventions.md` | Stage 12 Part 2 codegen for `web/` |
| `be-node-conventions.md` | Stage 12 Part 2 codegen for `api/` |

# Stack Selection — UoW-07 (Product Agent + Product Tools)

**Generated at**: 2026-05-05T16:30:00Z  
**Tier**: Greenfield (Comprehensive)  
**Mode**: Brownfield confirmation — all stacks established in prior UoWs

---

## Frontend (Web)

| Choice | Value | Established in |
|--------|-------|---------------|
| Framework | Next.js 15 (App Router) | UoW-05 |
| UI library | Tailwind CSS + clsx/tailwind-merge | UoW-05 |
| Server state | N/A — widget-based SSE push | UoW-05 |
| Widget validation | AJV 8 + ajv-formats | UoW-05 |
| Test framework | Vitest + @testing-library/react | UoW-05 |
| Lint / format | ESLint + Prettier | UoW-05 |

**New in UoW-07**: 2 new widget components + 2 new AJV schemas (no new packages needed).

---

## Backend Node.js

| Choice | Value | Established in |
|--------|-------|---------------|
| Framework | NestJS 10 | UoW-01 |
| ORM | Prisma 5 | UoW-03 |
| Test framework | Vitest | UoW-01 |
| Lint / format | ESLint + Prettier | UoW-01 |
| LLM client | openai SDK + @anthropic-ai/sdk | UoW-06 |
| Redis | ioredis via RedisService | UoW-01 |

**New in UoW-07**: `LlmTool` type added to `orchestrator.types.ts`. No new packages.

---

## Agent (AGT)

| Choice | Value | Established in |
|--------|-------|---------------|
| Agent pattern | `IAgent` AsyncGenerator via `AGENT_REGISTRY` | UoW-06 |
| Prompt loading | `PromptLoaderService` (.txt files, versioned) | UoW-06 |
| Tool dispatch | `ILlmProvider.complete()` → parse tool_call → service call | UoW-07 (new pattern) |
| Eval framework | Vitest test file with golden-path cases | UoW-07 (new) |

---

## Shared

| Choice | Value |
|--------|-------|
| Contract format | Shared TypeScript types (monorepo) |
| Cloud target | Self-hosted VPS (docker-compose) |
| Queue | N/A for UoW-07 |
| Vector store | N/A for UoW-07 (deferred to UoW-11) |

---

## NFR Constraint Compliance

| NFR | Stack choice | Compliant? |
|-----|-------------|-----------|
| NFR-07-PERF-01 (< 1.5 s first token) | openai SDK streaming | ✅ |
| NFR-07-PERF-03 (< 500 ms search) | Prisma `findMany` ILIKE | ✅ (MVP scale) |
| NFR-07-REL-04 (atomic writes) | Prisma `$transaction` | ✅ |
| NFR-07-MAINT-04 (AJV schemas) | AJV already installed | ✅ |

---

## Conventions Files Loaded

- `construction/stacks/node-conventions.md` — NestJS directory layout, naming rules
- `construction/stacks/frontend-conventions.md` — Next.js App Router, component patterns

---

## Stack Selection Checklist

- [x] All stacks in scope have all framework choices confirmed
- [x] Conventions files loaded for both stacks
- [x] NFR constraints honored — no contradictions
- [x] Cloud target confirmed (self-hosted, docker-compose)
- [x] No queue or vector store needed for UoW-07
- [x] Brownfield inheritance confirmed — no new framework introduced
- [x] No new npm packages required

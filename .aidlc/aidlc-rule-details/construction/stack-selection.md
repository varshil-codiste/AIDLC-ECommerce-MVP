# Stack Selection & Setup

**Stage**: 11 (always-execute, per-UoW)
**Purpose**: For each supported stack present in this Unit of Work, pick the framework / state-management approach / database / cache / queue, then load the matching `stacks/*-conventions.md` file so Code Generation knows the conventions. **This workflow does NOT bake in framework defaults — every UoW gets an explicit choice.**

---

## Why This Stage Exists

Teams using this workflow serve many clients, and the right framework varies by project:
- One client may want NestJS for type-safe DI; another may want Express for minimalism
- A data-heavy Python service is FastAPI; an admin-rich one is Django
- An AI/ML pipeline is FastAPI + Pydantic + LangChain; a high-throughput service is Go + Gin

Forcing one default would make the workflow wrong half the time. So AI-DLC asks the user **per UoW** and records the decision so it's auditable.

---

## When to Execute

**Always execute** for every UoW in the Construction loop. If the UoW is purely brownfield (modifying existing code, no new framework introduction), the AI may propose to **inherit** the existing stack and ask the pod to confirm rather than ask all framework questions afresh.

---

## Prerequisites

- Stage 10 (NFR Design) complete or skipped
- `{unit}-nfr-requirements.md` and `{unit}-tech-stack-decisions.md` exist (constraints from NFR known)
- Detected stacks for this UoW are known from `unit-of-work.md` § Stacks involved

---

## Execution Steps

### Step 1: Determine Which Stacks Apply

From `aidlc-docs/inception/units/unit-of-work.md` § <this UoW> § Stacks involved, list the stacks the user marked. For each stack, run the matching question block in Step 2.

If brownfield: detect the existing framework already in use for this stack (from `inception/reverse-engineering/stacks/<stack>.md` or by re-scanning); pre-fill the question with the detected choice and ask the pod to confirm.

### Step 2: Generate `{unit}-stack-selection-questions.md`

Include only the blocks for stacks present in this UoW.

```markdown
# Stack Selection — <unit>

## Block A — Frontend (Web) (only if FE in scope)

### Question A.1
Which frontend framework should we use for this UoW?

A) React (with Vite or CRA) — flexibility, ecosystem
B) Next.js — SSR/SSG, App Router, integrated routing
C) Vue (Nuxt) — composition API, smaller bundles
D) Astro — content-heavy / partial hydration
X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question A.2
Which UI library / styling approach?

A) Tailwind + shadcn/ui (Recommended for new projects)
B) Tailwind + Headless UI / Radix
C) MUI / Mantine / Chakra (component-rich library)
D) CSS Modules / vanilla-extract (no UI lib)
X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question A.3
Server-state management?

A) TanStack Query (React Query)
B) RTK Query
C) SWR
D) None — use fetch directly
X) Other

[Answer]:

## Block B — Backend Node.js (only if BE-Node in scope)

### Question B.1
Which Node.js framework?

A) NestJS — opinionated, TS-first, DI + decorators
B) Express — minimal, layered architecture
C) Fastify — performance-focused, plugin architecture
D) Hono — lightweight, edge-runtime friendly
X) Other

[Answer]:

### Question B.2
ORM / DB layer?

A) Prisma — type-safe, generated client
B) Drizzle — SQL-first, lightweight
C) TypeORM — class-based
D) Knex / raw SQL
X) Other

[Answer]:

### Question B.3
Test framework?

A) Vitest (Recommended for modern stacks)
B) Jest
C) Node:test (built-in)
X) Other

[Answer]:

### Question B.4
Lint / format?

A) ESLint + Prettier (Recommended)
B) Biome (Recommended for monorepos)
C) ESLint only
X) Other

[Answer]:

## Block C — Backend Python (only if BE-Python in scope)

### Question C.1
Which Python framework?

A) FastAPI + Pydantic + SQLAlchemy 2.x — async, type-driven
B) Django + DRF — batteries included
C) Flask + extensions — minimalist
D) LiteStar — alternative async stack
X) Other

[Answer]:

### Question C.2
Package manager?

A) uv (Recommended for new projects — fast, lockfile-friendly)
B) Poetry
C) pip + requirements.txt
D) Pipenv
X) Other

[Answer]:

### Question C.3
Test / lint / type-check?

A) pytest + ruff + mypy (Recommended)
B) pytest + ruff + pyright
C) pytest + black + flake8 + mypy
X) Other

[Answer]:

## Block D — Backend Go (only if BE-Go in scope)

### Question D.1
Which Go web layer?

A) stdlib net/http + chi/echo router (clean architecture)
B) Gin — most popular framework
C) Fiber — Express-like, very fast
D) Echo — minimalist alternative
X) Other

[Answer]:

### Question D.2
Project layout?

A) cmd/ + internal/ + pkg/ (clean architecture, Recommended)
B) Flat — single main.go + handlers/
X) Other

[Answer]:

### Question D.3
Test / lint?

A) go test + golangci-lint (Recommended)
B) go test + staticcheck
X) Other

[Answer]:

## Block E — Mobile Flutter (only if Mobile in scope)

### Question E.1
State-management approach?

A) Riverpod + Clean Architecture (Recommended for production apps)
B) BLoC pattern
C) Provider + simpler MVVM
D) Redux / GetX
X) Other

[Answer]:

### Question E.2
Architecture layout?

A) lib/ split into presentation / domain / data (Recommended)
B) Feature-first folders (lib/features/<feature>/)
C) Flat lib/ with screens, widgets, services
X) Other

[Answer]:

### Question E.3
Test framework?

A) flutter_test (built-in) + mocktail (Recommended)
B) flutter_test + mockito
X) Other

[Answer]:

## Block F — Shared

### Question F.1
Cross-stack contract format?

A) OpenAPI (REST) — auto-codegen for FE/BE/Mobile
B) GraphQL SDL — typed schema, flexible queries
C) Protobuf / gRPC — binary, strongly typed
D) Shared TypeScript types (monorepo only)
X) Other

[Answer]:

### Question F.2
Cloud target (informs IaC stage)?

A) AWS
B) GCP
C) Azure
D) Self-hosted / on-prem
E) Mixed
X) Other (please describe after [Answer]: tag below)

[Answer]:

### Question F.3 (only if NFR Design has LC-002 Job Queue)
Queue / message broker?

A) Redis (BullMQ / Asynq / Celery+Redis)
B) RabbitMQ
C) NATS JetStream
D) AWS SQS / GCP Pub/Sub / Azure Service Bus (managed)
X) Other

[Answer]:

### Question F.4 (only if NFR Design has LC-003 Vector Store — AI/ML extension)
Vector store?

A) pgvector (Postgres extension) — co-locate with main DB
B) Pinecone — managed, scaled
C) Qdrant — open-source, self-hostable
D) Weaviate
X) Other

[Answer]:
```

Wait for answers. Validate per `common/question-format-guide.md`.

### Step 3: Resolve and Record Choices

Generate `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md`:

```markdown
# Stack Selection — <unit>

**Generated at**: <ISO>
**Tier**: <…>

## Frontend
| Choice | Value |
|--------|-------|
| Framework | <e.g., Next.js 14 (App Router)> |
| UI library | <e.g., Tailwind + shadcn/ui> |
| Server state | <…> |

## Backend Node.js
…

## Backend Python
…

## Backend Go
…

## Mobile Flutter
…

## Shared
| Choice | Value |
|--------|-------|
| Contract format | <…> |
| Cloud target | <…> |
| Queue | <…> |
| Vector store | <…> |

## Conventions Files Loaded
- `construction/stacks/frontend-conventions.md` (because FE chosen)
- `construction/stacks/node-conventions.md`
- ...
```

### Step 4: Load Stack Conventions

For each stack in scope, load the matching `construction/stacks/*-conventions.md`:
- Frontend → `frontend-conventions.md`
- Backend Node → `node-conventions.md`
- Backend Python → `python-conventions.md`
- Backend Go → `go-conventions.md`
- Mobile Flutter → `flutter-conventions.md`

These conventions files contain the directory layout, lint config, test framework expectations, and naming rules that Code Generation (Stage 12) and Code Review (Stage 13) will enforce.

### Step 5: Stage Checklist

`{unit}-stack-selection-checklist.md`:
- [ ] Every stack in scope has all framework choices made
- [ ] Conventions file loaded for every chosen stack
- [ ] NFR constraints honored (e.g., if NFR-PERF-001 rules out Django, Django wasn't chosen)
- [ ] Cloud target set
- [ ] Queue / vector store decisions made if NFR Design listed those components
- [ ] If brownfield: existing-stack inheritance confirmed by pod (not silently auto-inherited)

### Step 6: Completion Message

```markdown
# Stack Selection — <unit> — Complete ✅

**Choices**:
- FE: <…>
- BE Node: <…>
- BE Python: <…>
- BE Go: <…>
- Mobile: <…>
- Cloud: <…>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to Code Generation (Stage 12)
```

---

## Team Defaults & Rationale

This stage explicitly does NOT bake in defaults. The "(Recommended)" tags in question options reflect the most common team choice for *new greenfield* projects, but every project has the right to deviate.

The pod is responsible for honest selection. If a junior pod picks a stack the AI knows is incompatible with NFRs (e.g., a synchronous Django stack against an SLO requiring 5K QPS streaming responses), the AI MUST flag this in `audit.md` and propose a re-select.

---

## Anti-patterns

- ❌ Auto-picking a framework based on AI preference without asking
- ❌ Choosing a framework that contradicts NFR constraints from Stage 9
- ❌ Mixing two frameworks for the same stack in the same UoW (e.g., NestJS + Express)
- ❌ Skipping the conventions-file load (Code Generation will fail to enforce conventions)

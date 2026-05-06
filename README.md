# Chat-Native E-Commerce Platform — Multi-Agent MVP

Internal/demo MVP of a chat-only e-commerce surface. A role-aware LLM orchestrator routes messages to 5 specialized agents (Product, Cart, Order, Customer, Checkout) that render rich inline widgets in chat.

This repository was scaffolded by AI-DLC at Stage 12 / UoW-01. Subsequent UoWs add real functionality.

## Repo layout

```
.
├── web/        # Next.js 14 (App Router) — chat UI
├── api/        # NestJS 10 modular monolith — orchestrator + agents + Core API
├── shared/     # OpenAPI 3.1 spec + widget/intent JSON schemas + generated TS types
├── infra/      # docker-compose for local dev (postgres+pgvector, redis)
├── scripts/    # dev.sh, ci.sh, seed scripts
└── aidlc-docs/ # AI-DLC documentation only — never put code here
```

## Prerequisites

- Node.js **22 LTS** (see `.nvmrc`; recommend `nvm use`)
- pnpm **9+** (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker + Docker Compose (for local Postgres + Redis)

## Quickstart

```bash
# 1. Clone, then:
cp .env.example .env           # fill in any secrets you want non-default

# 2. Bring everything up
bash scripts/dev.sh
```

This starts Postgres + Redis via docker-compose and runs the api + web dev servers.

- Web: http://localhost:3000
- API health: http://localhost:3001/health

## Running CI locally

```bash
bash scripts/ci.sh
```

Runs lint + typecheck + tests for both `web/` and `api/`.

## Scaffold scope (UoW-01 only)

This commit lands ONLY:
- The monorepo skeleton (web / api / shared / infra / scripts)
- A `/health` endpoint
- The CI pipeline shape
- Smoke tests

No business logic, no agents, no auth flow yet — those land in UoW-02 onward.

## Apple Silicon note

The default postgres image in `infra/docker-compose.yml` is `pgvector/pgvector:pg15`, which ships arm64 binaries since 2024. If `docker compose pull` is slow, that's the registry latency, not a platform issue.

## Where to find documentation

- AI-DLC artifacts: `aidlc-docs/`
- Architecture: `aidlc-docs/inception/application-design/application-design.md`
- Per-UoW design: `aidlc-docs/construction/UoW-XX/`

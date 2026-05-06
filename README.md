# AIDLC ECommerce MVP

A **chat-native e-commerce platform** built entirely via the [AI-DLC](https://github.com/CodisteEmeringTech) workflow. Shoppers and merchants interact through a conversational UI; a multi-agent LLM orchestrator handles every action and renders rich inline widgets in chat.

Built on: **NestJS 11 + Prisma 6 + PostgreSQL 16 (pgvector) + Next.js 15 + React 19**  
Delivered in 12 Units of Work — 540 tests, 7 AI agents, 21 accessible widgets.

---

## Feature Overview

| Capability | Agents / Widgets |
|-----------|-----------------|
| Product search (text + semantic) | ProductAgent · ProductCard · ProductCarousel · ProductComparison |
| Cart management | CartAgent · CartSummary |
| Checkout (simulated payment) | CheckoutAgent · PaymentWidget · ConfirmationPrompt |
| Order management + returns | OrderAgent · OrderCard · OrderList · OrderStatusUpdate · TrackingWidget |
| Customer profile + LTV | CustomerAgent · CustomerCard |
| Merchant dashboard | ProductAgent (merchant) · DashboardDigest · BulkProductPreview · ProductEditPreview · AttentionSummary |
| In-app notifications | NotificationInbox |
| LLM cost telemetry | OTel traces + `llm_cost_usd_total` Prometheus metric |

---

## Repo layout

```
.
├── api/              # NestJS 11 modular monolith
│   ├── src/
│   │   ├── auth/           # JWT + role guard (shopper / merchant)
│   │   ├── core/           # Products, Orders, Customers, Cart, Address CRUD
│   │   ├── orchestrator/   # SSE gateway + 7 LLM agents
│   │   │   └── agents/     # product / order / customer / cart / checkout / notification / search
│   │   ├── telemetry/      # OTel SDK + LLM cost recorder
│   │   └── notifications/  # In-app notification service + inbox
│   └── prisma/             # Schema + migrations (PostgreSQL + pgvector)
├── web/              # Next.js 15 (App Router)
│   ├── app/                # Chat page, login page, layout
│   ├── components/
│   │   └── widgets/        # 21 AJV-validated widget components
│   ├── widget-schemas/     # 16 JSON schema files (AJV runtime validation)
│   └── tests/              # 250 Vitest + RTL + fast-check tests
├── shared/           # OpenAPI 3.1 spec + shared TS types
├── infra/            # docker-compose for local dev (postgres+pgvector, redis)
├── scripts/          # dev.sh, ci.sh, db-seed.ts
├── .aidlc/           # AI-DLC rule files (workflow engine)
└── aidlc-docs/       # AI-DLC generated artifacts (docs only — no code)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22 LTS (see `.nvmrc`) |
| pnpm | 9+ (`corepack enable && corepack prepare pnpm@9.12.0 --activate`) |
| Docker + Compose | Any recent version |

---

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/varshil-codiste/AIDLC-ECommerce-MVP.git
cd AIDLC-ECommerce-MVP

# 2. Set up env
cp .env.example .env               # edit as needed — defaults work for local dev

# 3. Start everything (Postgres + pgvector, Redis, API, Web)
bash scripts/dev.sh
```

| Service | URL |
|---------|-----|
| Web chat UI | http://localhost:3000 |
| API health | http://localhost:3001/api/v1/health |
| API (all routes) | http://localhost:3001/api/v1/ |

### Seed data

```bash
pnpm --filter api exec tsx prisma/seed.ts
```

Creates 1 merchant user, 1 shopper user, 20 products with variants, sample orders.

Default credentials (local dev only):
- Merchant: `merchant@example.com` / `Password1!`
- Shopper: `shopper@example.com` / `Password1!`

---

## Running Tests

```bash
bash scripts/ci.sh          # lint + typecheck + all tests (API + Web)

# Or individually:
pnpm --filter api test       # 290 API tests (Vitest)
pnpm --filter web test       # 250 web tests (Vitest + RTL + fast-check)
```

---

## Production Deployment

### Requirements
- VPS with 2 vCPU / 4 GB RAM minimum (Hetzner CX21 or equivalent)
- Docker + Docker Compose installed
- Domain with DNS A record pointing to VPS IP

### Deploy

```bash
# 1. SSH into VPS
ssh user@<vps-ip>

# 2. Clone repo and configure secrets
git clone https://github.com/varshil-codiste/AIDLC-ECommerce-MVP.git /opt/aidlc-ecommerce
cd /opt/aidlc-ecommerce
cp .env.example .env.prod          # fill all required values (see below)

# 3. Run database migrations
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# 4. Start production stack
docker compose -f docker-compose.prod.yml up -d

# 5. (Optional) Start observability stack
docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml up -d
```

### Required environment variables (`.env.prod`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (with pgvector extension) |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | RS256 private key PEM |
| `JWT_PUBLIC_KEY` | RS256 public key PEM |
| `LLM_API_KEY` | OpenAI API key |
| `LLM_MODEL` | e.g. `gpt-4o` |
| `EMBEDDING_MODEL` | e.g. `text-embedding-3-small` |
| `SENTRY_DSN` | Sentry project DSN (optional but recommended) |
| `WEB_ORIGIN` | Production web URL for CORS (e.g. `https://yourdomain.com`) |
| `ALERT_EMAIL` | Email address for Grafana alert notifications |

See `.env.example` for the full list with descriptions.

---

## Architecture

```
Browser (Next.js 15)
  └─ SSE stream ──────────────────────────────────────────────────────────┐
                                                                           ↓
                                                              NestJS Orchestrator
                                                              ├── ProductAgent      (OpenAI gpt-4o)
                                                              ├── OrderAgent        (OpenAI gpt-4o)
                                                              ├── CustomerAgent     (OpenAI gpt-4o)
                                                              ├── CartAgent         (OpenAI gpt-4o)
                                                              ├── CheckoutAgent     (OpenAI gpt-4o)
                                                              ├── NotificationAgent (OpenAI gpt-4o)
                                                              └── SearchAgent       (pgvector + text-embedding-3-small)
                                                                           │
                                                             ┌─────────────┴─────────────┐
                                                        PostgreSQL 16              Redis
                                                        (pgvector ext.)            (sessions + rate limit)
```

Each agent emits typed **widget payloads** validated against JSON schemas (AJV 8). The SSE client renders them as React components in the chat stream.

---

## AI-DLC Workflow Artifacts

Full design history, business requirements, per-UoW specs, code review reports, and gate sign-offs are in `aidlc-docs/`:

```
aidlc-docs/
├── inception/           # BRs, user stories, application design, workflow plan
├── construction/        # Per-UoW: functional design, NFRs, code plans, Gate #3/#4 sign-offs
│   ├── UoW-01-scaffolding/
│   ├── UoW-02-auth/
│   ├── ...
│   └── UoW-12-confirmation-widgets-a11y/
└── operations/          # Deployment guide, observability, production readiness (Gate #5)
```

---

## Technology Stack

| Layer | Choice |
|-------|--------|
| API Framework | NestJS 11 |
| ORM | Prisma 6 (multiSchema) |
| Database | PostgreSQL 16 + pgvector |
| Cache / Sessions | Redis 7 (ioredis 5.4) |
| Auth | JWT RS256 via `@nestjs/passport` |
| LLM Provider | OpenAI (`gpt-4o` + `text-embedding-3-small`) |
| Tracing | OpenTelemetry SDK 0.57 |
| Frontend | Next.js 15 + React 19 (App Router) |
| Styling | Tailwind CSS |
| Schema Validation | AJV 8 + ajv-formats |
| Testing (API) | Vitest + fast-check 3.22 |
| Testing (Web) | Vitest + @testing-library/react + fast-check 3.22 |
| Containerisation | Docker + Docker Compose |
| Reverse Proxy | Caddy (TLS auto-obtain) |
| Observability | Grafana + Prometheus + Loki + Sentry |

---

## License

MIT

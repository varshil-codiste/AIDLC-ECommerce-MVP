# Stack Selection — UoW-06 (Orchestrator Core + LLM + SSE Server)

**Generated at**: 2026-05-05T15:35:00Z

---

## Existing Dependencies Leveraged (no new install)

| Package | Already at | Role in UoW-06 |
|---------|-----------|----------------|
| `ioredis` | 5.4.1 | `PendingConfirmation` storage; `confirm:<intentId>` keys with TTL |
| `fast-check` | 3.22.0 (dev) | Role-gate property tests (NFR-ORC-PBT-001) |
| `@nestjs/config` | present | `LLM_PROVIDER`, `LLM_MODEL`, `LLM_MAX_TOKENS_OUT`, `LLM_API_KEY` env vars |
| `rxjs` | present (NestJS peer) | `Observable<MessageEvent>` for SSE; `merge`, `interval`, `catchError`, `finalize` |
| `pino` | present (UoW-04) | Structured logging per turn |
| `@opentelemetry/api` | present (UoW-04) | Span creation per orchestrator turn + agent call |
| `@nestjs/throttler` | check needed | Rate-limiting guard for `/orchestrator/**` |

---

## New Dependencies

| Package | Version | Role | Rationale |
|---------|---------|------|-----------|
| `openai` | `^4.x` | OpenAI SDK | Streaming chat completions; `openai.chat.completions.stream()` |
| `@anthropic-ai/sdk` | `^0.39.x` | Anthropic SDK | Alternative LLM provider; same streaming interface |
| `@nestjs/throttler` | `^6.x` | Rate-limiting | NFR-ORC-SEC-003 — 60 req/min per user on orchestrator endpoints |

---

## Architecture Decisions

### AD-ORC-01: OpenAI as Default Provider; Anthropic as Secondary

**Decision**: Ship with `openai` SDK as the default `ILlmProvider` impl. `LLM_PROVIDER=openai` is the default env var value. `@anthropic-ai/sdk` installed as secondary to allow hot-swap via env var change + redeploy.

**Rationale**: OpenAI's streaming API is more mature; `gpt-4o-mini` offers the best cost/performance for internal pilot scale (5–10 users). Anthropic is installed now to avoid a dependency PR mid-milestone.

**Model default**: `LLM_MODEL=gpt-4o-mini` (configurable via env). Cost: ~$0.15/1M tokens in, $0.60/1M out — well within the $25K budget for internal pilot.

**Alternatives considered**:
- Single-provider only — rejected (vendor lock-in risk cited in BR)
- Langchain.js — rejected (heavy abstraction; slower streaming; harder to control token budgets)

---

### AD-ORC-02: RxJS Observable for SSE (not `@nestjs/event-emitter`)

**Decision**: `@Sse` NestJS decorator returns `Observable<MessageEvent>` built with `new Observable(subscriber => ...)`. Heartbeat merged via `merge(turn$, heartbeat$)`.

**Rationale**: Native NestJS SSE support is Observable-based. RxJS operators (`catchError`, `finalize`, `merge`) provide clean error handling and resource cleanup without custom EventEmitter plumbing.

**Alternatives considered**:
- Custom `PassThrough` stream — more control but no built-in operators; error handling fragile
- WebSockets — explicitly out of scope (FR-CHAT-07)

---

### AD-ORC-03: Redis TTL for Confirmation State (not Postgres)

**Decision**: `PendingConfirmation` stored in Redis with `SETEX confirm:<intentId> 300 <json>`. Not a Postgres row.

**Rationale**: 5-minute TTL is a natural Redis use case; Redis handles auto-expiry without a cron job. Confirmation state is ephemeral — if Redis restarts, the worst case is the user must re-initiate the action (graceful degradation). Postgres row would require a cleanup job.

**Tradeoff**: Redis AOF persistence must be enabled (NFR-ORC-RELI-003) to survive restarts during the TTL window. Already configured in UoW-01 docker-compose.

---

### AD-ORC-04: Stub `RouterAgent` for UoW-06; Real Agents in UoW-07+

**Decision**: UoW-06 ships a `RouterAgent` that performs LLM-based intent classification and returns a `handoff` output. The harness is fully wired; the stub returns `handoff` to a `NoopAgent` that emits a text response "Agent coming soon."

**Rationale**: Decouples orchestrator infrastructure from agent business logic. Gate #4 for UoW-06 can be completed without real agents. UoW-07 replaces `NoopAgent` with `ProductAgent`.

---

## New Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `openai` | Which provider to use (`openai` or `anthropic`) |
| `LLM_MODEL` | `gpt-4o-mini` | Model identifier passed to provider SDK |
| `LLM_API_KEY` | — | Provider API key (required; no default) |
| `LLM_MAX_TOKENS_IN` | `4000` | Per-turn input token cap |
| `LLM_MAX_TOKENS_OUT` | `800` | Per-turn output token cap |
| `LLM_SOFT_DEADLINE_MS` | `8000` | AbortController timeout for streaming call |

---

## DB Migrations Required

| # | Migration | Type |
|---|-----------|------|
| 1 | Create `conversations` table | New table |
| 2 | Create `conversation_messages` table | New table |

Both extend the UoW-03 TypeORM migrations foundation. No changes to existing tables.

---

## Confirmation Pass

All pre-locked choices from codiste preset remain valid:
- NestJS modular monolith ✅
- TypeORM + Postgres ✅
- ioredis ✅
- Pino logging ✅
- OTel tracing ✅
- JWT RS256 auth ✅

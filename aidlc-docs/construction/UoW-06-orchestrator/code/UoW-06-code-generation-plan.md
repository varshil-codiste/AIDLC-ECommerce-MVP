# Code Generation Plan — UoW-06 (Orchestrator Core + LLM + SSE Server)

**Tier**: Greenfield (Comprehensive)  
**Stack in scope**: Backend Node.js (NestJS)  
**Stories implemented**: FR-ORCH-01 through FR-ORCH-05, FR-CHAT-03, FR-CHAT-07, NFR-ORC-* (see NFR requirements)  
**Generated at**: 2026-05-05T15:38:00Z

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC`
- **Application code root**: `api/src/orchestrator/` (new module)
- **NEVER write under `aidlc-docs/`**

---

## Dependency Status

| Upstream | Status |
|----------|--------|
| UoW-01 (Scaffolding) | COMPLETE — NestJS, TypeORM, Redis, JWT, pino |
| UoW-02 (Auth) | COMPLETE — JwtAuthGuard, RolesGuard, User entity, JWT decorators |
| UoW-03 (Persistence) | COMPLETE — TypeORM migrations, AuditLog, Outbox |
| UoW-04 (Telemetry) | COMPLETE — OTel SDK, LlmCostMeterService, pino trace mixin |

---

## Steps

### Step 1: Install New Packages

- [x] `pnpm add openai @anthropic-ai/sdk @nestjs/throttler` in `api/`
- [x] Run `pnpm install` from workspace root

**Files modified**: `api/package.json`, `pnpm-lock.yaml`

---

### Step 2: DB Migrations

- [x] `api/src/orchestrator/migrations/001-create-conversations.ts` — `conversations` table
- [x] `api/src/orchestrator/migrations/002-create-conversation-messages.ts` — `conversation_messages` table

**Files created**: 2

---

### Step 3: TypeORM Entities

- [x] `api/src/orchestrator/entities/conversation.entity.ts` — `Conversation` entity
- [x] `api/src/orchestrator/entities/conversation-message.entity.ts` — `ConversationMessage` entity

**Files created**: 2

---

### Step 4: Shared Types

- [x] `api/src/orchestrator/types/orchestrator.types.ts` — `AgentInput`, `AgentOutput`, `AgentName`, `SseEvent`, `WidgetIntent`, `ContextSlice`, `LlmParams`, `LlmResult`, `TurnBudget`

**Files created**: 1

---

### Step 5: LLM Provider Abstraction

- [x] `api/src/orchestrator/llm/llm-provider.interface.ts` — `ILlmProvider` interface
- [x] `api/src/orchestrator/llm/openai-llm.provider.ts` — `OpenAiLlmProvider` impl (streaming)
- [x] `api/src/orchestrator/llm/anthropic-llm.provider.ts` — `AnthropicLlmProvider` impl (streaming)
- [x] `api/src/orchestrator/llm/llm-provider.factory.ts` — factory: reads `LLM_PROVIDER` env, returns correct impl
- [x] `api/src/orchestrator/llm/llm.module.ts` — `LlmModule` with factory provider

**Files created**: 5

---

### Step 6: Prompt Loader

- [x] `api/src/orchestrator/prompts/orchestrator.v1.0.0.txt` — orchestrator system prompt (intent classifier)
- [x] `api/src/orchestrator/prompts/noop-agent.v1.0.0.txt` — stub agent prompt
- [x] `api/src/orchestrator/prompts/prompt-loader.service.ts` — loads + caches `.txt` files at module init

**Files created**: 3

---

### Step 7: PII Redactor

- [x] `api/src/orchestrator/utils/pii-redactor.ts` — `redactPii(text: string): string`; email + E.164 phone regex replacement

**Files created**: 1

---

### Step 8: Agent Registry + Stub Agents

- [x] `api/src/orchestrator/agents/agent.interface.ts` — `IAgent` interface
- [x] `api/src/orchestrator/agents/agent-registry.ts` — `AGENT_REGISTRY` token + provider factory
- [x] `api/src/orchestrator/agents/router.agent.ts` — `RouterAgent`: LLM-based intent classifier, returns `handoff`
- [x] `api/src/orchestrator/agents/noop.agent.ts` — `NoopAgent`: returns `{ type: 'text', content: 'Agent coming soon.' }`

**Files created**: 4

---

### Step 9: Confirmation Service

- [x] `api/src/orchestrator/confirmation/confirmation.service.ts` — `ConfirmationService` (Redis SETEX/GET/DEL for `confirm:<intentId>`)
- [x] `api/src/orchestrator/confirmation/confirmation.guard.ts` — `ConfirmationGuard` (NestJS guard; intercepts destructive intents)
- [x] `api/src/orchestrator/confirmation/destructive-intents.const.ts` — `DESTRUCTIVE_INTENTS` set

**Files created**: 3

---

### Step 10: Dashboard Digest Service

- [x] `api/src/orchestrator/dashboard/dashboard-digest.service.ts` — `DashboardDigestService`: queries orders (today count + revenue), low-stock products, new customers; assembles `dashboard_digest` widget payload

**Files created**: 1

---

### Step 11: Conversation Repository

- [x] `api/src/orchestrator/repositories/conversation.repository.ts` — `ConversationRepository`: create conversation, save/update messages, load prior context (last N messages)

**Files created**: 1

---

### Step 12: Orchestrator Service (Core)

- [x] `api/src/orchestrator/orchestrator.service.ts` — `OrchestratorService`:
  - `streamTurn(dto, user): Observable<MessageEvent>`
  - `dispatchIntent(dto, user): Observable<MessageEvent>`
  - Dashboard digest check (merchant + first turn)
  - Agent dispatch via `AgentRegistry`
  - Handoff chain with depth counter (max 3)
  - SSE event serialization (`token`, `widget`, `done`, `error`)
  - AbortController per turn (soft deadline)
  - Cost recording via `LlmCostMeterService` (fire-and-forget)
  - OTel span per turn + per agent call

**Files created**: 1

---

### Step 13: Controllers

- [x] `api/src/orchestrator/controllers/chat.controller.ts` — `ChatController`: `POST /api/v1/chat/message` (SSE); `@UseGuards(JwtAuthGuard, RoleGuard, ThrottlerGuard)`
- [x] `api/src/orchestrator/controllers/intent.controller.ts` — `IntentController`: `POST /api/v1/orchestrator/intent`; `@UseGuards(JwtAuthGuard, RoleGuard, ConfirmationGuard, ThrottlerGuard)`

**Files created**: 2

---

### Step 14: Orchestrator Module + App Module Registration

- [x] `api/src/orchestrator/orchestrator.module.ts` — `OrchestratorModule`: imports `LlmModule`, `TypeOrmModule.forFeature([Conversation, ConversationMessage])`, `ThrottlerModule`, `RedisModule`; provides all services + guards + registry
- [x] `api/src/app.module.ts` — register `OrchestratorModule` (MODIFY existing file)

**Files created**: 1 | **Files modified**: 1

---

### Step 15: Unit + Integration Tests

- [x] `api/src/orchestrator/tests/orchestrator.service.spec.ts` — mock LLM provider, assert SSE events emitted in correct order; dashboard digest on merchant first turn; handoff chain depth guard
- [x] `api/src/orchestrator/tests/confirmation.service.spec.ts` — Redis mock; set/get/del flow; TTL enforcement
- [x] `api/src/orchestrator/tests/confirmation.guard.spec.ts` — destructive intent blocked without Redis entry; allowed with valid entry
- [x] `api/src/orchestrator/tests/role-gate.pbt.spec.ts` — `fast-check` property tests; cross-product of (role × intent-type × resource); ≥ 36 combinations
- [x] `api/src/orchestrator/tests/pii-redactor.spec.ts` — email and phone patterns redacted; non-PII text unchanged
- [x] `api/src/orchestrator/tests/chat.controller.spec.ts` — SSE endpoint returns 200 text/event-stream; rate limit guard wired
- [x] `api/src/orchestrator/tests/dashboard-digest.service.spec.ts` — mocked DB queries; widget payload shape correct

**Files created**: 7

---

### Step 16: E2E Test

- [x] `api/test/orchestrator-e2e.spec.ts` — full turn: POST /chat/message → collect SSE events → assert `token` + `done` received; assert shopper cannot invoke merchant-only intent (role gate)

**Files created**: 1

---

### Step 17: Code Summary

- [x] `aidlc-docs/construction/UoW-06-orchestrator/code/UoW-06-code-summary.md`

---

## Story Traceability

| FR | Implemented by |
|----|----------------|
| FR-ORCH-01 (LLM intent router) | `RouterAgent`, `OrchestratorService` |
| FR-ORCH-02 (multi-agent handoff) | `OrchestratorService` handoff chain |
| FR-ORCH-03 (widget assembly) | `OrchestratorService` SSE widget event |
| FR-ORCH-04 (confirmation_prompt) | `ConfirmationGuard`, `ConfirmationService` |
| FR-ORCH-05 (merchant dashboard_digest) | `DashboardDigestService`, `OrchestratorService` first-turn check |
| FR-CHAT-03 (token streaming < 1.5 s) | `OrchestratorService` + `ILlmProvider` streaming |
| FR-CHAT-07 (SSE transport) | `ChatController` `@Sse` handler |
| FR-AUTH-04 (role gate) | `RoleGuard`, `ConfirmationGuard` |

---

## Estimated File Count

| Category | Count |
|----------|-------|
| Source files (new) | 27 |
| Test files (new) | 7 (unit) + 1 (e2e) |
| Modified files | 1 (`app.module.ts`) |
| Prompt files | 2 |
| Migration files | 2 |
| **Total** | **40** |

# Code Summary — UoW-06 (Orchestrator Core + LLM + SSE Server)

**Generated**: 2026-05-05T16:03:00Z  
**Status**: COMPLETE — 90/90 tests passing

---

## Files Created (27 source + 8 test + 2 prompt + 1 migration)

### Source Files

| File | Purpose |
|------|---------|
| `api/src/orchestrator/types/orchestrator.types.ts` | Shared type definitions: AgentInput/Output, SseEvent, WidgetIntent, LlmParams/Result, TurnBudget |
| `api/src/orchestrator/llm/llm-provider.interface.ts` | ILlmProvider contract + LLM_PROVIDER injection token |
| `api/src/orchestrator/llm/openai-llm.provider.ts` | OpenAI streaming impl via openai SDK |
| `api/src/orchestrator/llm/anthropic-llm.provider.ts` | Anthropic streaming impl via @anthropic-ai/sdk |
| `api/src/orchestrator/llm/llm-provider.factory.ts` | Factory: reads LLM_PROVIDER env, returns correct impl |
| `api/src/orchestrator/llm/llm.module.ts` | LlmModule with factory provider |
| `api/src/orchestrator/prompts/prompt-loader.service.ts` | Loads + caches .txt prompt files at onModuleInit |
| `api/src/orchestrator/utils/pii-redactor.ts` | redactPii(): email + E.164 phone regex replacement |
| `api/src/orchestrator/agents/agent.interface.ts` | IAgent interface + AGENT_REGISTRY symbol + AgentRegistry type |
| `api/src/orchestrator/agents/agent-registry.ts` | agentRegistryProvider factory: Map with router + noop entries |
| `api/src/orchestrator/agents/router.agent.ts` | RouterAgent: LLM intent classifier → handoff output |
| `api/src/orchestrator/agents/noop.agent.ts` | NoopAgent: yields text "Agent coming soon." |
| `api/src/orchestrator/confirmation/confirmation.service.ts` | Redis SETEX/GET/DEL for confirm:<intentId> with 5-min TTL |
| `api/src/orchestrator/confirmation/confirmation.guard.ts` | ConfirmationGuard: intercepts destructive intents |
| `api/src/orchestrator/confirmation/destructive-intents.const.ts` | DESTRUCTIVE_INTENTS Set: cart.clear, order.cancel, order.refund, customer.anonymize |
| `api/src/orchestrator/dashboard/dashboard-digest.service.ts` | Queries orders/products/customers; builds dashboard_digest widget |
| `api/src/orchestrator/repositories/conversation.repository.ts` | findOrCreate, saveUserMessage, saveAssistantMessage, getPriorContext (last 20) |
| `api/src/orchestrator/orchestrator.service.ts` | Core: streamTurn, streamIntent, dispatchToAgent, handleAgentOutput; takeUntil(done$) heartbeat fix |
| `api/src/orchestrator/controllers/chat.controller.ts` | @Sse('message') on api/v1/chat; @Throttle 60req/min |
| `api/src/orchestrator/controllers/intent.controller.ts` | @Sse('intent') on api/v1/orchestrator; @UseGuards(ConfirmationGuard) |
| `api/src/orchestrator/orchestrator.module.ts` | Imports LlmModule, RedisModule, PrismaModule, TelemetryModule, ThrottlerModule |

### Modified Files

| File | Change |
|------|--------|
| `api/src/app.module.ts` | Added OrchestratorModule import |
| `api/prisma/schema.prisma` | Extended Conversation + Message models with orchestrator fields |

### Prompt Files

| File | Purpose |
|------|---------|
| `api/src/orchestrator/prompts/orchestrator.v1.0.0.txt` | Intent classifier system prompt |
| `api/src/orchestrator/prompts/noop-agent.v1.0.0.txt` | Placeholder agent prompt |

### Migration

| File | Applied |
|------|---------|
| `api/prisma/migrations/20260505160000_UoW-06-001-extend-conversations-messages/migration.sql` | Yes — direct psql + `prisma migrate resolve --applied` |

### Test Files

| File | Tests |
|------|-------|
| `api/src/orchestrator/tests/pii-redactor.spec.ts` | 5 unit tests |
| `api/src/orchestrator/tests/confirmation.service.spec.ts` | 5 unit tests |
| `api/src/orchestrator/tests/confirmation.guard.spec.ts` | 5 unit tests |
| `api/src/orchestrator/tests/role-gate.pbt.spec.ts` | 8 PBT tests (fast-check, 200 runs) |
| `api/src/orchestrator/tests/dashboard-digest.service.spec.ts` | 3 unit tests |
| `api/src/orchestrator/tests/orchestrator.service.spec.ts` | 4 unit tests |
| `api/src/orchestrator/tests/chat.controller.spec.ts` | 3 unit tests |
| `api/test/orchestrator.e2e-spec.ts` | 2 e2e tests |

---

## Key Design Decisions

### SSE Observable Completion (takeUntil fix)
`merge(events$, heartbeat$)` would never complete because `interval(15_000)` is infinite. Fix: introduce `done$` Subject fired in `.finally()` of the async turn, and `takeUntil(done$)` on the heartbeat stream. Both `streamTurn()` and `streamIntent()` use this pattern.

### Prisma over TypeORM
Project uses Prisma throughout. Plan was adapted: no TypeORM entities; instead extended `schema.prisma` and created manual SQL migration (shadow DB cannot run `prisma migrate dev` due to pgvector extension).

### Agent Registry Extensibility
`AGENT_REGISTRY` is a NestJS injection token backed by `Map<string, IAgent>`. Future UoWs add agents by extending the registry factory without touching `OrchestratorService`.

### PII Redaction
Applied before all log calls via `redactPii()`. Covers email RFC 5322 pattern and E.164 phone numbers. Does not reach the LLM prompt (user message is passed as-is to agents but logged redacted).

---

## Test Results

```
Test Files  17 passed (17)
     Tests  90 passed (90)
  Duration  2.83s
```

---

## Story Traceability

| FR | Implemented by |
|----|----------------|
| FR-ORCH-01 | RouterAgent, OrchestratorService |
| FR-ORCH-02 | OrchestratorService handoff chain (MAX_HANDOFF_DEPTH=3) |
| FR-ORCH-03 | OrchestratorService SSE widget event |
| FR-ORCH-04 | ConfirmationGuard + ConfirmationService (Redis TTL 5 min) |
| FR-ORCH-05 | DashboardDigestService + OrchestratorService first-turn merchant check |
| FR-CHAT-03 | ILlmProvider streaming + OrchestratorService token events |
| FR-CHAT-07 | ChatController @Sse handler |
| FR-AUTH-04 | RoleGuard + ConfirmationGuard |

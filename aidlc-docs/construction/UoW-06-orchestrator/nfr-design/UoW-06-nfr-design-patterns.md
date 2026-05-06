# NFR Design Patterns — UoW-06 (Orchestrator Core + LLM + SSE Server)

---

## Pattern 1: Observable SSE Stream (NFR-ORC-RELI-002, NFR-ORC-PERF-001)

**Problem**: NestJS SSE handler must emit tokens as they arrive from the LLM, merge a heartbeat, and always close cleanly with `done` or `error`.

**Solution**: RxJS `Observable<MessageEvent>` returned from `@Sse` handler. Three streams merged:
1. `heartbeat$` — `interval(15_000)` emitting `:keep-alive` SSE comments
2. `turn$` — `Subject<MessageEvent>` fed by the orchestrator service as tokens and widgets arrive
3. Error is caught via `catchError` operator; `finalize` operator ensures observable completes

```
@Sse('/stream')
stream(@Req() req, @Body() dto): Observable<MessageEvent> {
  const turn$ = this.orchestratorService.streamTurn(dto, req.user);
  const heartbeat$ = interval(15_000).pipe(map(() => ({ data: '' } as MessageEvent)));
  return merge(turn$, heartbeat$).pipe(
    catchError(err => of(toErrorEvent(err))),
    finalize(() => this.logger.log('SSE stream closed'))
  );
}
```

**NFRs addressed**: NFR-ORC-RELI-002 (always closes), NFR-ORC-PERF-001 (tokens forwarded immediately), NFR-ORC-OBS-001 (finalize triggers span close)

---

## Pattern 2: LLM Provider Abstraction (NFR-ORC-MAINT-003)

**Problem**: Must support multiple LLM providers (OpenAI, Anthropic) without changing orchestrator logic.

**Solution**: `ILlmProvider` interface injected via NestJS DI. `LlmProviderModule` uses a factory to create the correct implementation from `LLM_PROVIDER` env var.

```
interface ILlmProvider {
  streamCompletion(params: LlmParams): AsyncIterable<string>;  // token deltas
  complete(params: LlmParams): Promise<LlmResult>;              // non-streaming
}
```

Two implementations: `OpenAiLlmProvider` (default) using `openai` SDK with streaming; `AnthropicLlmProvider` using `@anthropic-ai/sdk`. Provider selected by `LLM_PROVIDER=openai|anthropic` env var.

**NFRs addressed**: NFR-ORC-MAINT-003

---

## Pattern 3: Registry-Driven Agent Dispatch (NFR-ORC-MAINT-002)

**Problem**: New agents must be addable without modifying `OrchestratorService`.

**Solution**: `AGENT_REGISTRY` token — a `Map<AgentName, IAgent>` injected into `OrchestratorService`. Each agent module registers itself via `AgentRegistryModule.forAgent(name, AgentClass)`. The orchestrator calls `registry.get(agentName).execute(input)`.

```
interface IAgent {
  execute(input: AgentInput): AsyncIterable<AgentOutput>;
}
```

UoW-06 provides a stub `RouterAgent` that performs intent classification and returns `handoff` to the real agent. Real agents added in UoW-07 onwards.

**NFRs addressed**: NFR-ORC-MAINT-002

---

## Pattern 4: Confirmation Guard (NFR-ORC-RELI-005, BR-ORCH-002)

**Problem**: Destructive intents must be blocked until confirmed — enforced at infrastructure level, not inside agents.

**Solution**: `ConfirmationGuard` NestJS guard applied to `POST /orchestrator/intent`. Checks `isDestructiveIntent(dto.intent)` — if true, checks Redis for `confirm:<intentId>`. On miss: orchestrator emits `confirmation_prompt` widget and returns early. On hit: deletes the Redis key and allows execution.

`ConfirmationService` encapsulates all Redis interaction (get/set/del for `confirm:*` keys).

**NFRs addressed**: NFR-ORC-RELI-005, NFR-ORC-SEC-005

---

## Pattern 5: Prompt Template Versioning (NFR-ORC-AIML-001)

**Problem**: System prompts must be version-controlled and never editable at runtime.

**Solution**: Prompts stored as `.txt` files at `api/src/orchestrator/prompts/<agent>.v<version>.txt`. `PromptLoaderService` reads files at module init via `fs.readFileSync` — not at request time. Active version pinned in `orchestrator.config.ts` constant. Changing prompt requires a deploy (new file + constant update).

**NFRs addressed**: NFR-ORC-AIML-001

---

## Pattern 6: PII Redaction in Logs (NFR-ORC-AIML-004)

**Problem**: User messages may contain PII (email, phone) that must not appear in logs but must pass to the LLM.

**Solution**: `PiiRedactor` utility — regex-based; replaces email-pattern and E.164 phone-pattern occurrences with `[REDACTED]`. Applied to the user message string before it is passed to `pino` logger. The raw message (unredacted) continues to the LLM. Applied in `OrchestratorService.logTurnStart()`.

**NFRs addressed**: NFR-ORC-AIML-004

---

## Pattern 7: Role-Gate Property Tests (NFR-ORC-PBT-001)

**Problem**: Role gate logic must be verified across the full cross-product of role × intent-type × resource — too many combinations for manual test cases.

**Solution**: `fast-check` property tests in `orchestrator/role-gate.spec.ts`. Generates arbitrary (role, intentType, resourceOwner) triples from defined domains; asserts that:
- `merchant` role always passes merchant-only intents
- `shopper` role always fails merchant-only intents
- `shopper` with own resource passes shopper-own intents
- `shopper` with other's resource fails shopper-own intents

**NFRs addressed**: NFR-ORC-PBT-001

---

## Logical Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `ChatController` | NestJS Controller | POST /chat/message → SSE stream; POST /chat/intent alias |
| `IntentController` | NestJS Controller | POST /orchestrator/intent; widget intent entry point |
| `OrchestratorService` | NestJS Service | Turn orchestration: route → dispatch → stream |
| `AgentRegistry` | NestJS Provider | Map of agentName → IAgent; extensible without modifying Orchestrator |
| `RouterAgent` | IAgent impl | Intent classification via LLM; returns `handoff` to named agent |
| `ILlmProvider` | Interface + 2 impls | `OpenAiLlmProvider`, `AnthropicLlmProvider`; streamed completions |
| `ConfirmationService` | NestJS Service | Redis get/set/del for `confirm:<intentId>` keys; 5-min TTL |
| `ConfirmationGuard` | NestJS Guard | Intercepts destructive intents; checks/clears Redis |
| `RoleGuard` | NestJS Guard | Validates JWT role before orchestrator dispatch |
| `PromptLoaderService` | NestJS Service | Loads and caches versioned prompt `.txt` files at init |
| `DashboardDigestService` | NestJS Service | Assembles merchant first-turn digest widget from DB |
| `ConversationRepository` | NestJS Repository | CRUD for `Conversation` and `ConversationMessage` |
| `PiiRedactor` | Utility | Regex-based PII replacement for log-safe message copies |
| `OrchestratorModule` | NestJS Module | Wires all of the above; exports `OrchestratorService` |

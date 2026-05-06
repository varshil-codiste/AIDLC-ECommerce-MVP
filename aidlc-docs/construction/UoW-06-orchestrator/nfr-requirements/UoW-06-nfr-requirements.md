# NFR Requirements — UoW-06 (Orchestrator Core + LLM + SSE Server)

**Tier**: Greenfield — Comprehensive  
**Extensions enforced**: Security Baseline, AI/ML Lifecycle, Property-Based Testing (partial), Accessibility (Level A — N/A for BE-only UoW)

---

## 1. Performance

| ID | NFR | Target | Threshold | Source |
|----|-----|--------|-----------|--------|
| NFR-ORC-PERF-001 | First-token streaming latency (user POST → first SSE `token` event) | < 1.5 s p95 | < 2.0 s hard max | NFR-PERF-01, PRD § 9 |
| NFR-ORC-PERF-002 | Full widget render time (user POST → SSE `done` event with widget payload) | < 3.0 s p95 | < 5.0 s hard max | NFR-PERF-02 |
| NFR-ORC-PERF-003 | Intent routing overhead (classification call latency, excluding LLM streaming) | < 200 ms p99 | — | derived |
| NFR-ORC-PERF-004 | Concurrent SSE streams supported on single instance | ≥ 1,000 | — | NFR-PERF-03 |
| NFR-ORC-PERF-005 | Dashboard digest assembly time (DB query for orders + stock + customers) | < 500 ms p95 | — | FR-ORCH-05 |

---

## 2. Reliability

| ID | NFR | Target | Type | Source |
|----|-----|--------|------|--------|
| NFR-ORC-RELI-001 | Idempotent LLM retry on transient 429/5xx (exponential backoff: 1s → 2s → 4s, max 3 retries) | required | hard | NFR-RELI-01 |
| NFR-ORC-RELI-002 | SSE stream MUST close cleanly (`done` or `error`) — no orphaned connections | required | hard | BR-ORCH-003 |
| NFR-ORC-RELI-003 | Confirmation-prompt Redis entry survives application restart (Redis persistence must be AOF or RDB) | required | hard | BR-ORCH-002 |
| NFR-ORC-RELI-004 | Agent handoff chain terminates at ≤ 3 hops | required | hard | BR-ORCH-005 |
| NFR-ORC-RELI-005 | No destructive tool runs without recorded `confirmation.confirm` intent | required | hard | NFR-RELI-02, BR-ORCH-002 |

---

## 3. Security

| ID | NFR | Target | Type | Source |
|----|-----|--------|------|--------|
| NFR-ORC-SEC-001 | Role gate enforced at orchestrator before agent dispatch — JWT role is authoritative | required | hard | NFR-SEC-06, BR-ORCH-001 |
| NFR-ORC-SEC-002 | Prompt injection defense — user message inserted as `user` role in LLM conversation; never merged into system prompt | required | hard | NFR-AIML-08, BR-ORCH-006 |
| NFR-ORC-SEC-003 | Rate-limiting: max 60 requests/minute per user on `/api/v1/orchestrator/**` endpoints | required | hard | NFR-SEC-05 |
| NFR-ORC-SEC-004 | All orchestrator endpoints require valid JWT — no unauthenticated access | required | hard | FR-AUTH-01 |
| NFR-ORC-SEC-005 | `PendingConfirmation` in Redis includes `userId`; re-verified on confirmation request before execution | required | hard | BR-ORCH-002 |

---

## 4. AI/ML Lifecycle (extension — full enforcement)

| ID | NFR | Target | Type | Source |
|----|-----|--------|------|--------|
| NFR-ORC-AIML-001 | Orchestrator system prompt version-controlled in `api/src/orchestrator/prompts/orchestrator.v1.0.0.txt` | required | hard | NFR-AIML-01 |
| NFR-ORC-AIML-002 | Eval suite for orchestrator routing with ≥ 5 golden-path cases + ≥ 3 adversarial cases (prompt injection, cross-role abuse, cycle detection) | required | hard | NFR-AIML-02 |
| NFR-ORC-AIML-003 | Hallucination guardrail: orchestrator refuses to answer product/order questions when no data returned from tools; text response must say "I don't have that information" | required | hard | NFR-AIML-03 |
| NFR-ORC-AIML-004 | LLM PII handling: direct identifiers (email regex, phone regex) in user messages redacted in logs before write; full content passes to LLM | required | hard | NFR-AIML-06 |
| NFR-ORC-AIML-005 | Every LLM invocation records tokensIn, tokensOut, modelName, costUsd to `LlmCostRecord` (UoW-04) | required | hard | NFR-AIML-07, BR-ORCH-008 |
| NFR-ORC-AIML-006 | Token budget passed to each agent dispatch; soft deadline enforced via AbortController | required | hard | BR-ORCH-007 |

---

## 5. Observability

| ID | NFR | Target | Type | Source |
|----|-----|--------|------|--------|
| NFR-ORC-OBS-001 | Full OTel trace per turn: root span on chat/intent endpoint → child spans per agent call → child spans for DB writes | required | hard | NFR-OBS-03 |
| NFR-ORC-OBS-002 | Each OTel span tags: `request_id`, `user_id`, `role`, `agent_name`, `model_name`, `tokens_in`, `tokens_out` | required | hard | NFR-OBS-03 |
| NFR-ORC-OBS-003 | Structured JSON log on every turn: start, agent dispatch, done, error; includes trace_id, span_id, user_id, role | required | hard | NFR-OBS-04 |
| NFR-ORC-OBS-004 | LLM cost metric exported to prom-client: `llm_cost_usd_total{model,role}` counter | required | hard | NFR-OBS-05 |

---

## 6. Property-Based Testing (partial enforcement — NFR-PBT-04 applies)

| ID | NFR | Target | Type | Source |
|----|-----|--------|------|--------|
| NFR-ORC-PBT-001 | Role-gate decision logic has property tests covering the cross-product of (role × intent-type × resource) — must cover ≥ 36 combinations | required | hard | NFR-PBT-04 |

---

## 7. Maintainability

| ID | NFR | Target | Type | Source |
|----|-----|--------|------|--------|
| NFR-ORC-MAINT-001 | Unit + integration test coverage ≥ 80% line coverage for orchestrator module | required | standard | greenfield threshold |
| NFR-ORC-MAINT-002 | Agent registry is data-driven (map/registry pattern); adding a new agent MUST NOT require changes to `OrchestratorService` | required | standard | derived |
| NFR-ORC-MAINT-003 | LLM provider abstracted behind `ILlmProvider` interface; swapping models MUST require config change only | required | standard | derived |

---

## 8. Cost

| ID | NFR | Target | Type | Source |
|----|-----|--------|------|--------|
| NFR-ORC-COST-001 | Default `maxTokensOut=800` per turn to limit cost per interaction; configurable via env `LLM_MAX_TOKENS_OUT` | required | hard | BR-ORCH-007 |
| NFR-ORC-COST-002 | Daily LLM spend alarm from UoW-04 `BudgetAlarmWorker` still applies; no new alarm needed | N/A | — | UoW-04 covers |

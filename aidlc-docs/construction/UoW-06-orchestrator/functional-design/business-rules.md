# Business Rules — UoW-06 (Orchestrator Core + LLM + SSE Server)

---

## BR-ORCH-001: Role Gate Before Agent Dispatch

**Applies to**: Every message and intent routed through the orchestrator  
**Statement**: "Before dispatching to any agent, the orchestrator MUST verify the user's role from the validated JWT. A shopper-role request MUST NOT be able to invoke merchant-only tools — even if phrased deceptively."  
**Enforcement**:
- Middleware: `RoleGuard` applied to `/api/v1/orchestrator/**` — extracts and verifies role from JWT
- Orchestrator: role is passed as `user.role` in `AgentInput`; agents check it before each tool call
- Tools: every tool predicate (`merchant only`, `shopper only`, `both`) evaluated before tool body
- Redis: `PendingConfirmation` stores original requester's userId; confirmation re-verifies match
**Error code**: `auth.role.denied`  
**User-facing copy**: "I can't help with that from your current account — here are things I can assist you with." (Never expose which tools exist for other roles.)

---

## BR-ORCH-002: Destructive Operations Require Confirmation

**Applies to**: `cart.clear`, `order.cancel`, `order.refund`, `customer.anonymize`  
**Statement**: "No destructive tool execution may occur without a recorded `confirmation.confirm` intent matching the original `intentId`."  
**Enforcement**:
- Middleware: `ConfirmationGuard` intercepts destructive intents — checks Redis for matching `intentId`
- Orchestrator: when an agent signals destructive, emits `confirmation_prompt` widget with server-generated `intentId`; blocks tool execution
- Redis: `confirm:<intentId>` key with 5-minute TTL; deleted on confirm/cancel
- Audit: both `confirmation_prompt` emission and confirm/cancel action are logged
**Error code**: `confirmation.required` / `confirmation.expired`  
**User-facing copy (missing confirmation)**: Widget re-prompts: "This action can't be undone — please confirm."  
**User-facing copy (expired)**: "That confirmation has expired. Please try again."

---

## BR-ORCH-003: SSE Stream Must Close Cleanly

**Applies to**: All streaming turns  
**Statement**: "Every SSE stream opened for a chat turn MUST close with either a `done` event (success) or an `error` event (failure). Streams MUST NOT remain open indefinitely."  
**Enforcement**:
- Orchestrator: wraps all agent execution in try/catch; emits `error` event on any uncaught throw
- NestJS `@Sse` handler: uses `Observable<MessageEvent>`; `finally` block closes the observable
- LLM client: `AbortController` timeout after `softDeadlineMs + 2000ms` hard cutoff
**Error code**: `sse.turn.timeout`  
**User-facing copy**: "I'm taking longer than usual — please try again with a more specific question."

---

## BR-ORCH-004: Merchant Session Open Triggers Dashboard Digest

**Applies to**: Merchants only; first SSE stream per conversation  
**Statement**: "When a merchant opens a new conversation, the orchestrator MUST emit a `dashboard_digest` widget as the first response before any LLM call."  
**Enforcement**:
- Orchestrator: checks `isFirstTurn(conversationId)` and `user.role === 'merchant'` before routing
- `DashboardDigestService`: assembles today's order count, revenue, low-stock alerts, new customers
- Widget emitted via SSE `widget` event; no LLM call for the digest itself
**Error code**: `dashboard.digest.failed` (non-blocking — falls through to normal routing)  
**User-facing copy (on failure)**: Text message: "Welcome back! (Note: I couldn't load your dashboard just now — try asking me for a summary.)"

---

## BR-ORCH-005: Agent Handoff Must Terminate (No Cycles)

**Applies to**: Multi-agent turns  
**Statement**: "An agent handoff chain MUST NOT exceed 3 hops. If 3 handoffs occur without a `text` or `widget` output, the orchestrator aborts the turn."  
**Enforcement**:
- Orchestrator: maintains `handoffDepth` counter in turn context; throws `agent.handoff.cycle` at depth > 3
- Each `handoff` AgentOutput increments the counter and re-dispatches to the named agent
**Error code**: `agent.handoff.cycle`  
**User-facing copy**: "Something went wrong coordinating that request — please try a more specific question."

---

## BR-ORCH-006: Prompt Injection Defense

**Applies to**: All user message text before LLM dispatch  
**Statement**: "User input MUST be sanitized and role-scoped before insertion into any system prompt. The role gate result (from JWT) MUST override any role claim in the user's message."  
**Enforcement**:
- Orchestrator: user message inserted as a `user` role message in the LLM conversation — never merged into the system prompt
- System prompt is read-only (file-backed `PromptTemplate`); user content cannot modify it
- PII redaction: direct identifiers (emails, phone numbers matching regex) replaced with `[REDACTED]` before logging; full content retained for LLM call (needed for context) but NOT logged
**Error code**: N/A — silent defense (no user-visible error)

---

## BR-ORCH-007: Token Budget Enforcement

**Applies to**: Every agent call  
**Statement**: "The orchestrator MUST pass a `budget` to each agent. An agent that reports exceeding `softDeadlineMs` MUST have its response gracefully truncated; the turn MUST still close with `done`."  
**Enforcement**:
- Orchestrator: sets default budget `{ maxTokensIn: 4000, maxTokensOut: 800, softDeadlineMs: 8000 }`
- LLM client: `AbortController` signal fired at `softDeadlineMs`; partial tokens already streamed
- On timeout: emit remaining buffered tokens + `done` event with actual usage
- `LlmCostMeterService` (UoW-04) records actual usage regardless of truncation
**Error code**: `llm.budget.exceeded` (logged; not surfaced to user)  
**User-facing copy**: "I'm still thinking — let me give you what I have so far…" (if partial response streams)

---

## BR-ORCH-008: Cost Recorded Per Turn

**Applies to**: All LLM calls  
**Statement**: "Every LLM call MUST record input tokens, output tokens, model name, and cost_usd to the `LlmCostRecord` table (UoW-04) before the `done` event is emitted."  
**Enforcement**:
- Orchestrator: fire-and-forget `LlmCostMeterService.record(...)` call after receiving `done` from LLM
- If the record call fails, it is logged as a warning but does NOT block the `done` event
**Error code**: `telemetry.cost.record.failed` (logged only)

---

## BR-ORCH-009: Heartbeat Keeps SSE Alive

**Applies to**: All active SSE streams  
**Statement**: "The SSE server MUST emit a `:keep-alive` comment every 15 seconds while the stream is open, to prevent proxy/load-balancer timeouts."  
**Enforcement**:
- NestJS `@Sse` handler: `interval(15_000)` merged into the Observable; emits SSE comment (`:keep-alive\n\n`)
- Heartbeat does NOT appear as a named event on the FE `SseClient` (comments are ignored by `EventSource` API)

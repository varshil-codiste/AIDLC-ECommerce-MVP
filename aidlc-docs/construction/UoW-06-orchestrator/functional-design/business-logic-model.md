# Business Logic Model — UoW-06 (Orchestrator Core + LLM + SSE Server)

---

## Workflow 1: Text Message → Stream Response

```mermaid
sequenceDiagram
    participant FE as FE (SseClient)
    participant GW as ChatController
    participant ORC as OrchestratorService
    participant RG as RoleGuard
    participant LLM as LlmProviderService
    participant AGT as AgentRegistry
    participant DB as ConversationRepo
    participant COST as LlmCostMeterService

    FE->>GW: POST /api/v1/chat/message {conversationId, message}
    GW->>RG: validate JWT role
    RG-->>GW: role=shopper|merchant
    GW->>ORC: dispatch(input)
    GW->>FE: 200 text/event-stream (SSE opened)

    ORC->>DB: save ConversationMessage (role=user)
    ORC->>ORC: isFirstTurn? + role=merchant?
    alt merchant + first turn
        ORC->>FE: event:widget data:{dashboard_digest}
    end

    ORC->>AGT: route(message, role) → agentName
    ORC->>LLM: streamCompletion(systemPrompt, context, message, budget)
    loop token streaming
        LLM-->>ORC: token delta
        ORC->>FE: event:token data:{delta}
    end

    LLM-->>ORC: done {tokensIn, tokensOut}
    ORC->>DB: update ConversationMessage (role=assistant, content, cost)
    ORC->>COST: record(model, tokensIn, tokensOut, costUsd) [fire-and-forget]
    ORC->>FE: event:done data:{messageId, usage}
```

**Text alternative**: FE POSTs message → RoleGuard validates JWT → ChatController opens SSE → Orchestrator saves user turn → optionally emits dashboard_digest for merchant first turn → routes to agent → LLM streams tokens → tokens forwarded to FE → on LLM done, assistant message saved + cost recorded + SSE done event emitted.

---

## Workflow 2: Widget Intent → Route → Respond

```mermaid
sequenceDiagram
    participant FE as FE (SseClient)
    participant IC as IntentController
    participant ORC as OrchestratorService
    participant CONF as ConfirmationGuard
    participant REDIS as Redis
    participant AGT as Agent

    FE->>IC: POST /api/v1/orchestrator/intent {intent, conversationId}
    IC->>CONF: is destructive intent?

    alt destructive intent (cart.clear, order.refund, etc.)
        CONF->>REDIS: GET confirm:<intentId> → miss
        CONF-->>IC: confirmation required
        IC->>ORC: emit confirmation_prompt
        ORC->>REDIS: SET confirm:<newIntentId> {originalIntent, userId, 5min TTL}
        ORC->>FE: event:widget data:{confirmation_prompt, intentId}
        ORC->>FE: event:done
    else non-destructive OR already confirmed
        IC->>ORC: dispatch intent as AgentInput
        ORC->>AGT: execute(agentInput)
        AGT-->>ORC: AgentOutput
        ORC->>FE: event:widget|token data:{...}
        ORC->>FE: event:done
    end
```

**Text alternative**: FE POSTs intent → ConfirmationGuard checks if destructive → if destructive and unconfirmed: orchestrator emits confirmation_prompt widget to SSE + stores intent in Redis → if non-destructive or pre-confirmed: agent dispatched → response streamed.

---

## Workflow 3: Confirmation Confirm/Cancel

```mermaid
sequenceDiagram
    participant FE as FE (SseClient)
    participant IC as IntentController
    participant ORC as OrchestratorService
    participant CONF as ConfirmationGuard
    participant REDIS as Redis
    participant AGT as Agent

    FE->>IC: POST /api/v1/orchestrator/intent {intent: "confirmation.confirm", original_intent_id}
    IC->>CONF: lookup confirm:<intentId> in Redis
    CONF->>REDIS: GET confirm:<intentId>
    REDIS-->>CONF: {originalIntent, userId}

    CONF->>CONF: verify request.user.id === stored userId
    CONF->>REDIS: DEL confirm:<intentId>
    CONF-->>IC: originalIntent unlocked

    IC->>ORC: dispatch originalIntent as AgentInput
    ORC->>AGT: execute destructive tool
    AGT-->>ORC: AgentOutput
    ORC->>FE: event:widget|token + event:done

    note over FE,IC: Cancel path
    FE->>IC: POST /api/v1/orchestrator/intent {intent: "confirmation.cancel", original_intent_id}
    IC->>REDIS: DEL confirm:<intentId>
    IC->>FE: event:done (no action taken)
```

**Text alternative**: User confirms → ConfirmationGuard fetches intent from Redis, verifies user matches, deletes key, unlocks original intent → agent executes destructive tool → response streamed. Cancel path deletes Redis key and closes stream without action.

---

## Workflow 4: Multi-Agent Handoff

```mermaid
sequenceDiagram
    participant ORC as OrchestratorService
    participant AGT1 as OrderAgent
    participant AGT2 as CustomerAgent
    participant FE as FE (SseClient)

    ORC->>AGT1: dispatch("refund order #X and tag customer", depth=0)
    AGT1-->>ORC: {type: 'handoff', toAgent: 'customer-agent', reason: 'tag customer after refund', payload: {customerId, tag}}

    ORC->>ORC: depth++ (now 1); check < 3
    ORC->>AGT2: dispatch(handoffPayload, depth=1)
    AGT2-->>ORC: {type: 'widget', widget: {customer_card, tags_updated}}

    ORC->>FE: event:widget data:{customer_card}
    ORC->>ORC: depth check passed; compose final response
    ORC->>FE: event:done
```

**Text alternative**: Orchestrator dispatches to Order Agent → Order Agent returns handoff to Customer Agent with payload → Orchestrator increments depth counter (checks ≤ 3), re-dispatches to Customer Agent → Customer Agent returns widget → Orchestrator streams widget + done.

---

## State Machine: SSE Turn Lifecycle

```
IDLE ──[POST /chat/message or /intent]──► OPEN
  OPEN ──[merchant + first turn]──► EMIT_DIGEST ──► ROUTING
  OPEN ──[not first turn or shopper]──► ROUTING
  ROUTING ──[agent dispatched]──► STREAMING
  STREAMING ──[token received]──► STREAMING (loop)
  STREAMING ──[done received]──► FINALIZING
  STREAMING ──[error thrown]──► ERROR_CLOSE
  FINALIZING ──[cost recorded]──► CLOSED (event:done emitted)
  ERROR_CLOSE ──► CLOSED (event:error emitted)
  CLOSED ──► IDLE
```

**Text alternative**: Turn starts in IDLE, opens on request, optionally emits digest for merchants, routes to agent, streams tokens in a loop, finalizes by recording cost and emitting done event. Any error transitions directly to ERROR_CLOSE which emits an error event and closes.

---

## State Machine: Confirmation Protocol

```
PENDING ──[destructive intent received]──► AWAITING_CONFIRM
  AWAITING_CONFIRM ──[confirmation.confirm + userId match]──► EXECUTING
  AWAITING_CONFIRM ──[confirmation.cancel]──► CANCELLED (Redis DEL)
  AWAITING_CONFIRM ──[TTL=5min expires]──► EXPIRED (Redis auto-DEL)
  EXECUTING ──[agent completes]──► DONE
  EXECUTING ──[agent errors]──► ERROR
  CANCELLED ──► terminal
  EXPIRED ──► terminal
  DONE ──► terminal
  ERROR ──► terminal
```

**Text alternative**: Destructive intent triggers AWAITING_CONFIRM state stored in Redis. Confirm (with matching user) transitions to EXECUTING. Cancel or 5-minute TTL expiry are terminal without execution.

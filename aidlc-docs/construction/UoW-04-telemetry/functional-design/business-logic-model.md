# Business Logic Model — UoW-04-telemetry

---

## Workflow 1: HTTP Request Trace Propagation

```
Client                NestJS                  OTel SDK          Grafana Alloy
  |                      |                        |                    |
  |-- POST /orders ------>|                        |                    |
  |  [X-Trace-ID: abc]   |                        |                    |
  |                      |-- middleware runs ----->|                    |
  |                      |   read X-Trace-ID=abc  |                    |
  |                      |   or generate new ID    |                    |
  |                      |   start root span      |                    |
  |                      |   store {traceId,      |                    |
  |                      |    spanId, requestId}  |                    |
  |                      |   in AsyncLocalStorage |                    |
  |                      |                        |                    |
  |                      |-- handler executes --->|                    |
  |                      |   pino logs include    |                    |
  |                      |   traceId + spanId     |                    |
  |                      |                        |                    |
  |                      |-- response ready ------>                    |
  |                      |   end root span        |                    |
  |                      |   BatchSpanProcessor   |                    |
  |<-- 201 [X-Trace-ID] -|   exports async ------>|----- OTLP/gRPC -->|
```

---

## Workflow 2: LLM Call Instrumentation

```
Agent Service         LlmCostMeter         LlmCostRecord DB     OTel Span
     |                     |                     |                  |
     |-- callLlm(req) ---->|                     |                  |
     |                     |-- start child span ->                  |
     |                     |   span.setAttr(model, tokens...)       |
     |                     |                     |                  |
     |                     |-- await LLM API --->|                  |
     |                     |   (HTTP call        |                  |
     |                     |    instrumented     |                  |
     |                     |    by OTel auto)    |                  |
     |                     |                     |                  |
     |                     |<-- {tokens, text} --|                  |
     |                     |                     |                  |
     |                     |-- compute cost ----->                  |
     |                     |   (tokens * price)  |                  |
     |                     |                     |                  |
     |                     |-- INSERT LlmCostRecord                 |
     |                     |   (fire-and-forget) |                  |
     |                     |                     |                  |
     |                     |-- end child span --->                  |
     |<-- {text} ----------|                                        |
```

---

## Workflow 3: Weekly Budget Alarm (Cron)

```
BudgetAlarmWorker (every hour)
   |
   |-- query: SELECT SUM(cost_usd) FROM llm_cost_records
   |          WHERE called_at > NOW() - INTERVAL '7 days'
   |
   |-- if sum > LLM_BUDGET_WEEKLY_USD * 0.8:
   |      logger.warn({ event: 'budget.alarm.80pct', sumUsd, weeklyBudget })
   |      budget_alarm_80pct_total.inc()
   |
   |-- if sum > LLM_BUDGET_WEEKLY_USD * 1.0:
   |      logger.error({ event: 'budget.alarm.100pct', sumUsd, weeklyBudget })
   |      budget_alarm_100pct_total.inc()
   |
   |-- (no blocking action — alarm only)
```

---

## Workflow 4: Trace Context → Audit Log Correlation

```
Request: PATCH /users/:id (role=admin)
   |
   |-- RequestContextMiddleware
   |   store = { requestId: 'req-abc', traceId: 'tr-123', spanId: 'sp-456' }
   |
   |-- UserService.update() called
   |   |-- prisma.$transaction(tx)
   |   |   |-- tx.user.update(...)
   |   |   |-- AuditLogService.insert(tx, { ... })
   |   |       |-- getRequestContext() → { requestId, traceId, spanId }
   |   |       |-- tx.auditLog.create({ requestId, traceId, spanId, ... })
   |   |
   |   Audit row: { action: 'user.update', requestId: 'req-abc',
   |                traceId: 'tr-123', spanId: 'sp-456' }
   |   → correlate in Grafana: Trace → Logs → Audit
```

---

## State Machine: Budget Alarm State

```
SAFE (sum < 80%)
   |
   v [sum crosses 80%]
WARNING (80% ≤ sum < 100%)
   |                |
   v [sum crosses   v [sum drops below 80%]
      100%]       SAFE
CRITICAL (sum ≥ 100%)
   |
   v [new week starts (7-day window rolls)]
SAFE
```

Each cron tick independently evaluates the trailing-7-days window — no persistent state machine; the budget state is derived from the DB query result.

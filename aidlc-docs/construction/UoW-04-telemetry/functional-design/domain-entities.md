# Domain Entities — UoW-04-telemetry

**UoW**: UoW-04 — Telemetry: OTel tracer + LLM cost meter + structured logging  
**Stack**: Backend Node (NestJS) + Observability  
**Stories**: CC-02 ("Every request is fully traceable via structured logs and spans")

---

## Entity: LlmCostRecord

**Purpose**: Persists a single LLM API call's token consumption and cost for budget reporting and weekly alarm evaluation.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | server-generated |
| traceId | string(32) | not null | OTel trace ID for correlation |
| spanId | string(16) | not null | OTel span ID |
| model | string(128) | not null | e.g. `gpt-4o`, `claude-sonnet-4-6` |
| agentModule | string(64) | nullable | which agent/module made the call |
| inputTokens | int | not null, ≥ 0 | prompt tokens |
| outputTokens | int | not null, ≥ 0 | completion tokens |
| costUsd | Decimal(10,6) | not null, ≥ 0 | computed from token price table |
| calledAt | timestamp | not null | UTC |
| createdAt | timestamp | not null, auto | insert timestamp |

**Relationships**: none (standalone telemetry record, no FK to domain entities to avoid coupling)

**Lifecycle**: Insert-only. Never updated. TTL: 90 days (matches log retention from M1 Observability).

**Schema placement**: `@@schema("app")` under `app.llm_cost_records`

---

## Entity: OTel Trace Context (in-memory, not persisted)

**Purpose**: Carries trace ID + span ID through the NestJS request lifecycle via AsyncLocalStorage. Written to every log line.

| Field | Type | Notes |
|-------|------|-------|
| traceId | string | 32-char hex OTel trace ID |
| spanId | string | 16-char hex OTel span ID |
| requestId | string | (from RequestContext — UoW-03) |

This is an in-memory context object, not a DB entity.

---

## Concept: Token Price Table

**Purpose**: Maps model name → (input $/token, output $/token) for cost computation.

Implemented as a typed constant in `src/telemetry/llm-pricing.ts`. Updated manually when model pricing changes (not a DB entity — changes are infrequent and tracked in git).

| Model | Input $/1K tokens | Output $/1K tokens |
|-------|-------------------|---------------------|
| claude-sonnet-4-6 | 0.003 | 0.015 |
| claude-haiku-4-5 | 0.00025 | 0.00125 |
| claude-opus-4-7 | 0.015 | 0.075 |
| gpt-4o | 0.0025 | 0.01 |
| gpt-4o-mini | 0.00015 | 0.0006 |

---

## ER Diagram

```
+--------------------+
|  llm_cost_records  |
|--------------------|
| id (PK)            |
| trace_id           |
| span_id            |
| model              |
| agent_module       |
| input_tokens       |
| output_tokens      |
| cost_usd           |
| called_at          |
| created_at         |
+--------------------+
```

No foreign keys — telemetry is decoupled from domain entities intentionally.

# Business Rules — UoW-04-telemetry

---

## BR-TEL-001: Every HTTP Request Carries a Trace ID

**Applies to**: All inbound HTTP requests  
**Statement**: Every request entering the NestJS application is assigned a trace ID. If the client supplies `X-Trace-ID` header it is reused; otherwise the OTel SDK generates one. The trace ID is:
1. Propagated through every log line generated during the request
2. Returned in the `X-Trace-ID` response header so callers can correlate
3. Stored in `LlmCostRecord.traceId` for any LLM calls within the request  
**Enforcement**: `RequestContextMiddleware` (UoW-03) already propagates `requestId`. UoW-04 extends it to also read/write the OTel trace context.  
**Error code**: N/A — this is a tracing invariant, not a user-visible validation.

---

## BR-TEL-002: Every Log Line Includes Trace Context

**Applies to**: All pino log statements in `api/`  
**Statement**: Every pino log line MUST include `traceId` and `spanId` fields when a request is in flight. Standalone background workers (drain, cron) include `traceId = 'background'` and `spanId = 'N/A'` as a sentinel.  
**Enforcement**: pino `mixin` function reads from AsyncLocalStorage and appends `traceId` / `spanId` to every log record.  
**Error code**: N/A

---

## BR-TEL-003: Every LLM API Call Is Recorded

**Applies to**: All calls to external LLM APIs (Anthropic, OpenAI)  
**Statement**: Before and after every LLM API call, the `LlmCostMeter` service:
1. Records the model name, input tokens, output tokens
2. Computes cost in USD using the token price table
3. Persists a `LlmCostRecord` row
4. Sets OTel span attributes: `llm.model`, `llm.input_tokens`, `llm.output_tokens`, `llm.cost_usd`  
**Enforcement**: `LlmCostMeter.record()` is called by every agent/service that invokes an LLM. It is not optional — Code Review blocks any LLM call not wrapped with the meter.  
**Error code**: Internal only. Meter failures are logged and swallowed (telemetry must not break the request path).

---

## BR-TEL-004: Weekly Budget Alarm at 80% Threshold

**Applies to**: Weekly LLM spending  
**Statement**: A cron job runs every hour and computes the sum of `LlmCostRecord.costUsd` for the trailing 7 days. If the sum exceeds `LLM_BUDGET_WEEKLY_USD * 0.8`:
1. A `WARNING` log event is emitted with event type `budget.alarm.80pct`
2. The `budget_alarm_80pct_total` Prometheus counter increments by 1
3. If the sum exceeds `LLM_BUDGET_WEEKLY_USD * 1.0`, a `CRITICAL` log event is emitted with event type `budget.alarm.100pct`  
**Enforcement**: `BudgetAlarmWorker` with `@Cron(CronExpression.EVERY_HOUR)`.  
**Error code**: N/A — alarm-only; no request is blocked.  
**Default**: `LLM_BUDGET_WEEKLY_USD=100` (env var; configurable per deployment).

---

## BR-TEL-005: Cost Records Are Append-Only

**Applies to**: `llm_cost_records` table  
**Statement**: `LlmCostRecord` rows are never updated or deleted programmatically (beyond the 90-day TTL cleanup cron). Retroactive correction of token counts is handled by inserting a compensating record with a note field, not by updating existing rows.  
**Enforcement**: Application-layer only (no DB trigger needed — the table has no UPDATE paths). The 90-day TTL cleanup uses a batched DELETE cron job (same CTE pattern as `IdempotencyService.cleanup()`).  
**Error code**: N/A

---

## BR-TEL-006: Trace Context Flows Into Audit Log

**Applies to**: `AuditLogService.insert()` (UoW-03)  
**Statement**: `AuditLogService` already reads `requestId` from AsyncLocalStorage. UoW-04 extends the context to also carry `traceId` and `spanId`, so audit log entries include all three correlation fields.  
**Enforcement**: `requestContext` store extended from `{ requestId }` to `{ requestId, traceId, spanId }`.  
**Error code**: N/A

---

## BR-TEL-007: OTel Export Does Not Block Request Path

**Applies to**: OTel OTLP exporter  
**Statement**: The OTLP exporter runs asynchronously. If the Grafana Alloy endpoint is unreachable, spans are dropped after a configurable timeout (default 5s). The application continues serving requests normally. Exporter errors are logged at WARN level.  
**Enforcement**: OTel SDK `BatchSpanProcessor` with `maxExportBatchSize=512`, `scheduledDelayMillis=5000`, `exportTimeoutMillis=5000`.  
**Error code**: N/A

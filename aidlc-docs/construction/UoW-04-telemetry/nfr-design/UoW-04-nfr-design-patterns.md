# NFR Design Patterns — UoW-04-telemetry

**Generated at**: 2026-05-05T14:25:00Z

---

## Pattern 1: Async Span Export (BatchSpanProcessor)

**Addresses**: NFR-TEL-PERF-001, NFR-TEL-PERF-003, NFR-TEL-AVAIL-001  
**Pattern**: OTel `BatchSpanProcessor` buffers completed spans in memory and flushes them to the OTLP exporter in batches on a schedule. The application thread never waits for export.

```
Request thread:          OTel SDK (background):
  |                           |
  |-- span.end() ------------>|
  |   (non-blocking)          |-- buffer span
  |                           |-- when batch full or timer fires:
  |<-- response sent          |   POST to Grafana Alloy (async)
                              |   if fails: warn + drop
```

**Config**:
- `maxExportBatchSize`: 512
- `scheduledDelayMillis`: 5000
- `exportTimeoutMillis`: 5000
- `maxQueueSize`: 2048

---

## Pattern 2: Fire-and-Forget DB Insert for Cost Records

**Addresses**: NFR-TEL-PERF-002, NFR-TEL-REL-001  
**Pattern**: `LlmCostMeter.record()` triggers a DB insert but does NOT await it in the calling code's critical path. The promise is chained with `.catch(logger.warn)` to ensure errors are surfaced.

```typescript
// In LlmCostMeter.record()
this.insertCostRecord(input).catch(err =>
  this.logger.warn({ event: 'llm.cost.insert_failed', err })
);
// Returns immediately — caller not blocked
```

**Tradeoff**: The cost record may be lost if the process crashes between the LLM call and the insert completing. Acceptable given the record is for budget monitoring, not billing.

---

## Pattern 3: pino Mixin for Trace Context Injection

**Addresses**: NFR-TEL-OBS-001, NFR-TEL-OBS-002, BR-TEL-002  
**Pattern**: pino's `mixin` option calls a function on every log record creation. The mixin reads from the OTel context (or AsyncLocalStorage) and appends `traceId` + `spanId`.

```typescript
// In pino logger factory
mixin() {
  const store = requestContext.getStore();
  const span = trace.getActiveSpan();
  return {
    traceId: span?.spanContext().traceId ?? store?.traceId ?? 'N/A',
    spanId: span?.spanContext().spanId ?? store?.spanId ?? 'N/A',
  };
}
```

Zero-overhead path: AsyncLocalStorage reads are O(1). pino mixin adds < 0.1ms.

---

## Pattern 4: OTel Auto-Instrumentation + Manual Span Creation

**Addresses**: NFR-TEL-PERF-001, NFR-TEL-OBS-003  
**Pattern**: Use `@opentelemetry/auto-instrumentations-node` to automatically instrument:
- HTTP client calls (undici, got, fetch — LLM API calls)
- Postgres queries (via `pg` instrumentation)
- Redis operations (via `ioredis` instrumentation)

Manual spans are created only for:
- LLM-specific attributes (`llm.model`, `llm.input_tokens`, `llm.cost_usd`)
- Budget alarm cron ticks

---

## Pattern 5: Prometheus Counter Pattern for Budget Alarms

**Addresses**: NFR-TEL-OBS-004, BR-TEL-004  
**Pattern**: `BudgetAlarmWorker` uses `prom-client` Counters that increment when thresholds are crossed. NestJS `PrometheusModule` exposes `/metrics`.

```
Counters:
  budget_alarm_80pct_total{module="llm"} 
  budget_alarm_100pct_total{module="llm"}

Gauges:
  llm_cost_usd_weekly_total{module="llm"}   ← current 7-day window
```

Grafana alert rule: `budget_alarm_100pct_total > 0` → send alert.

---

## Pattern 6: Unknown-Model Sentinel

**Addresses**: NFR-TEL-AIML-003  
**Pattern**: `computeCost()` checks the pricing table. Unknown model name → cost_usd = 0 + WARN log. This prevents silent under-counting of budget.

```typescript
if (!PRICING[model]) {
  logger.warn({ event: 'llm.cost.unknown_model', model });
  return 0;
}
```

---

## Pattern 7: Prisma Schema Extension for llm_cost_records

**Addresses**: NFR-TEL-SCAL-001, NFR-TEL-SEC-003  
**Pattern**: New Prisma model `LlmCostRecord` in `@@schema("app")`. Index on `called_at` for budget alarm query. No FK to domain tables (telemetry decoupled from domain).

**Migration**: `UoW-04-001-llm-cost-records` — `CREATE TABLE app.llm_cost_records (...)` + `CREATE INDEX llm_cost_records_called_at_idx ON app.llm_cost_records (called_at)`.

# Code Summary — UoW-04 (Telemetry + OTel + LLM Cost Meter)

**Completed**: 2026-05-05T13:19:00Z  
**Test result**: 57 unit tests ✅ | 12 e2e tests ✅ (4 suites)  
**Story implemented**: CC-02 — Every request is fully traceable

---

## Files Created (New)

| File | Purpose |
|------|---------|
| `api/src/telemetry/otel-sdk.ts` | NodeSDK bootstrap — BatchSpanProcessor + OTLPTraceExporter (gRPC); must be first import in main.ts |
| `api/src/telemetry/types/llm-call.types.ts` | `LlmCallInput` and `LlmCostEntry` TypeScript interfaces |
| `api/src/telemetry/llm-pricing.ts` | `PRICING` map + `computeCost(model, inputTokens, outputTokens)` — returns 0 for unknown models |
| `api/src/telemetry/llm-cost-meter.service.ts` | `record()` (fire-and-forget) + `getLast7DaysCost()` (raw SQL SUM) |
| `api/src/telemetry/budget-alarm.worker.ts` | `@Cron(EVERY_HOUR)` `checkBudget()` with prom-client counters at 80%/100% thresholds |
| `api/src/telemetry/telemetry.module.ts` | `@Global()` NestJS module; provides LlmCostMeterService + BudgetAlarmWorker |
| `api/src/logger/pino-logger.factory.ts` | pino factory with mixin: reads traceId/spanId from active OTel span → ALS fallback → 'N/A' |
| `api/prisma/migrations/20260505140000_UoW-04-001-llm-cost-records/migration.sql` | CREATE TABLE app.llm_cost_records + called_at index |
| `api/prisma/migrations/20260505140100_UoW-04-002-audit-log-trace-fields/migration.sql` | ALTER TABLE audit.audit_log ADD COLUMN trace_id TEXT, span_id TEXT |
| `api/src/telemetry/llm-pricing.spec.ts` | Unit: computeCost correctness; PBT (1000 runs); unknown model |
| `api/src/telemetry/llm-cost-meter.service.spec.ts` | Unit: record() fire-and-forget; DB failure swallowed; getLast7DaysCost parse |
| `api/src/telemetry/budget-alarm.worker.spec.ts` | Unit: checkBudget() < 80%, = 80%, = 100%, error-swallowed |
| `api/test/telemetry.e2e-spec.ts` | E2E: LlmCostRecord insert/read; 7-day SUM query; AuditLog traceId/spanId columns |

---

## Files Modified

| File | Change |
|------|--------|
| `api/src/main.ts` | First import: `./telemetry/otel-sdk`; uses `createPinoLogger()` factory |
| `api/src/app.module.ts` | Added `TelemetryModule` import |
| `api/src/common/context/request-context.ts` | Extended `RequestContext` with `traceId: string; spanId: string`; added `getRequestContext()` export |
| `api/src/common/context/request-context.middleware.ts` | Reads OTel active span for traceId/spanId; sets `X-Trace-ID` response header |
| `api/src/audit/audit-log.service.ts` | `insert()` now reads full `RequestContext` and writes `traceId`/`spanId` to audit row |
| `api/src/audit/audit-log.service.spec.ts` | Updated spy from `getRequestId` → `getRequestContext`; asserts traceId + spanId on audit row |
| `api/prisma/schema.prisma` | New `LlmCostRecord` model; `AuditLog` extended with `traceId?` and `spanId?` |
| `api/.env.example` | Added `OTLP_ENDPOINT`, `OTLP_AUTH_HEADER`, `LLM_BUDGET_WEEKLY_USD`, `OTEL_SERVICE_NAME`, `OTEL_SERVICE_VERSION` |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `@opentelemetry/sdk-node` re-exports `resources` and `tracing` | Sub-packages are bundled; importing separately causes "cannot find module" errors |
| `record()` is fire-and-forget (void) | LLM cost metering must never block the calling request path |
| Own `prom-client Registry` in `BudgetAlarmWorker` | Avoids NestJS PrometheusModule complexity; only 4 metrics needed |
| `DECIMAL(10,6)` for `cost_usd` | Preserves sub-cent precision for cost accuracy |
| `INDEX ON called_at` | The 7-day SUM query filters on `called_at`; index prevents full table scan |
| OTel span → ALS fallback → 'N/A' in pino mixin | Ensures traceId/spanId are always present in logs even outside HTTP request context |

---

## Fixes Applied During Codegen

| Issue | Fix |
|-------|-----|
| `@opentelemetry/sdk-trace-node` not installed | Import via `@opentelemetry/sdk-node` named exports `tracing.BatchSpanProcessor` |
| `@opentelemetry/resources` not installed | Import via `@opentelemetry/sdk-node` named export `resources.Resource` |
| `beforeEach` unused in budget-alarm.worker.spec.ts | Removed from import |
| Audit log spec spied on `getRequestId` (old API) | Updated to spy on `getRequestContext` returning `{ requestId, traceId, spanId }` |

---

## Test Coverage

| Suite | Tests | Result |
|-------|-------|--------|
| `llm-pricing.spec.ts` | 3 (incl. PBT 1000 runs) | ✅ |
| `llm-cost-meter.service.spec.ts` | 5 | ✅ |
| `budget-alarm.worker.spec.ts` | 4 | ✅ |
| `audit-log.service.spec.ts` (updated) | 4 (incl. PBT 200 runs) | ✅ |
| All unit tests | **57** | ✅ |
| `telemetry.e2e-spec.ts` | 3 | ✅ |
| All e2e tests | **12** | ✅ |

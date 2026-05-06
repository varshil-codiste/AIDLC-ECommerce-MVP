# Code Generation Plan — UoW-04 (Telemetry + OTel + LLM Cost Meter)

**Tier**: Greenfield (Comprehensive)  
**Stacks in scope**: Backend Node.js (NestJS), Database (Postgres via Prisma), Observability  
**Stories implemented**: CC-02 (every request fully traceable)  
**Generated at**: 2026-05-05T14:30:00Z

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC`
- **Application code root**: `api/` (NestJS service)
- **NEVER write under `aidlc-docs/`**

---

## Dependency Status

| Upstream | Status |
|----------|--------|
| UoW-01 (Scaffolding) | COMPLETE — pino, Redis, PrismaModule available |
| UoW-02 (Auth) | COMPLETE — JWT guard, roles, structured logging base |
| UoW-03 (Persistence) | COMPLETE — RequestContextMiddleware, AsyncLocalStorage, @nestjs/schedule |

---

## Steps

### Step 1: Install New Packages

- [x] Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-grpc`, `@opentelemetry/api`, `prom-client` to `api/package.json`
- [x] Run `pnpm install` from workspace root

**Files modified**: `api/package.json`, `pnpm-lock.yaml`

---

### Step 2: Extend Prisma Schema — LlmCostRecord

- [x] Add `LlmCostRecord` model to `api/prisma/schema.prisma` (`@@schema("app")`, `@@map("llm_cost_records")`)
- [x] Run migration `UoW-04-001-llm-cost-records`: CREATE TABLE + `called_at` index

**Files modified**: `api/prisma/schema.prisma`  
**Files created**: `api/prisma/migrations/<ts>_UoW-04-001-llm-cost-records/migration.sql`

---

### Step 3: OTel SDK Bootstrap

- [x] `api/src/telemetry/otel-sdk.ts` — `NodeSDK` with `BatchSpanProcessor`, `OTLPTraceExporter` (gRPC), `getNodeAutoInstrumentations()`, resource attributes from env
- [x] Update `api/src/main.ts` to import `./telemetry/otel-sdk` as the very first line (before NestJS bootstrap)

**Files created**: 1  
**Files modified**: `api/src/main.ts`

---

### Step 4: LLM Pricing + Types

- [x] `api/src/telemetry/types/llm-call.types.ts` — `LlmCallInput` (model, agentModule, inputTokens, outputTokens), `LlmCostEntry`
- [x] `api/src/telemetry/llm-pricing.ts` — `PRICING` constant map + `computeCost(model, inputTokens, outputTokens): number`

**Files created**: 2

---

### Step 5: LlmCostMeterService

- [x] `api/src/telemetry/llm-cost-meter.service.ts`:
  - `record(input: LlmCallInput): void` — fire-and-forget: create OTel child span + set `llm.*` attributes; call `insertCostRecord()` as a non-awaited promise; emit structured log
  - `getLast7DaysCost(): Promise<number>` — `prisma.$queryRaw` SUM over trailing 7 days
  - `private insertCostRecord(input, costUsd): Promise<void>` — `prisma.llmCostRecord.create()`

**Files created**: 1

---

### Step 6: BudgetAlarmWorker

- [x] `api/src/telemetry/budget-alarm.worker.ts`:
  - `@Cron(CronExpression.EVERY_HOUR)` `checkBudget()`
  - reads `LLM_BUDGET_WEEKLY_USD` from `ConfigService`
  - calls `LlmCostMeterService.getLast7DaysCost()`
  - increments `budget_alarm_80pct_total` / `budget_alarm_100pct_total` Prometheus counters
  - emits `budget.alarm.80pct` / `budget.alarm.100pct` log events

**Files created**: 1

---

### Step 7: pino Logger Factory with Trace Mixin

- [x] `api/src/logger/pino-logger.factory.ts` — factory that creates a pino logger with `mixin()` reading `traceId` + `spanId` from active OTel span (via `@opentelemetry/api`), falling back to AsyncLocalStorage, falling back to `'N/A'`
- [x] Update `api/src/main.ts` to use `PinoLoggerFactory.create()` instead of the raw NestJS logger

**Files created**: 1  
**Files modified**: `api/src/main.ts`

---

### Step 8: Extend RequestContext with Trace Fields

- [x] Update `api/src/common/context/request-context.ts` — add `traceId: string` and `spanId: string` to `RequestContext` interface
- [x] Update `api/src/common/context/request-context.middleware.ts` — after OTel auto-instruments the incoming request, read the active span's `traceId`/`spanId` and store in context; set `X-Trace-ID` response header

**Files modified**: 2

---

### Step 9: Extend AuditLogService for traceId/spanId

- [x] Update `api/src/audit/audit-log.service.ts` — `AuditEntry` gains optional `traceId?: string; spanId?: string`; `insert()` reads `traceId`/`spanId` from extended context and passes to `auditLog.create()`
- [x] Update `api/prisma/schema.prisma` — `AuditLog` model gains `traceId String?` and `spanId String?` fields
- [x] Add migration `UoW-04-002-audit-log-trace-fields`: `ALTER TABLE audit.audit_log ADD COLUMN trace_id TEXT, ADD COLUMN span_id TEXT`

**Files modified**: 2  
**Files created**: 1 migration

---

### Step 10: TelemetryModule

- [x] `api/src/telemetry/telemetry.module.ts` — `@Global()` module; providers: `LlmCostMeterService`, `BudgetAlarmWorker`; imports `ScheduleModule`; exports `LlmCostMeterService`
- [x] Update `api/src/app.module.ts` — import `TelemetryModule`, `ConfigModule.forRoot()` (if not already imported)
- [x] Update `api/.env.example` — add `OTLP_ENDPOINT`, `OTLP_AUTH_HEADER`, `LLM_BUDGET_WEEKLY_USD`, `OTEL_SERVICE_NAME`, `OTEL_SERVICE_VERSION`

**Files created**: 1  
**Files modified**: 2

---

### Step 11: Unit Tests

- [x] `api/src/telemetry/llm-pricing.spec.ts`
  - `computeCost()` returns exact value for known model
  - `computeCost()` returns 0 + no throw for unknown model
  - PBT: `computeCost(model, i, o)` = `(i * inputRate + o * outputRate) / 1000` for all known models over 1000 random token pairs

- [x] `api/src/telemetry/llm-cost-meter.service.spec.ts`
  - `record()` calls `insertCostRecord()` (fire-and-forget — no await in caller)
  - `record()` does NOT throw when DB insert fails
  - `getLast7DaysCost()` returns correct sum from mock
  - Span attributes set: `llm.model`, `llm.input_tokens`, `llm.output_tokens`, `llm.cost_usd`

- [x] `api/src/telemetry/budget-alarm.worker.spec.ts`
  - `checkBudget()` — sum < 80%: no counter increment
  - `checkBudget()` — 80% ≤ sum < 100%: `budget_alarm_80pct_total` increments
  - `checkBudget()` — sum ≥ 100%: both counters increment
  - `checkBudget()` — error from `getLast7DaysCost()`: swallowed, process continues

**Files created**: 3

---

### Step 12: E2E Test

- [x] `api/test/telemetry.e2e-spec.ts`
  - Call POST with an LLM simulation: assert `LlmCostRecord` row created with correct model + tokens
  - Budget alarm: insert synthetic cost records summing to > 80% threshold; call `checkBudget()`; assert log contains `budget.alarm.80pct`
  - Trace ID: HTTP request with `X-Trace-ID: test-trace-123`; assert response header echoes it back

**Files created**: 1

---

### Step 13: Code Summary

- [x] `aidlc-docs/construction/UoW-04-telemetry/code/UoW-04-code-summary.md` (written after Part 2)

---

## Story Traceability

| Story | Files implementing it |
|-------|-----------------------|
| CC-02 — Every request is fully traceable | `otel-sdk.ts`, `llm-cost-meter.service.ts`, `budget-alarm.worker.ts`, `pino-logger.factory.ts`, `request-context.ts` (extended), migrations UoW-04-001 + 002 |

---

## Estimated File Count

| Category | Count |
|----------|-------|
| Source files (new) | 8 |
| Test files (new) | 4 (3 unit + 1 e2e) |
| Migration files (new) | 2 |
| Files modified | 7 (`schema.prisma`, `main.ts`, `app.module.ts`, `.env.example`, `request-context.ts`, `request-context.middleware.ts`, `audit-log.service.ts`) |
| **Total** | **21** |

# AI Review — UoW-04 (Telemetry + OTel + LLM Cost Meter)

**Reviewing model**: claude-sonnet-4-6 (AI-DLC Code Review)  
**Reviewed at**: 2026-05-05T14:43:00Z  
**Files reviewed**: 13 source files (7 new, 6 modified) + 4 test files

---

## Findings

### Category: Correctness vs Functional Design

- ✅ **BR-TEL-001** — Every HTTP request carries a trace ID: `request-context.middleware.ts` reads OTel active span → `X-Trace-ID` header → generates new UUID (correct priority order). Response header `X-Trace-ID` set.
- ✅ **BR-TEL-002 (partial)** — pino mixin in `pino-logger.factory.ts` appends `traceId`/`spanId` to every log record. HTTP requests: OTel span populated. **See C-02 below for background worker gap.**
- ✅ **BR-TEL-003** — `LlmCostMeterService.record()` captures model, tokens, cost; persists `LlmCostRecord`; sets OTel span attributes; fire-and-forget with `.catch()`.
- ✅ **BR-TEL-004** — `BudgetAlarmWorker.checkBudget()` with `@Cron(EVERY_HOUR)`. 80%/100% thresholds evaluated using `>=` (slightly stricter than "exceeds" in BR — acceptable for safety). Counter + log events fire correctly.
- ✅ **BR-TEL-005** — No UPDATE or DELETE paths in `LlmCostMeterService`. Append-only enforced at application layer.
- ✅ **BR-TEL-006** — `requestContext` extended with `traceId`/`spanId`. `AuditLogService.insert()` reads full context and writes all three correlation fields. e2e test confirms persistence.
- ✅ **BR-TEL-007** — `BatchSpanProcessor` configured with `maxExportBatchSize: 512`, `scheduledDelayMillis: 5000`, `exportTimeoutMillis: 5000`, `maxQueueSize: 2048`. Application thread never blocks on export.

---

### Category: Correctness vs NFR Design

- ✅ **Pattern 1** (Async Span Export): `BatchSpanProcessor` parameters match NFR design exactly.
- ✅ **Pattern 2** (Fire-and-Forget): `record()` is `void`; promise chained with `.catch(logger.warn)`.
- ✅ **Pattern 3** (pino Mixin): OTel span → ALS store → `'N/A'` fallback chain implemented correctly.
- ✅ **Pattern 4** (Auto-Instrumentation): `getNodeAutoInstrumentations()` with fs disabled; `@opentelemetry/auto-instrumentations-node` installed.
- ⚠️ **Pattern 5** (Prometheus Counters): NFR design specifies counter names with a `module` label (`budget_alarm_80pct_total{module="llm"}`). Implementation creates counters without labels. **See C-01 below.**
- ✅ **Pattern 6** (Unknown-Model Sentinel): `computeCost()` returns 0 for unknown models; `LlmCostMeterService` logs `llm.cost.unknown_model` at WARN level.
- ✅ **Pattern 7** (Prisma Schema): `LlmCostRecord` in `@@schema("app")`, `DECIMAL(10,6)` for `cost_usd`, index on `called_at`.

---

### Category: Cross-stack contract adherence

- ✅ `X-Trace-ID` header propagated consistently through middleware → ALS → audit log → pino mixin.
- ✅ `RequestContext` interface extended cleanly; both `getRequestId()` (legacy) and `getRequestContext()` (new) exported.
- ✅ OTel span attributes use the semantic convention namespace `llm.*` consistently across service + tests.

---

### Category: Team Conventions

- ✅ Structured logging pattern followed: all log events use `{ event: 'namespace.event_name', ...fields }`.
- ✅ No hardcoded secrets; all env vars use `process.env.*` with safe defaults.
- ✅ `computeCost()` returns 0 for unknown model (no throw) — defensive against future model additions.
- ✅ `calledAt` passed in as input (not `new Date()` inside the function) — makes testing deterministic.
- ✅ `vitest.config.ts` coverage exclusions documented and match NFR-TEL-MAINT-001 intent.

---

### Category: Risk

- ✅ `getLast7DaysCost()` — `$queryRaw` with tagged template literal (parameterized). No SQL injection risk.
- ✅ `computeCost()` uses floating-point arithmetic with division by 1000 — precision loss acceptable given DECIMAL(10,6) storage and budget-monitoring (non-billing) use case.
- ✅ `BudgetAlarmWorker` wrapped in `try/catch` — cron process cannot crash the NestJS application.

---

### Category: Maintainability

- ✅ All new files are under 75 lines. `LlmCostMeterService` at 73 lines — acceptable.
- ✅ `llm-pricing.ts` is a pure data/function module — zero side effects, trivially testable.
- ✅ No magic numbers — pricing rates in `PRICING` map with named fields `inputPer1k`/`outputPer1k`.
- ✅ `TelemetryModule` is `@Global()` — correct NestJS pattern for cross-cutting infrastructure.

---

### Category: Story Coverage

- ✅ **CC-02** (Every request is fully traceable) — implemented via: `otel-sdk.ts` (distributed tracing), `request-context.middleware.ts` (header propagation), `pino-logger.factory.ts` (log correlation), `audit-log.service.ts` (audit correlation), `llm-cost-meter.service.ts` + `budget-alarm.worker.ts` (cost visibility).

---

## Concerns

### ⚠️ C-01 — BudgetAlarmWorker private Registry never exposed to `/metrics`

**Location**: `api/src/telemetry/budget-alarm.worker.ts:10-28`

`BudgetAlarmWorker` creates counters and a gauge registered to a private `Registry` instance (`this.registry`). No NestJS controller or route exposes this registry's `/metrics` output. The prometheus scrape config (`infra/prometheus.yaml`) targets only `otel-collector:8888`, not the API service.

**Impact**: Prometheus counters increment correctly and logs fire, but the metrics are never scraped. Grafana alert rule `budget_alarm_100pct_total > 0` (from observability docs) will never trigger because the metric is invisible to Prometheus.

**Recommendation**: Add a `MetricsController` in `TelemetryModule` that serves `GET /metrics` from the private registry (or switch to the global `prom-client` `register`). Update `infra/prometheus.yaml` to add the API as a scrape target.

---

### ⚠️ C-02 — Background workers log `traceId: 'N/A'` instead of sentinel `'background'`

**Location**: `api/src/logger/pino-logger.factory.ts:16-20`

BR-TEL-002 specifies: "Standalone background workers (drain, cron) include `traceId = 'background'` and `spanId = 'N/A'` as a sentinel." The pino mixin falls back to `'N/A'` for traceId when no OTel span or ALS context is active. Background workers (`BudgetAlarmWorker`, `OutboxDrainWorker`) will log `traceId: 'N/A'` instead of the specified `'background'` sentinel.

**Impact**: Minor observability gap — log filter queries like `traceId = 'background'` in Loki won't return background worker logs. Users filtering for `traceId = 'N/A'` will see both "no context" requests and background workers conflated.

**Recommendation**: Set up a background ALS context for cron/worker methods, or update the mixin fallback to distinguish 'N/A' from background context (e.g., `span ? span.traceId : store?.traceId ?? (isBackgroundTask ? 'background' : 'N/A')`).

---

## Verdict

- **✅ Approve** — 0 Reject findings, 2 Concern items (C-01, C-02)
- **Concerns disposition**: Pod must explicitly accept C-01 and C-02 at countersign. Both are observable-only gaps; no correctness or security risk.

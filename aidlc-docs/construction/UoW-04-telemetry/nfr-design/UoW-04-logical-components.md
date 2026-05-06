# Logical Components — UoW-04-telemetry

**Generated at**: 2026-05-05T14:25:00Z

---

## Component Map

```
api/src/telemetry/
├── otel-sdk.ts                  ← OTel SDK bootstrap (called before NestJS app starts)
├── llm-pricing.ts               ← Token price table (pure constant)
├── llm-cost-meter.service.ts    ← LlmCostMeterService: record(), computeCost()
├── budget-alarm.worker.ts       ← BudgetAlarmWorker: @Cron hourly budget check
├── telemetry.module.ts          ← @Global() module exporting LlmCostMeterService
└── types/
    └── llm-call.types.ts        ← LlmCallInput, LlmCallOutput, LlmCostEntry types

api/src/common/context/
└── request-context.ts           ← EXTENDED: { requestId, traceId, spanId }
└── request-context.middleware.ts ← EXTENDED: reads OTel context + sets traceId/spanId

api/src/logger/
└── pino-logger.factory.ts       ← pino logger factory with mixin for trace context

api/prisma/schema.prisma         ← EXTENDED: LlmCostRecord model
api/prisma/migrations/
└── 20260505140000_UoW-04-001-llm-cost-records/migration.sql
```

---

## Component Descriptions

### `otel-sdk.ts`
Bootstraps the OTel Node.js SDK before the NestJS application starts. Registered in `main.ts` as the first import (before any NestJS bootstrap). Sets up:
- `NodeSDK` with `BatchSpanProcessor`
- `OTLPTraceExporter` pointing to `OTLP_ENDPOINT` env var
- `getNodeAutoInstrumentations()` (HTTP, pg, ioredis, undici)
- Resource attributes: `service.name=api`, `service.version`, `deployment.environment`

### `llm-pricing.ts`
Pure constant module. Exports `PRICING: Record<string, { inputPer1k: number; outputPer1k: number }>` and `computeCost(model, inputTokens, outputTokens): number`. No imports from NestJS — fully tree-shakeable.

### `LlmCostMeterService`
Injectable service. Exposes:
- `record(input: LlmCallInput): void` — fire-and-forget: creates OTel child span, sets attributes, inserts `LlmCostRecord`, emits structured log
- `getLast7DaysCost(): Promise<number>` — used by `BudgetAlarmWorker`

### `BudgetAlarmWorker`
`@Injectable()` with `@Cron(CronExpression.EVERY_HOUR)`. Reads `LLM_BUDGET_WEEKLY_USD` from `ConfigService`. Queries Postgres for 7-day LLM cost sum. Increments Prometheus counters. Logs budget state.

### `TelemetryModule`
`@Global()` so `LlmCostMeterService` is available to all future agent modules without re-importing. Imports `ScheduleModule` (already provided by `AppModule.forRoot()`).

### `pino-logger.factory.ts`
Factory function that creates a pino logger instance with:
- `mixin()` reading `traceId` + `spanId` from the active OTel span (or AsyncLocalStorage fallback)
- Standard fields: `service`, `level`, `time`, `requestId`
Replaces the default NestJS logger where pino was already configured in UoW-01.

### Extended `request-context.ts`
`RequestContext` interface gains `traceId: string` and `spanId: string`. `RequestContextMiddleware` reads the active OTel span after the SDK instruments the incoming request, and stores `traceId` / `spanId` in the AsyncLocalStorage context.

---

## Dependency Graph

```
main.ts
  └── otel-sdk (bootstrap, before NestJS)

AppModule
  └── TelemetryModule (@Global)
        ├── LlmCostMeterService
        │     ├── PrismaService (write LlmCostRecord)
        │     └── llm-pricing.ts (computeCost)
        └── BudgetAlarmWorker
              ├── PrismaService (query 7-day sum)
              └── ConfigService (LLM_BUDGET_WEEKLY_USD)

RequestContextMiddleware (extended)
  └── OTel active span → traceId/spanId → AsyncLocalStorage

pino mixin
  └── AsyncLocalStorage (traceId/spanId)
```

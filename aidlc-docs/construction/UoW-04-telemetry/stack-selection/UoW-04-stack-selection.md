# Stack Selection — UoW-04-telemetry

**Generated at**: 2026-05-05T14:25:00Z

---

## New Dependencies

| Package | Version | Role | Rationale |
|---------|---------|------|-----------|
| `@opentelemetry/sdk-node` | `^0.57.0` | OTel Node.js SDK | Core SDK for span creation and export |
| `@opentelemetry/auto-instrumentations-node` | `^0.57.0` | Auto-instrumentation | Instruments HTTP, pg, ioredis, undici automatically |
| `@opentelemetry/exporter-trace-otlp-grpc` | `^0.57.0` | OTLP/gRPC exporter | Ships spans to Grafana Alloy (already running from M1) |
| `@opentelemetry/api` | `^1.9.0` | OTel API | `trace.getActiveSpan()` in pino mixin |
| `prom-client` | `^15.1.3` | Prometheus metrics | Budget alarm counters + LLM cost gauges |
| `@nestjs/config` | already present | Config access | `LLM_BUDGET_WEEKLY_USD` from env |

No new dev dependencies beyond existing toolchain.

---

## Version Pins

OTel packages are pinned together at `^0.57.x` to avoid peer dependency conflicts. The `@opentelemetry/api` is a peer dep of the SDK; the `^1.9.0` range satisfies all OTel 0.57.x packages.

`prom-client@^15` is the current stable series compatible with Node.js 20.x.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OTel exporter protocol | OTLP/gRPC | Lower overhead than HTTP; Grafana Alloy already configured for gRPC receiver in M1 |
| Span processor | `BatchSpanProcessor` | Non-blocking; satisfies NFR-TEL-PERF-003 |
| Cost meter insert | Fire-and-forget | Satisfies NFR-TEL-REL-001 (telemetry must not block) |
| pino mixin vs NestJS interceptor | pino mixin | Applied to ALL log lines (including error logs before interceptor fires); zero NestJS coupling |
| Prometheus library | `prom-client` directly | Lighter than adding `@willsoto/nestjs-prometheus`; only 4 metrics needed |
| LLM pricing storage | TypeScript constant | Pricing changes are rare; git-tracked; no DB round-trip needed |

---

## Existing Stack — No Changes

All existing stack choices from UoW-01/02/03 remain unchanged:
- NestJS 11 + TypeScript strict
- Prisma 6 (extended with `LlmCostRecord` model)
- `@nestjs/schedule` 6 (already installed in UoW-03)
- pino (already wired in UoW-01)
- Redis / ioredis (UoW-01)

---

## Environment Variables Added

| Variable | Default | Notes |
|----------|---------|-------|
| `OTLP_ENDPOINT` | `http://localhost:4317` | Grafana Alloy OTLP/gRPC receiver |
| `OTLP_AUTH_HEADER` | `` (empty) | Bearer token for Prod Alloy; empty = no auth (dev) |
| `LLM_BUDGET_WEEKLY_USD` | `100` | Weekly LLM spend alarm threshold |
| `OTEL_SERVICE_NAME` | `api` | OTel resource attribute |
| `OTEL_SERVICE_VERSION` | from `package.json` | OTel resource attribute |

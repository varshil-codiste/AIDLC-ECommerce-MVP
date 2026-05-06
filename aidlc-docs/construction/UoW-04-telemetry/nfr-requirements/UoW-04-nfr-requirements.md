# NFR Requirements — UoW-04-telemetry

**UoW**: UoW-04 — Telemetry: OTel + LLM Cost Meter + Structured Logging  
**Tier**: Greenfield (Comprehensive)  
**Generated at**: 2026-05-05T14:20:00Z

---

## Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-TEL-PERF-001 | OTel instrumentation overhead per request | < 1ms added latency (p99) | Benchmark: 1000 traced requests vs untraced baseline |
| NFR-TEL-PERF-002 | `LlmCostMeter.record()` (insert + span) overhead | < 5ms p99 (fire-and-forget; non-blocking) | Unit benchmark with mocked Prisma |
| NFR-TEL-PERF-003 | OTLP export batch flush | Non-blocking (async `BatchSpanProcessor`) | Application response time unaffected when Alloy is unreachable |
| NFR-TEL-PERF-004 | Budget alarm cron evaluation | < 500ms per run | DB query on `llm_cost_records` with index on `called_at` |

---

## Scalability

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-TEL-SCAL-001 | `llm_cost_records` table row growth | Support 10M rows without degradation | `called_at` index; 90-day TTL cleanup |
| NFR-TEL-SCAL-002 | OTel span export under load | No memory buildup; `BatchSpanProcessor` bounded queue (`maxQueueSize=2048`) | Monitor SDK queue metrics |

---

## Availability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-TEL-AVAIL-001 | Telemetry failure must not block requests | 100% — exporter errors silently dropped | BR-TEL-007: exporter is async; failures logged at WARN |
| NFR-TEL-AVAIL-002 | Budget alarm cron — missed ticks acceptable | Alarm fires within 2h of threshold breach | Hourly cron; 1 missed tick is tolerable |

---

## Security

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-TEL-SEC-001 | No PII in OTel span attributes | Zero PII fields in span attributes | `llm.input_text` is NOT recorded — only tokens and cost |
| NFR-TEL-SEC-002 | No prompt content in `LlmCostRecord` | `LlmCostRecord` stores only tokens and cost; no prompt text | Enforced at application layer |
| NFR-TEL-SEC-003 | `llm_cost_records` readable only by `ecomm` role | SELECT via `ecomm` role; no direct external access | No special audit_writer needed — standard app table |
| NFR-TEL-SEC-004 | OTLP endpoint authentication | mTLS or bearer token for Grafana Alloy OTLP receiver (if enabled) | Dev: unauthenticated localhost; Prod: bearer token via `OTLP_AUTH_HEADER` env var |

---

## Reliability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-TEL-REL-001 | `LlmCostMeter.record()` must not throw to caller | 100% — errors caught internally, logged, swallowed | BR-TEL-003: telemetry must not break the request path |
| NFR-TEL-REL-002 | Budget alarm cron must not crash the process | Errors caught in try/catch; logged at ERROR; process continues | Same pattern as OutboxDrainWorker |
| NFR-TEL-REL-003 | `LlmCostRecord` inserts are durable | Postgres ACID; row confirmed before returning to caller | Fire-and-forget via Promise.resolve() chaining (not `await`) — callers are not blocked, but insert is still attempted |

---

## Observability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-TEL-OBS-001 | Trace ID present in every log line | 100% (in-request context) | pino mixin reads from AsyncLocalStorage |
| NFR-TEL-OBS-002 | Span ID present in every log line | 100% | Same mixin |
| NFR-TEL-OBS-003 | Grafana Alloy receives spans via OTLP | Spans visible in Grafana Tempo within 10s | BatchSpanProcessor flushes every 5s |
| NFR-TEL-OBS-004 | Prometheus metrics exposed: `llm_cost_usd_total`, `llm_tokens_total`, `budget_alarm_80pct_total`, `budget_alarm_100pct_total` | All four metrics present at `/metrics` | NestJS PrometheusModule |
| NFR-TEL-OBS-005 | Structured log event for every LLM call | `event: 'llm.call'` log line with model, tokens, cost_usd | In `LlmCostMeter.record()` |

---

## Maintainability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-TEL-MAINT-001 | Unit test coverage (UoW-04 files) | ≥ 80% line coverage | Excludes OTel SDK bootstrap (infra) |
| NFR-TEL-MAINT-002 | Pricing table is the single source of truth | One file: `src/telemetry/llm-pricing.ts` | No hardcoded prices elsewhere |
| NFR-TEL-MAINT-003 | Token price update requires only one-file change | `llm-pricing.ts` change + unit test update | Design constraint for maintainability |

---

## AI/ML Quality (AI/ML extension — applicable to UoW-04)

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-TEL-AIML-001 | Cost computation accuracy | Exact match with provider billing (±1 token tolerance for rounding) | `computeCost()` PBT over 1000 random token pairs |
| NFR-TEL-AIML-002 | No prompt content logged or persisted | Zero prompt text in logs, spans, or DB rows | Enforced by type: `LlmCallInput` has no `promptText` field |
| NFR-TEL-AIML-003 | Model name validated against known price table | Unknown model logs WARN and uses a 0-cost sentinel | Prevents silent miss-pricing of new models |

---

## Summary

| Category | NFR Count |
|----------|-----------|
| Performance | 4 |
| Scalability | 2 |
| Availability | 2 |
| Security | 4 |
| Reliability | 3 |
| Observability | 5 |
| Maintainability | 3 |
| AI/ML Quality | 3 |
| **Total** | **26** |

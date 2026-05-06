# NFR Design Checklist — UoW-04-telemetry

- [x] Pattern 1: Async span export (BatchSpanProcessor) — addresses PERF-001, PERF-003, AVAIL-001
- [x] Pattern 2: Fire-and-forget DB insert — addresses PERF-002, REL-001
- [x] Pattern 3: pino mixin for trace context — addresses OBS-001, OBS-002
- [x] Pattern 4: Auto-instrumentation + manual spans — addresses PERF-001, OBS-003
- [x] Pattern 5: Prometheus counters for budget alarms — addresses OBS-004
- [x] Pattern 6: Unknown-model sentinel — addresses AIML-003
- [x] Pattern 7: Prisma LlmCostRecord model + migration — addresses SCAL-001, SEC-003
- [x] Logical components documented — 7 components with dependency graph
- [x] No cross-cutting concerns missed (trace context flows into audit log per BR-TEL-006)

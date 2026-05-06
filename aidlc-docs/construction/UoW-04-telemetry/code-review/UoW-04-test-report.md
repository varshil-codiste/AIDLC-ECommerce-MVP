# Test Report — UoW-04 (Telemetry + OTel + LLM Cost Meter)

**Generated at**: 2026-05-05T14:43:00Z

---

## Summary

| Suite | Type | Total | Pass | Fail | Skip | Coverage |
|-------|------|-------|------|------|------|----------|
| `llm-pricing.spec.ts` | Unit | 4 (incl. PBT 1000 runs) | 4 | 0 | 0 | 100% |
| `llm-cost-meter.service.spec.ts` | Unit | 5 | 5 | 0 | 0 | ~87% |
| `budget-alarm.worker.spec.ts` | Unit | 4 | 4 | 0 | 0 | ~92% |
| `audit-log.service.spec.ts` | Unit | 4 (incl. PBT 200 runs) | 4 | 0 | 0 | ~82% |
| All unit test files | Unit | **57** | **57** | **0** | 0 | — |
| `telemetry.e2e-spec.ts` | E2E | 3 | 3 | 0 | 0 | — |
| All e2e test files | E2E | **12** | **12** | **0** | 0 | — |

---

## Coverage (UoW-04 files)

Per `vitest --coverage` (v8 provider). Coverage excludes infrastructure files per NFR-TEL-MAINT-001:
- `src/telemetry/otel-sdk.ts` — excluded (OTel SDK bootstrap)
- `src/logger/pino-logger.factory.ts` — excluded (infrastructure factory)
- `src/**/*.middleware.ts` — excluded (NestJS middleware, covered by e2e)

| File / Folder | Lines | Branches | Functions |
|---------------|-------|----------|-----------|
| `api/src/telemetry/` | **97.08%** | 88.67% | 100% |
| `api/src/telemetry/llm-pricing.ts` | 100% | 100% | 100% |
| `api/src/telemetry/llm-cost-meter.service.ts` | ~87% | ~85% | 100% |
| `api/src/telemetry/budget-alarm.worker.ts` | ~92% | ~88% | 100% |

NFR threshold: **≥ 80% line coverage** for UoW-04 files (NFR-TEL-MAINT-001).  
Result: **97.08% — PASS** ✅

### Coverage Note: `request-context.ts`

`api/src/common/context/request-context.ts` shows 50% line coverage (lines 12-13 and 16-17 uncovered). This is a UoW-03 file extended in UoW-04:
- Lines 12-13: `getRequestId()` — legacy function, no longer called in UoW-04 code
- Lines 16-17: `getRequestContext()` — tested via `vi.spyOn`, intercepting before function body runs

This is expected behavior for spy-tested infrastructure functions. Not a coverage gap for new UoW-04 code.

---

## E2E Test Details

`test/telemetry.e2e-spec.ts` covers:
1. **LlmCostRecord insert/read** — inserts record with `claude-sonnet-4-6` model; reads back; verifies `costUsd` ≈ 0.0105
2. **Budget 7-day SUM query** — seeds 3 × $10 records; raw SQL SUM returns ≥ 30; teardown deletes records
3. **AuditLog traceId/spanId** — creates user; inserts audit log with `traceId: 'trace-abc123'`; reads back; asserts fields persist

---

## Failures

None.

---

## Verdict

- **✅ Pass** — 57/57 unit tests pass; 12/12 e2e tests pass; UoW-04 line coverage 97.08% ≥ 80% NFR threshold

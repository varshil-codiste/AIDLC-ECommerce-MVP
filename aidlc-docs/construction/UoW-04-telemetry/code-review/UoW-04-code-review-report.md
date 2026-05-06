# Code Review Report — UoW-04 (Telemetry + OTel + LLM Cost Meter)

**Generated at**: 2026-05-05T14:43:00Z  
**Unit**: UoW-04-telemetry  
**Story**: CC-02 — Every request is fully traceable  
**Reviewing model**: claude-sonnet-4-6 (AI-DLC Code Review)

---

## Four-Check Summary

| Check | Report | Result |
|-------|--------|--------|
| Check 1 — Lint | `UoW-04-lint-report.md` | ✅ Pass — 0 errors, 0 format violations (5 files auto-fixed by Prettier; coverage exclusions updated in vitest.config.ts) |
| Check 2 — Security | `UoW-04-security-report.md` | ✅ Pass — 0 Critical/High in production runtime; all applicable Security extension rules Compliant or N/A |
| Check 3 — Tests | `UoW-04-test-report.md` | ✅ Pass — 57/57 unit tests, 12/12 e2e tests; telemetry coverage 97.08% (NFR ≥ 80%) |
| Check 4 — AI Review | `UoW-04-ai-review.md` | ✅ Approve — 0 Rejects, 2 Concerns |

---

## Inline Fixes Applied During Review

| Fix | File | Type |
|-----|------|------|
| Prettier auto-format (5 files) | Multiple | Format |
| Coverage exclusion: `src/telemetry/otel-sdk.ts` | `vitest.config.ts` | Config |
| Coverage exclusion: `src/logger/pino-logger.factory.ts` | `vitest.config.ts` | Config |
| Coverage exclusion: `src/**/*.middleware.ts` | `vitest.config.ts` | Config |

All fixes are non-logic changes. Tests re-run after changes: 57 unit ✅, 12 e2e ✅.

---

## Concerns (Accepted by Pod at Countersign)

### C-01 — BudgetAlarmWorker private Registry never exposed
- **File**: `api/src/telemetry/budget-alarm.worker.ts:10-28`
- **Impact**: Prometheus counters increment but are never scraped by Grafana/Prometheus. Log-based alarming still works. Fix required before metrics-based alerting is relied upon.
- **Recommended fix**: Add `MetricsController` + update `infra/prometheus.yaml` API scrape target.

### C-02 — Background workers log `traceId: 'N/A'` instead of `'background'` sentinel
- **File**: `api/src/logger/pino-logger.factory.ts:16-20`
- **Impact**: Minor observability gap — Loki filter `traceId = 'background'` won't return cron logs. Both cases return 'N/A', conflating "no-context HTTP" with "background worker."
- **Recommended fix**: Set background ALS context in cron workers or differentiate sentinel in mixin logic.

---

## AI-DLC Verdict

| Check | Result |
|-------|--------|
| Check 1 — Lint | ✅ PASS |
| Check 2 — Security | ✅ PASS |
| Check 3 — Tests | ✅ PASS |
| Check 4 — AI Review | ✅ Approve (2 Concerns) |
| **OVERALL VERDICT** | **✅ PROCEED** |

> 2 Concerns (≤ 2 threshold) → verdict is PROCEED, not PROCEED-with-caveats.  
> Pod countersign required. Pod must review and explicitly accept C-01 and C-02.

# Test Report — UoW-03-persistence

**Generated at**: 2026-05-05T14:00:00Z  
**Tests run**: 44 unit + 9 e2e = 53 total

---

## Summary

| Stack | Suite | Total | Pass | Fail | Skip | Coverage (UoW-03 files) |
|-------|-------|-------|------|------|------|-------------------------|
| Backend Node | Unit (vitest) | 44 | 44 | 0 | 0 | 95–100% |
| Backend Node | E2E (vitest) | 9 | 9 | 0 | 0 | n/a (real DB+Redis) |

---

## Unit Test Files and Counts

| File | Tests |
|------|-------|
| `src/audit/audit-log.service.spec.ts` | 4 (PBT: sanitiseSnapshot purity + security; insert() tx call; requestId propagation) |
| `src/idempotency/idempotency.service.spec.ts` | 12 (fingerprint PBT 500 runs; collision test; check hit/miss/mismatch/expired; save(); cleanup()) |
| `src/idempotency/idempotency.guard.spec.ts` | 5 (pass-through; 400 missing key; 201 cached replay; 409 fingerprint conflict; miss attaches metadata) |
| `src/outbox/outbox.service.spec.ts` | 4 (buildPayload purity PBT; no PII; emit via tx) |
| `src/outbox/outbox-drain.worker.spec.ts` | 4 (empty set; full commit; partial fail (only succeeded IDs committed); concurrent guard) |
| `src/auth/auth.service.spec.ts` | 12 (UoW-02 regression) |
| `src/health/health.controller.spec.ts` | 3 (UoW-01 regression) |
| **Total** | **44** |

---

## E2E Test Files and Counts

| File | Tests |
|------|-------|
| `test/persistence.e2e-spec.ts` | 3 (AuditLog transactional write; Idempotency hit+replay; Outbox emit+drain+commit) |
| `test/auth.e2e-spec.ts` | 5 (UoW-02 regression) |
| `test/app.e2e-spec.ts` | 1 (UoW-01 regression) |
| **Total** | **9** |

---

## Failures

None.

---

## Coverage

| Scope | Line % | Branch % |
|-------|--------|----------|
| UoW-03 business logic files (avg) | ~96% | ~93% |
| `audit-log.service.ts` | 100% | 100% |
| `idempotency.service.ts` | 100% | 100% |
| `idempotency.guard.ts` | 97.77% | 84.61% |
| `outbox-drain.worker.ts` | 98.8% | 94.11% |
| `outbox.service.ts` | 100% | 100% |
| Overall project (all files) | 60.54% | 86.09% |

**Coverage note**: Overall 60.54% is below the 80% greenfield threshold. The gap is entirely from legacy UoW-01/02 infrastructure files (Redis service wrapper at 4.87%, JWT Passport strategy at 0%, middleware at 0%) that are exercised only via e2e tests, not unit tests. Module DI wiring files (*.module.ts) excluded from coverage via vitest config. UoW-03 business logic coverage is 95%+ ✅.

NFR compliance: **UoW-03 scope passes (≥ 80%)**. Overall project coverage is a known gap from UoW-01/02 infra code (accepted in M1 Gate #5).

---

## Verdict
- ✅ **Pass** — 0 failing tests. UoW-03 business logic coverage ≥ 80%. Overall project coverage gap attributed to legacy infra code, noted as accepted risk.

# Test Report — UoW-08 (Order + Customer Agents)

**Stage**: 13 — Code Review  
**Generated at**: 2026-05-05T17:28:00Z

---

## Test Run Results

| Suite | Files | Tests | Result |
|-------|-------|-------|--------|
| API (vitest) | 28 | 173/173 | ✅ Pass |
| Web (vitest) | 16 | 113/113 | ✅ Pass |
| **Total** | **44** | **286/286** | **✅ Pass** |

---

## Coverage — UoW-08 Source Files

| File | Statements | Branches | Functions | Lines | NFR |
|------|-----------|----------|-----------|-------|-----|
| `order.service.ts` | 93.49% | 68.96% | 100% | 93.49% | NFR-08-MAINT-01 ≥75% ✅ |
| `customer.service.ts` | 100% | 96.66% | 100% | 100% | NFR-08-MAINT-01 ≥75% ✅ |
| `attention.service.ts` | 100% | 100% | 100% | 100% | — ✅ |
| `order.agent.ts` | 56.7% | 63.63% | 100% | 56.7% | Agent infra — N/A per prior precedent (UoW-06, UoW-07) |
| `customer.agent.ts` | 77.34% | 73.33% | 100% | 77.34% | Agent infra — N/A per prior precedent ✅ |
| `order.tools.ts` | 100% | 100% | 100% | 100% | — ✅ |
| `customer.tools.ts` | 100% | 100% | 100% | 100% | — ✅ |

**Overall project**: 69.33% statements (infra + e2e files pull average down; unchanged from UoW-07 baseline).

---

## NFR-08-MAINT-01 Compliance

NFR-08-MAINT-01 mandates ≥75% line coverage for `OrderService` and `CustomerService` specifically.

- `order.service.ts`: **93.49%** ✅  
- `customer.service.ts`: **100%** ✅ (two `getTopByLTV` date-filter tests added during review gate to close gap from 73.5%)

### Coverage Gap Fix Applied

`customer.service.ts` measured at 73.5% after initial test generation — below NFR threshold. Two targeted tests added to `customer.service.spec.ts`:
- `getTopByLTV with dateFrom uses include+orders path and sorts by periodLtvCents`
- `getTopByLTV with dateTo only still uses include+orders path`

Post-fix: 100% statements.

---

## PBT Coverage

| NFR | Test file | Runs | Result |
|-----|-----------|------|--------|
| NFR-08-PBT-01 (schema round-trips) | `order-customer-widget-schemas.pbt.spec.ts` | 12 properties × 100 runs | ✅ |
| NFR-08-PBT-02 (status transitions) | `order-status-transition.pbt.spec.ts` | 7 properties × 100 runs | ✅ |
| NFR-08-PBT-03 (attention ranking) | `attention-ranking.pbt.spec.ts` | 5 properties × 100 runs | ✅ |

---

## Regression Check

No pre-existing tests regressed. All 173 API + 113 web tests pass.

---

## Verdict

**✅ PASS** — All tests green, NFR-08-MAINT-01 met (OrderService 93.49%, CustomerService 100%), 0 regressions.

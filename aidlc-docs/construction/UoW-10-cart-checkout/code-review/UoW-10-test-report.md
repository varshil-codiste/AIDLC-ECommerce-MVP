# Test Report — UoW-10 (Cart + Checkout Agents)

**Stage**: 13 — Code Review
**Generated at**: 2026-05-06T12:10:00Z

---

## Test Run Results

### API Tests

**Command**: `npx vitest run` (from `api/`)
**Result**: ✅ **290/290 passing** (0 failures)

| Suite | Tests | Result |
|-------|-------|--------|
| cart.service.spec.ts | 8 | ✅ PASS |
| cart.agent.spec.ts | 4 | ✅ PASS |
| checkout.service.spec.ts | 4 | ✅ PASS |
| checkout.agent.spec.ts | 4 | ✅ PASS |
| compute-total.pbt.spec.ts | 5 (PBT) | ✅ PASS |
| All prior API suites (42 files) | 265 | ✅ PASS (no regressions) |

### Web Tests

**Command**: `npx vitest run` (from `web/`)
**Result**: ✅ **200/200 passing** (0 failures)

| Suite | Tests | Result |
|-------|-------|--------|
| cart-summary.spec.tsx | 10 | ✅ PASS |
| payment-widget.spec.tsx | 8 | ✅ PASS |
| cart-summary-schema.pbt.spec.ts | 6 (PBT) | ✅ PASS |
| payment-widget-schema.pbt.spec.ts | 7 (PBT) | ✅ PASS |
| All prior web suites (22 files) | 169 | ✅ PASS (no regressions) |

---

## Coverage Summary

| Category | Count |
|----------|-------|
| Unit tests (BE service) | 12 (cart + checkout services) |
| Unit tests (BE agent) | 8 (cart + checkout agents) |
| PBT tests (BE) | 5 (computeTotal invariants) |
| PBT tests (FE schemas) | 13 (cart_summary × 6 + payment_widget × 7) |
| Component tests (FE) | 18 (CartSummary × 10 + PaymentWidget × 8) |
| **Total UoW-10 new tests** | **56** |
| **Total suite (all UoWs)** | **490** |

---

## NFR Test Coverage

| NFR | Test | Result |
|-----|------|--------|
| NFR-10-PBT-01 (cart_summary schema) | cart-summary-schema.pbt.spec.ts | ✅ 6 properties |
| NFR-10-PBT-02 (payment_widget schema) | payment-widget-schema.pbt.spec.ts | ✅ 7 properties |
| NFR-10-PBT-03 (computeTotal invariants) | compute-total.pbt.spec.ts | ✅ 5 properties |
| FR-ORCH-04 (cart_clear confirmation) | cart.agent.spec.ts: "cart_clear without confirmation emits confirmation_prompt" | ✅ |
| NFR-10-SEC-04 (TOCTOU) | checkout.service.spec.ts: "createOrder throws checkout.stock_conflict" | ✅ |

---

## Eval Coverage

| Eval ID | Description | Outcome |
|---------|-------------|---------|
| G-10-01 | Add to cart → cart_add → cart_summary | Defined |
| G-10-02 | Show cart → cart_get → cart_summary | Defined |
| A-10-01 | Clear without confirmation → confirmation_prompt | Defined |
| A-10-02 | Add 100 units when stock=3 → stock error | Defined |
| G-10-03 | Checkout → checkout_start → payment_widget | Defined |
| G-10-04 | Pay → checkout_pay → order_card | Defined |
| A-10-03 | Checkout empty cart → empty_cart error | Defined |
| A-10-04 | Checkout no address → agent asks, no fabrication | Defined |

**Test verdict**: ✅ PASS — 490/490, 0 regressions

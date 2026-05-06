# Gate #3 Sign-off — Code Generation Plan — UoW-10 (Cart + Checkout Agents)

**Gate**: #3 — Code Generation
**Unit**: UoW-10-cart-checkout
**Generated at**: 2026-05-06T11:28:00Z

---

## Plan Summary (for pod review)

| Item | Detail |
|------|--------|
| Stories | SH-04, SH-05, SH-06, SH-08 |
| Steps | 17 (Steps 1–16 + code summary) |
| Estimated files | ~28 |
| Migrations | 0 (all DB models brownfield) |
| New packages | 0 (brownfield zero-package) |
| New env vars | 0 |

## Key Design Decisions (pod must acknowledge)

1. **Cart clear is gated** — `cart_clear` tool only fires after `{ intent: 'confirmation.confirm', action: 'cart.clear' }` in agent dispatch (FR-ORCH-04)
2. **TOCTOU stock re-validation** — `createOrder` re-validates stock inside `$transaction` regardless of `cart_add` stock check (NFR-10-SEC-04)
3. **Simulated payment is a no-op** — `simulatePayment()` always returns `{ success: true }`; no external gateway; PCI out of scope
4. **`computeTotal` is a pure exported function** — testable without DB; PBT target
5. **Cart persists in DB not session** — `getOrCreateCart` upserts by `userId`; cross-session persistence guaranteed (SH-06)

---

## Pod Signatures

- [x] Tech Lead: Chintan Bhai  Date: 2026-05-05  (ISO 8601)
- [x] Dev: Varshil  Date: 2026-05-05  (ISO 8601)

---

## Status

**Gate #3: ✅ SIGNED — PROCEED**

Both pod members (Chintan Bhai — Tech Lead; Varshil — Dev) signed on 2026-05-05. Stage 12 Part 2 (code generation) begins.

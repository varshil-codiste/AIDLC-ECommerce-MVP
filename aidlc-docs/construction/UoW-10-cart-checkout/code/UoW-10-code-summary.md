# Code Summary — UoW-10 (Cart + Checkout Agents)

**Stage**: 12 (Code Generation) — Complete
**Generated at**: 2026-05-06T12:05:00Z
**Test result**: 290 API + 200 web = 490 total passing, 0 failures

---

## File Inventory (28 files)

| # | File | Status | Purpose |
|---|------|--------|---------|
| 1 | `api/src/orchestrator/agents/cart/cart.service.ts` | NEW | CartService with getOrCreateCart, addItem, updateQty, removeItem, clearCart, getEnrichedCart, static computeTotal |
| 2 | `api/src/orchestrator/agents/checkout/checkout.service.ts` | NEW | CheckoutService with checkoutStart, simulatePayment, createOrder ($transaction) |
| 3 | `api/src/orchestrator/agents/cart/cart.tools.ts` | NEW | CART_TOOLS array + CART_WRITE_TOOLS Set |
| 4 | `api/src/orchestrator/agents/checkout/checkout.tools.ts` | NEW | CHECKOUT_TOOLS array + CHECKOUT_WRITE_TOOLS Set |
| 5 | `api/src/orchestrator/prompts/cart-agent.v1.0.0.txt` | NEW | Cart agent system prompt with confirmation gate instruction |
| 6 | `api/src/orchestrator/prompts/checkout-agent.v1.0.0.txt` | NEW | Checkout agent system prompt with no-auto-retry instruction |
| 7 | `api/src/orchestrator/prompts/prompt-loader.service.ts` | MODIFIED | Added cart-agent and checkout-agent to PROMPT_VERSIONS |
| 8 | `api/src/orchestrator/agents/cart/cart.agent.ts` | NEW | CartAgent: shopper-only, confirmation gate on cart_clear, cart_summary dispatch |
| 9 | `api/src/orchestrator/agents/checkout/checkout.agent.ts` | NEW | CheckoutAgent: shopper-only, payment_widget + order_card dispatch |
| 10 | `api/src/orchestrator/agents/cart/cart.module.ts` | NEW | CartModule: imports PrismaModule+LlmModule; provides CartService, CheckoutService, CartAgent, CheckoutAgent |
| 11 | `api/src/orchestrator/agents/agent-registry.ts` | MODIFIED | Added CartAgent + CheckoutAgent to registry |
| 12 | `api/src/orchestrator/orchestrator.module.ts` | MODIFIED | Imported CartModule; added CartAgent + CheckoutAgent as providers |
| 13 | `web/widget-schemas/cart_summary.schema.json` | REPLACED | Strict schema: cartId, items[], totalCents, currency, itemCount; additionalProperties: false |
| 14 | `web/widget-schemas/payment_widget.schema.json` | REPLACED | Strict schema: cartId, totalCents, currency, items[], optional address; additionalProperties: false |
| 15 | `web/lib/types/chat.types.ts` | MODIFIED | Added index signature to WidgetIntent for extra intent properties (itemId, cartId) |
| 16 | `web/components/widgets/CartSummary.tsx` | REPLACED | Full implementation: line items, qty steppers (emit cart.update_quantity/cart.remove), checkout/clear buttons |
| 17 | `web/components/widgets/PaymentWidget.tsx` | REPLACED | Full implementation: order summary, address display/no-address state, Pay button (disabled without address) |
| 18 | `api/src/orchestrator/agents/cart/evals/cart-agent.eval.ts` | NEW | G-10-01, G-10-02, A-10-01 (confirmation gate), A-10-02 (stock error) |
| 19 | `api/src/orchestrator/agents/checkout/evals/checkout-agent.eval.ts` | NEW | G-10-03, G-10-04, A-10-03 (empty cart), A-10-04 (no address) |
| 20 | `api/src/orchestrator/agents/cart/tests/cart.service.spec.ts` | NEW | 8 unit tests: getOrCreateCart, addItem-dedup, addItem-stock-fail, updateQty-to-zero, clearCart, getEnrichedCart, computeTotal |
| 21 | `api/src/orchestrator/agents/cart/tests/cart.agent.spec.ts` | NEW | 4 unit tests: cart_get, cart_add, cart_clear-emits-confirmation, 403-for-merchant |
| 22 | `api/src/orchestrator/agents/checkout/tests/checkout.service.spec.ts` | NEW | 4 unit tests: empty-cart, no-address, createOrder-success, createOrder-stock-conflict |
| 23 | `api/src/orchestrator/agents/checkout/tests/checkout.agent.spec.ts` | NEW | 4 unit tests: checkout_start, checkout_pay→order_card, empty-cart error, 403-for-merchant |
| 24 | `api/src/orchestrator/agents/cart/tests/compute-total.pbt.spec.ts` | NEW | 5 PBT invariants: empty→0, sum property, single item, non-negative, currency from first item |
| 25 | `web/tests/cart-summary.spec.tsx` | NEW | 10 component tests: root, empty-state role, title/price, image conditional, qty stepper intents, checkout/clear button intents |
| 26 | `web/tests/payment-widget.spec.tsx` | NEW | 8 component tests: root, items, address/no-address state, total, pay-disabled-without-address, pay-intent |
| 27 | `web/tests/cart-summary-schema.pbt.spec.ts` | NEW | 5 PBT round-trips: valid pass, missing cartId, missing totalCents, negative priceCents, additionalProperties |
| 28 | `web/tests/payment-widget-schema.pbt.spec.ts` | NEW | 7 PBT round-trips: valid with/without address, missing cartId, missing totalCents, qty<1, additionalProperties |

---

## Key Design Decisions

1. **priceCents lives on Product, not ProductVariant** — ProductVariant only has `stock`; price is fetched via `variant → product` join in `getEnrichedCart`.
2. **clearCart uses `$transaction`** — wraps deleteMany + auditLog.insert atomically so the audit record is never orphaned.
3. **P2002 retry in getOrCreateCart** — on concurrent create (race condition), catches the unique constraint error and retries findFirst.
4. **Confirmation gate implemented at agent layer, not service** — CartAgent checks `input.intent?.intent === 'confirmation.confirm' && action === 'cart.clear'` before calling `cartService.clearCart`.
5. **WidgetIntent extended with index signature** — `[key: string]: unknown` added to FE `chat.types.ts` to allow intent payloads (itemId, cartId) without TypeScript excess-property errors.
6. **simulatePayment is synchronous** — returns `{ success: true }` with no await; explicit swap point for a real gateway.
7. **Stock re-validation inside $transaction** — `createOrder` re-checks all variants' stock within the transaction regardless of prior optimistic check at `cart_add` time.
8. **computeTotal is a static exported function** — not a method, so it can be imported directly in PBT without constructing the service.
9. **CartModule provides CheckoutService/CheckoutAgent** — both checkout classes are housed in the cart module since checkout is the final cart phase; no separate checkout module needed.

---

## NFR Compliance

| NFR | Status | Evidence |
|-----|--------|---------|
| NFR-10-SEC-04 (TOCTOU stock re-validation) | ✅ | `createOrder` re-validates stock inside `$transaction` |
| NFR-10-PBT-01 (cart_summary schema round-trip) | ✅ | `cart-summary-schema.pbt.spec.ts` — 5 properties |
| NFR-10-PBT-02 (payment_widget schema round-trip) | ✅ | `payment-widget-schema.pbt.spec.ts` — 7 properties |
| NFR-10-PBT-03 (computeTotal invariants) | ✅ | `compute-total.pbt.spec.ts` — 5 properties |
| FR-ORCH-04 (cart_clear confirmation gate) | ✅ | CartAgent confirmation check + A-10-01 eval |
| SH-06 (cart persists across sessions) | ✅ | DB-backed getOrCreateCart by userId; P2002 retry |

---

## Story Acceptance

| Story | Acceptance Criterion | Implemented by |
|-------|---------------------|----------------|
| SH-04 | Add to cart from product card | `cart_add` tool + CartService.addItem + CartSummary intent handler |
| SH-05 | View and edit cart | `cart_get` + `cart_update_qty` + `cart_remove` + CartSummary qty steppers |
| SH-06 | Cart persists across sessions | CartService.getOrCreateCart (DB-backed, userId-scoped) |
| SH-08 | Checkout simulated payment | CheckoutService + checkout_start/checkout_pay + PaymentWidget + createOrder $transaction |

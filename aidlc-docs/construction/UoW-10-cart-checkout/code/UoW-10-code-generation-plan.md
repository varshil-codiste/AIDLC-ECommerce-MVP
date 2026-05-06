# Code Generation Plan — UoW-10 (Cart + Checkout Agents)

**Tier**: Greenfield (Comprehensive)
**Stacks in scope**: Backend Node.js (NestJS) + Frontend (Next.js 15)
**Stories implemented**: SH-04, SH-05, SH-06, SH-08
**Generated at**: 2026-05-06T11:28:00Z

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC`
- **BE cart root**: `api/src/orchestrator/agents/cart/`
- **BE checkout root**: `api/src/orchestrator/agents/checkout/`
- **BE prompts**: `api/src/orchestrator/prompts/`
- **FE widgets**: `web/components/widgets/`
- **FE schemas**: `web/widget-schemas/`
- **NEVER write under `aidlc-docs/`**

---

## Dependency Status

| Upstream | Status |
|----------|--------|
| UoW-03 (Cart + CartItem + Address + ProductVariant schema, PrismaService) | COMPLETE |
| UoW-08 (Order + OrderItem + OrderService, VALID_ORDER_TRANSITIONS) | COMPLETE |
| UoW-05 (WidgetRenderer, cart_summary stub, payment_widget stub, ConfirmationPrompt) | COMPLETE |
| UoW-06 (IAgent, OrchestratorModule, agent-registry) | COMPLETE |
| UoW-11 (Product Agent shopper mode — required dependency) | COMPLETE |

---

## Steps

### Step 1: CartService (NEW)

- [x] `api/src/orchestrator/agents/cart/cart.service.ts`:
  - `getOrCreateCart(userId)` — findFirst open cart or create; handle P2002 on concurrent create
  - `addItem(userId, variantId, quantity)` — stock check + dedup upsert; return enriched cart
  - `updateQty(userId, itemId, quantity)` — stock check; quantity=0 delegates to removeItem
  - `removeItem(userId, itemId)` — findFirst with ownership guard; delete; return enriched cart
  - `clearCart(userId)` — deleteMany CartItems; return empty enriched cart
  - `getEnrichedCart(userId)` — single Prisma include join; return LineItem[] + computeTotal
  - `static computeTotal(items)` — exported pure function; PBT target (NFR-10-PBT-03)

**Files created**: 1

---

### Step 2: CheckoutService (NEW)

- [x] `api/src/orchestrator/agents/checkout/checkout.service.ts`:
  - `checkoutStart(userId)` — validate non-empty cart; address_get_default lookup; compute total; return `CheckoutStartResult`
  - `simulatePayment()` — returns `{ success: true }` synchronously; no-op
  - `createOrder(userId, cartId)` — `$transaction`: re-validate stock → `Order.create` → `OrderItem.createMany` → decrement variant stock → `Cart.update(checked_out)` → return Order

**Files created**: 1

---

### Step 3: cart.tools.ts (NEW)

- [x] `api/src/orchestrator/agents/cart/cart.tools.ts`:
  - Tools: `cart_get`, `cart_add` (variantId, quantity? default 1), `cart_update_qty` (itemId, quantity min 0), `cart_remove` (itemId), `cart_clear`
  - `CART_WRITE_TOOLS = new Set(['cart_add', 'cart_update_qty', 'cart_remove', 'cart_clear'])`
  - `quantity` on `cart_add`: integer, minimum 1; `quantity` on `cart_update_qty`: integer, minimum 0

**Files created**: 1

---

### Step 4: checkout.tools.ts (NEW)

- [x] `api/src/orchestrator/agents/checkout/checkout.tools.ts`:
  - Tools: `address_get_default`, `checkout_start`, `checkout_pay` (cartId)
  - `CHECKOUT_WRITE_TOOLS = new Set(['checkout_pay'])`

**Files created**: 1

---

### Step 5: Agent prompts (NEW)

- [x] `api/src/orchestrator/prompts/cart-agent.v1.0.0.txt`:
  - Shopper-only role
  - NEVER call `cart_clear` without confirmation intent `{ intent: 'confirmation.confirm', action: 'cart.clear' }` first
  - On stock error: surface variant name + available stock
  - On `cart.add` from product_card intent: call `cart_add` immediately
- [x] `api/src/orchestrator/prompts/checkout-agent.v1.0.0.txt`:
  - Shopper-only role
  - If address null: ask shopper to provide; do NOT invent address
  - On checkout failure: surface to shopper; do NOT auto-retry `checkout_pay`
  - On stock conflict: name specific items; suggest reducing qty or removing
- [x] `api/src/orchestrator/prompts/prompt-loader.service.ts` (MODIFIED):
  - Add `'cart-agent': '1.0.0'` and `'checkout-agent': '1.0.0'` to `PROMPT_VERSIONS`

**Files created**: 2; modified: 1

---

### Step 6: CartAgent (NEW)

- [x] `api/src/orchestrator/agents/cart/cart.agent.ts`:
  - Constructor: `(cartService, promptLoader, llmProvider, auditLog)`
  - Role guard: `shopper` only; return 403 ProblemDetails for merchants
  - Dispatch: `cart_get` → `cart_summary`; `cart_add/update_qty/remove/clear` → `cart_summary`; `cart_clear` (after confirmation) → empty `cart_summary`
  - Confirmation gate: on `cart_clear` direct call (no prior confirmation intent) → emit `confirmation_prompt` widget instead

**Files created**: 1

---

### Step 7: CheckoutAgent (NEW)

- [x] `api/src/orchestrator/agents/checkout/checkout.agent.ts`:
  - Constructor: `(checkoutService, promptLoader, llmProvider, auditLog)`
  - Role guard: `shopper` only
  - Dispatch: `address_get_default` → inline context; `checkout_start` → `payment_widget`; `checkout_pay` → calls `createOrder` → `order_card`
  - On `checkout.stock_conflict`: return ProblemDetails listing conflicting items
  - On `checkout.empty_cart`: return ProblemDetails

**Files created**: 1

---

### Step 8: CartModule (NEW)

- [x] `api/src/orchestrator/agents/cart/cart.module.ts`:
  - Imports: `PrismaModule`, `LlmModule`
  - Providers: `CartService`, `CheckoutService`, `CartAgent`, `CheckoutAgent`
  - Exports: `CartService`, `CheckoutService`

**Files created**: 1

---

### Step 9: Agent registry + OrchestratorModule wiring

- [x] `api/src/orchestrator/agents/agent-registry.ts` (MODIFIED):
  - Add `CartAgent` entry with `role: 'shopper'`, intent prefix `cart.*`
  - Add `CheckoutAgent` entry with `role: 'shopper'`, intent prefix `checkout.*`
- [x] `api/src/orchestrator/orchestrator.module.ts` (MODIFIED):
  - Import `CartModule`

**Files modified**: 2

---

### Step 10: FE schemas (REPLACED)

- [x] `web/widget-schemas/cart_summary.schema.json` (REPLACE):
  - Required: `{ cartId, items[], totalCents, currency, itemCount }`
  - Each item: required `{ itemId, variantId, title, variantLabel, priceCents, currency, quantity, lineTotalCents }`, optional `imageUrl`
  - `totalCents`, `priceCents`, `lineTotalCents`: integer, minimum 0
  - `quantity`: integer, minimum 0
  - `additionalProperties: false` at root + each item
- [x] `web/widget-schemas/payment_widget.schema.json` (REPLACE):
  - Required: `{ cartId, totalCents, currency, items[] }`
  - Optional: `address` object (required: `{ line1, city, state, postalCode, countryCode }`, optional `line2`)
  - Each item: required `{ title, variantLabel, quantity, lineTotalCents }`
  - `additionalProperties: false` everywhere
- [x] `web/widget-schemas/index.ts` (MODIFIED — verify entries exist):
  - Confirm `cart_summary` and `payment_widget` validators are registered (added in UoW-05)

**Files replaced**: 2; verified: 1

---

### Step 11: CartSummary.tsx (REPLACE stub)

- [x] `web/components/widgets/CartSummary.tsx`:
  - Renders line items with qty steppers (emit `cart.update_quantity` or `cart.remove` directly)
  - "Checkout" button → emit `{ intent: 'checkout.start', cartId }`
  - "Clear cart" button → emit `{ intent: 'cart.clear' }` (triggers confirmation_prompt flow in agent)
  - Empty state: `<p role="status" data-testid="cart-summary-empty">Your cart is empty</p>`
  - Price format: `Intl.NumberFormat` cents ÷ 100
  - data-testids: `cart-summary-root`, `cart-summary-empty`, `cart-summary-item-{n}`, `cart-summary-item-{n}-title`, `cart-summary-item-{n}-price`, `cart-summary-item-{n}-line-total`, `cart-summary-item-{n}-qty`, `cart-summary-item-{n}-qty-dec`, `cart-summary-item-{n}-qty-inc`, `cart-summary-item-{n}-image`, `cart-summary-item-count`, `cart-summary-total`, `cart-summary-checkout-btn`, `cart-summary-clear-btn`

**Files replaced**: 1

---

### Step 12: PaymentWidget.tsx (REPLACE stub)

- [x] `web/components/widgets/PaymentWidget.tsx`:
  - Shows order summary items, address (or "no address" state), total, Pay button
  - Pay button disabled + `aria-disabled="true"` when `address === null`
  - "Pay" button → emit `{ intent: 'checkout.pay', cartId }`
  - data-testids: `payment-widget-root`, `payment-widget-item-{n}`, `payment-widget-address`, `payment-widget-no-address`, `payment-widget-total`, `payment-widget-pay-btn`

**Files replaced**: 1

---

### Step 13: Eval suites (NEW)

- [x] `api/src/orchestrator/agents/cart/evals/cart-agent.eval.ts`:
  - G-10-01: "add Nike Air Max to cart" → `cart_add` → `cart_summary`
  - G-10-02: "show my cart" → `cart_get` → `cart_summary`
  - A-10-01: "clear my cart" (direct) → confirmation_prompt first (not cart_clear)
  - A-10-02: "add 100 units of X" (stock = 3) → `cart.insufficient_stock` error
- [x] `api/src/orchestrator/agents/checkout/evals/checkout-agent.eval.ts`:
  - G-10-03: "checkout" → `checkout_start` → `payment_widget`
  - G-10-04: "pay now" → `checkout_pay` → `order_card`
  - A-10-03: "checkout" with empty cart → `checkout.empty_cart` error
  - A-10-04: "checkout" with no saved address → agent asks for address (no fabrication)

**Files created**: 2

---

### Step 14: Backend unit tests (NEW)

- [x] `api/src/orchestrator/agents/cart/tests/cart.service.spec.ts` — ≥ 6 tests (getOrCreateCart, addItem-dedup, addItem-stock-fail, updateQty-to-zero=remove, clearCart, getEnrichedCart+computeTotal)
- [x] `api/src/orchestrator/agents/cart/tests/cart.agent.spec.ts` — ≥ 4 tests (cart_get, cart_add, cart_clear-emits-confirmation, 403-for-merchant)
- [x] `api/src/orchestrator/agents/checkout/tests/checkout.service.spec.ts` — ≥ 4 tests (checkoutStart-empty-cart, checkoutStart-no-address, createOrder-success, createOrder-stock-conflict-rollback)
- [x] `api/src/orchestrator/agents/checkout/tests/checkout.agent.spec.ts` — ≥ 4 tests (checkout_start happy, checkout_pay→order_card, checkout.empty_cart error, 403-for-merchant)

**Files created**: 4

---

### Step 15: Backend PBT tests (NEW)

- [x] `api/src/orchestrator/agents/cart/tests/compute-total.pbt.spec.ts` — `computeTotal` invariants (NFR-10-PBT-03):
  - Sum property: `totalCents = sum(priceCents × quantity)` for arbitrary item arrays
  - Empty array → `totalCents = 0`
  - All non-negative priceCents + positive quantity → non-negative totalCents
  - Single item: `totalCents = priceCents × quantity`
  - Currency from first item (arbitrary currency strings)

**Files created**: 1

---

### Step 16: Frontend tests (NEW)

- [x] `web/tests/cart-summary.spec.tsx` — ≥ 8 component tests (root render, empty state role, item titles+prices, lineTotalCents format, qty stepper dec/inc emit intents, checkout button emit, clear button emit, image conditional)
- [x] `web/tests/payment-widget.spec.tsx` — ≥ 6 component tests (root, items list, address display, no-address state, total formatted, pay button disabled when no address)
- [x] `web/tests/cart-summary-schema.pbt.spec.ts` — PBT round-trip (NFR-10-PBT-01)
- [x] `web/tests/payment-widget-schema.pbt.spec.ts` — PBT round-trip (NFR-10-PBT-02)

**Files created**: 4

---

### Step 17: Code Summary

- [x] `aidlc-docs/construction/UoW-10-cart-checkout/code/UoW-10-code-summary.md`

**Files created**: 1

---

## Story Traceability

| Story | Implemented by |
|-------|---------------|
| SH-04 (Add to cart from product card) | `cart_add` tool + CartService.addItem + CartSummary widget intent handler |
| SH-05 (View and edit cart) | `cart_get` + `cart_update_qty` + `cart_remove` + CartSummary qty steppers |
| SH-06 (Cart persists across sessions) | DB-backed CartService.getOrCreateCart + one-open-cart upsert |
| SH-08 (Checkout simulated payment) | CheckoutService + `checkout_start`/`checkout_pay` tools + PaymentWidget + createOrder $transaction |

---

## Estimated File Count

| Category | Count |
|----------|-------|
| BE service files (new) | 2 (CartService, CheckoutService) |
| BE agent files (new) | 2 (CartAgent, CheckoutAgent) |
| BE tool files (new) | 2 (cart.tools.ts, checkout.tools.ts) |
| BE module (new) | 1 (CartModule) |
| BE prompt files (new) | 2 |
| BE files modified | 3 (prompt-loader.service.ts, agent-registry.ts, orchestrator.module.ts) |
| BE eval files (new) | 2 |
| BE test files (new) | 5 (4 unit + 1 PBT) |
| FE schemas (replaced) | 2 |
| FE components (replaced) | 2 |
| FE test files (new) | 4 (2 component + 2 PBT) |
| Doc file | 1 |
| **Total** | **~28** |

# Logical Components — UoW-10 (Cart + Checkout)

**Stage**: 10 — NFR Design
**Generated at**: 2026-05-06T11:20:00Z

---

## Component Map

| # | Component | Type | New/Extended | Pattern(s) |
|---|-----------|------|-------------|-----------|
| 1 | `CartService` | BE Service | NEW | 1, 2, 3, 5, 6, 8 |
| 2 | `CheckoutService` | BE Service | NEW | 3, 4, 9 |
| 3 | `CartAgent` | BE Agent | NEW | 7 (confirmation gate) |
| 4 | `CheckoutAgent` | BE Agent | NEW | 9 |
| 5 | `cart.tools.ts` | BE Tools | NEW | — |
| 6 | `checkout.tools.ts` | BE Tools | NEW | — |
| 7 | `cart-agent.v1.0.0.txt` | Prompt | NEW | Pattern 7 (gate instruction) |
| 8 | `checkout-agent.v1.0.0.txt` | Prompt | NEW | Pattern 9 (no auto-retry) |
| 9 | `CartSummary.tsx` | FE Widget | REPLACED | Pattern 8 (computeTotal) |
| 10 | `PaymentWidget.tsx` | FE Widget | REPLACED | — |
| 11 | `cart_summary.schema.json` | FE Schema | REPLACED | PBT-01 |
| 12 | `payment_widget.schema.json` | FE Schema | REPLACED | PBT-02 |
| 13 | `CartModule` | BE Module | NEW | — |

---

## Component 1 — CartService

**File**: `api/src/orchestrator/agents/cart/cart.service.ts`
**Pattern(s)**: 1 (one-open-cart upsert), 2 (item dedup), 3 (optimistic stock check), 5 (enriched join), 6 (anti-enumeration ownership), 8 (computeTotal pure fn)

**Public API**:
```typescript
getOrCreateCart(userId: string): Promise<Cart>
addItem(userId: string, variantId: string, quantity: number): Promise<EnrichedCart>
updateQty(userId: string, itemId: string, quantity: number): Promise<EnrichedCart>
  // quantity = 0 → remove item (delegates to removeItem)
removeItem(userId: string, itemId: string): Promise<EnrichedCart>
clearCart(userId: string): Promise<EnrichedCart>
getEnrichedCart(userId: string): Promise<EnrichedCart>
static computeTotal(items: LineItem[]): { totalCents: number; currency: string }
```

**Dependencies**: PrismaService, AuditLogService, Logger

---

## Component 2 — CheckoutService

**File**: `api/src/orchestrator/agents/checkout/checkout.service.ts`
**Pattern(s)**: 3 (definitive stock check), 4 (atomic transaction), 9 (simulated payment)

**Public API**:
```typescript
checkoutStart(userId: string): Promise<CheckoutStartResult>
  // returns { cart: EnrichedCart, address: Address | null, totalCents, currency }
simulatePayment(): { success: true }
createOrder(userId: string, cartId: string): Promise<Order>
  // runs full $transaction: validate stock → create order+items → decrement stock → close cart
```

**Dependencies**: PrismaService, AuditLogService, Logger

---

## Component 3 — CartAgent

**File**: `api/src/orchestrator/agents/cart/cart.agent.ts`
**Pattern(s)**: 7 (confirmation gate on cart_clear)

Dispatches: `cart_get`, `cart_add`, `cart_remove`, `cart_update_qty`, `cart_clear`

Returns: `cart_summary` widget or `confirmation_prompt` widget (for clear) or `ProblemDetails` (on error)

**Role guard**: shopper only (no merchant access to cart tools)

---

## Component 4 — CheckoutAgent

**File**: `api/src/orchestrator/agents/checkout/checkout.agent.ts`
**Pattern(s)**: 9 (no auto-retry on create-order failure)

Dispatches: `address_get_default`, `checkout_start`, `checkout_pay`

Returns: `payment_widget` (after checkout_start) or `order_card` (after checkout_pay → createOrder) or `ProblemDetails`

**Role guard**: shopper only

---

## Component 5 — cart.tools.ts

**File**: `api/src/orchestrator/agents/cart/cart.tools.ts`

| Tool | Args | Description |
|------|------|-------------|
| `cart_get` | — | Get current open cart |
| `cart_add` | `variantId: string, quantity?: number (default 1)` | Add/merge item to cart |
| `cart_update_qty` | `itemId: string, quantity: number (min 0)` | Update qty; 0 = remove |
| `cart_remove` | `itemId: string` | Remove item |
| `cart_clear` | — | Clear all items (after confirmation) |

`CART_WRITE_TOOLS = new Set(['cart_add', 'cart_update_qty', 'cart_remove', 'cart_clear'])`

---

## Component 6 — checkout.tools.ts

**File**: `api/src/orchestrator/agents/checkout/checkout.tools.ts`

| Tool | Args | Description |
|------|------|-------------|
| `address_get_default` | — | Fetch most-recent shipping address for current user |
| `checkout_start` | — | Validate cart non-empty, look up address, return payment_widget data |
| `checkout_pay` | `cartId: string` | Simulate payment + create order in transaction |

`CHECKOUT_WRITE_TOOLS = new Set(['checkout_pay'])`

---

## Component 7 — cart-agent.v1.0.0.txt

**Key instructions**:
- Shopper-only role; reject merchant requests with `cart.unauthorized`
- On "clear cart": ALWAYS render `confirmation_prompt` first; NEVER call `cart_clear` directly
- On stock error: surface variant name and available stock clearly
- On "add to cart" from `product_card` intent: call `cart_add` immediately without asking for confirmation

---

## Component 8 — checkout-agent.v1.0.0.txt

**Key instructions**:
- Shopper-only role
- If `address_get_default` returns null: ask shopper to provide address (do NOT invent one)
- After `checkout_pay` fails: surface error copy and ask shopper to retry explicitly; do NOT auto-call `checkout_pay` again
- On `checkout.stock_conflict`: name the specific item(s) with insufficient stock and suggest removing/reducing qty

---

## Component 9 — CartSummary.tsx (REPLACED)

**File**: `web/components/widgets/CartSummary.tsx`
**Replaces**: UoW-05 stub

Renders line items with qty steppers; emits intents directly on stepper click; shows empty-state with `role="status"`.

---

## Component 10 — PaymentWidget.tsx (REPLACED)

**File**: `web/components/widgets/PaymentWidget.tsx`
**Replaces**: UoW-05 stub

Shows order summary, address, total, Pay button (disabled when no address).

---

## Component 11 — cart_summary.schema.json (REPLACED)

**File**: `web/widget-schemas/cart_summary.schema.json`
**Replaces**: loose stub. Full strict schema with `additionalProperties: false` + integer pricing.

---

## Component 12 — payment_widget.schema.json (REPLACED)

**File**: `web/widget-schemas/payment_widget.schema.json`
**Replaces**: loose stub. Full strict schema with optional address object.

---

## Component 13 — CartModule

**File**: `api/src/orchestrator/agents/cart/cart.module.ts`
**Imports**: PrismaModule, AuditModule (global)
**Providers**: CartService, CheckoutService, CartAgent, CheckoutAgent
**Exports**: CartService, CheckoutService
**Wiring**: imported by `OrchestratorModule`

---

## Agent Registry Changes

`agent-registry.ts` (MODIFIED): add `CartAgent` and `CheckoutAgent` entries with `role: 'shopper'` guard.

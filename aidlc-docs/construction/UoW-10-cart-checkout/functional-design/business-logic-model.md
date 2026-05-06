# Business Logic Model — UoW-10 (Cart + Checkout)

**5 workflows**
**Generated at**: 2026-05-06T11:10:00Z

---

## Workflow 1 — Cart Upsert (SH-06)

**Trigger**: Any `cart_*` tool call for a user.
**Actor**: CartService.getOrCreateCart(userId)

```
getOrCreateCart(userId)
  │
  ├─ findFirst({ where: { userId, status: 'open' } })
  │
  ├─ [found] → return existing Cart
  │
  └─ [not found] → create({ data: { userId, status: 'open' } }) → return new Cart
```

**Invariant**: Exactly one open cart exists per user after this call (enforced by partial unique index on conflict).

---

## Workflow 2 — cart_add (SH-04, BR-10-04, BR-10-06)

**Trigger**: Shopper taps "Add to cart" on `product_card` widget OR says "add X to cart" in chat.
**Actor**: CartAgent → CartService.addItem(userId, variantId, quantity)

```
addItem(userId, variantId, quantity)
  │
  ├─ getOrCreateCart(userId) → cart
  │
  ├─ findUnique ProductVariant(variantId)
  │   └─ [not found / inactive] → throw cart.variant_not_found
  │
  ├─ stock check: variant.stock >= quantity?
  │   └─ [NO] → throw cart.insufficient_stock (cart unchanged)
  │
  ├─ find existing CartItem({ cartId: cart.id, variantId })
  │   ├─ [found] → newQty = existing.quantity + quantity
  │   │            re-check: variant.stock >= newQty?
  │   │            └─ [NO] → throw cart.insufficient_stock
  │   │            update CartItem.quantity = newQty
  │   └─ [not found] → create CartItem({ cartId, variantId, quantity })
  │
  └─ return getEnrichedCart(cart.id) → cart_summary widget
```

---

## Workflow 3 — cart_clear with confirmation gate (BR-10-09, FR-ORCH-04)

**Trigger**: Shopper says "clear my cart" or "empty cart".
**Actor**: CartAgent (two-turn flow)

```
Turn 1 — CartAgent
  │
  └─ emit confirmation_prompt widget:
     { action: 'cart.clear',
       message: 'Clear your entire cart? This cannot be undone.',
       confirmLabel: 'Yes, clear it',
       cancelLabel: 'Keep cart' }

Shopper clicks "Yes, clear it"
  │
  └─ emit intent: { intent: 'confirmation.confirm', action: 'cart.clear' }

Turn 2 — CartAgent
  │
  └─ call cart_clear tool
       └─ CartService.clearCart(userId)
            ├─ getOrCreateCart(userId) → cart
            ├─ CartItem.deleteMany({ where: { cartId: cart.id } })
            └─ return empty cart_summary widget
```

---

## Workflow 4 — checkout_start (SH-08, BR-10-11, BR-10-12)

**Trigger**: Shopper says "checkout" or clicks "Checkout" button in `cart_summary` widget.
**Actor**: CheckoutAgent

```
checkout_start(userId)
  │
  ├─ getOrCreateCart(userId) → cart
  ├─ [cart.items.length === 0] → throw checkout.empty_cart
  │
  ├─ address_get_default(userId)
  │   ├─ [found] → defaultAddress
  │   └─ [not found] → agent prompts user to provide address (out-of-scope for UoW-10 creation)
  │
  ├─ compute totalCents = sum(item.priceCents × item.quantity), currency from first item
  │
  └─ emit payment_widget:
     { cartId, totalCents, currency, address: { line1, city, countryCode, ... },
       items: [ { title, variantLabel, quantity, lineTotalCents } ] }
```

---

## Workflow 5 — checkout_pay → create order (SH-08, BR-10-13, BR-10-14)

**Trigger**: Shopper clicks "Pay ₹XX" in `payment_widget` → emits `{ intent: 'checkout.pay', cartId }`.
**Actor**: CheckoutAgent

```
checkout_pay(userId, cartId)
  │
  ├─ simulate payment → { success: true } (always, BR-10-13)
  │
  └─ checkout_create_order(userId, cartId)
       │
       └─ $transaction:
            ├─ re-load cart items with variant stock (snapshot)
            ├─ [any item: variant.stock < quantity] → throw checkout.stock_conflict → ROLLBACK
            │   (agent surfaces retry message with conflicting items)
            ├─ Order.create({ userId, status: 'pending',
            │                 totalCents, currency, placedAt: now() })
            ├─ OrderItem.createMany from CartItems
            │   (variantId, quantity, priceCents, currency)
            ├─ ProductVariant.update stock -= quantity  [per item]
            ├─ Cart.update({ status: 'checked_out' })
            └─ COMMIT
                 │
                 └─ emit order_card widget:
                    { orderId, status: 'pending', totalCents, currency, items }
```

**State machine — Cart.status**:
```
open ──[checkout_create_order success]──> checked_out
```

**State machine — Order.status** (existing VALID_ORDER_TRANSITIONS from UoW-08, unmodified):
```
pending → confirmed → shipped → delivered
       └→ cancelled
```

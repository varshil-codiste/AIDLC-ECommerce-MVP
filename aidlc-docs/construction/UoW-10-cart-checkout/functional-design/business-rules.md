# Business Rules — UoW-10 (Cart + Checkout)

**Count**: 16 rules across 4 groups
**Generated at**: 2026-05-06T11:10:00Z

---

## Group A — Cart Lifecycle

**BR-10-01 — One open cart per user**
A user may have at most one cart with `status = 'open'` at any time. Enforced by the partial unique index `carts_user_open_idx`. `CartService.getOrCreateCart(userId)` upserts: returns existing open cart or creates a new one.

**BR-10-02 — Lazy cart creation**
No cart is created at login or on shopper arrival. A cart row is created only on the first `cart_add` call for a user who has no open cart.

**BR-10-03 — Cart persists across sessions (SH-06)**
The cart lives in Postgres (not in session/Redis). A shopper who logs out and back in sees the same cart items because `getOrCreateCart` fetches by `userId` + `status='open'`.

**BR-10-04 — CartItem deduplication**
If `cart_add` is called for a `variantId` already present in the open cart, the service increments the existing `CartItem.quantity` rather than inserting a duplicate row. Final quantity must still pass the stock check.

**BR-10-05 — Quantity floor**
`CartItem.quantity` must be ≥ 1 at all times. Calling `cart_update_qty` with `quantity = 0` is treated as a `cart_remove` (the item row is deleted). Negative quantities are rejected with `cart.invalid_quantity`.

---

## Group B — Stock Validation

**BR-10-06 — Stock check on add (Q6 = A)**
On `cart_add(variantId, quantity)`, `CartService` reads `ProductVariant.stock`. If `stock < quantity`, the call is rejected with error code `cart.insufficient_stock` and the cart is unchanged.

**BR-10-07 — Stock check on qty update**
On `cart_update_qty(itemId, newQty)`, the same stock check applies: `variant.stock >= newQty`. Rejected with `cart.insufficient_stock` if insufficient.

**BR-10-08 — No stock reservation**
Stock is checked but not reserved at add time. The definitive stock deduction happens at checkout (when the Order is created and stock is decremented in `$transaction`). This is an optimistic add-then-validate pattern acceptable for MVP scale.

---

## Group C — Cart Clearing

**BR-10-09 — Confirmation gate on cart_clear (Q5 = A, FR-ORCH-04)**
`CartAgent` must not call `cart_clear` directly. Instead, the agent first renders a `confirmation_prompt` widget (`{ action: 'cart.clear', message: 'Clear your entire cart? This cannot be undone.' }`). Only when the shopper emits `{ intent: 'confirmation.confirm', action: 'cart.clear' }` does the agent call `cart_clear`.

**BR-10-10 — Clear deletes all items, not the cart row**
`cart_clear` issues `CartItem.deleteMany({ where: { cartId } })`. The `Cart` row itself remains with `status='open'` so the user still has an open cart (just empty). This avoids a race condition where a simultaneous `cart_add` would try to create a duplicate open cart.

---

## Group D — Checkout Flow

**BR-10-11 — Non-empty cart required**
`checkout_start` is rejected with `checkout.empty_cart` if the open cart has 0 items.

**BR-10-12 — Address lookup at checkout start**
`CheckoutAgent` calls `address_get_default` which returns the most-recent saved `type='shipping'` address for `actorId`. If no address exists, the agent asks the shopper to provide one via conversational text (address creation is out of scope for UoW-10; agent surfaces a follow-up prompt).

**BR-10-13 — Payment simulation always succeeds (Q4 = A)**
`checkout_pay` is a simulated call that always returns `{ success: true }`. There is no real payment gateway integration in UoW-10. The simulated result immediately triggers `checkout_create_order`.

**BR-10-14 — Order creation is transactional**
`checkout_create_order` runs inside a Prisma `$transaction`:
1. Re-validate stock for every CartItem (snapshot check)
2. Create `Order` (status='pending', totalCents from cart, currency from cart)
3. Create `OrderItem` rows from CartItems (variantId, quantity, priceCents, currency)
4. Decrement `ProductVariant.stock` by quantity for each item
5. Set `Cart.status = 'checked_out'`
6. COMMIT — if any step fails, the entire tx rolls back

**BR-10-15 — Payment failure retry (SH-08 retry path)**
In the simulated flow, payment never fails (BR-10-13). However, the `payment_widget` includes a "Try again" button that re-emits `checkout.pay`, and the `CheckoutAgent` prompt instructs it to NOT silently roll back the cart on failure — the cart remains intact for retry.

**BR-10-16 — lineTotalCents and totalCents computation**
These are computed values, never stored on Cart or CartItem:
- `lineTotalCents = CartItem.quantity × ProductVariant.priceCents`
- `totalCents = sum(lineTotalCents)` across all items
- `currency` is taken from the first item's variant currency (MVP: single-currency cart)

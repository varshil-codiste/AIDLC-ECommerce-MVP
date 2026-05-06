# NFR Design Patterns — UoW-10 (Cart + Checkout)

**Stage**: 10 — NFR Design
**Generated at**: 2026-05-06T11:20:00Z

---

## Pattern 1 — One-Open-Cart Upsert via Partial Unique Index

**Addresses**: NFR-10-SCAL-02, BR-10-01, BR-10-02

`CartService.getOrCreateCart(userId)` uses Prisma's `upsert` via `create` + catch on unique-constraint violation, OR a single `findFirst` followed by conditional `create`. The pre-existing partial unique index `carts_user_open_idx (user_id) WHERE status='open'` guarantees at most one open cart row per user at DB level.

```
findFirst({ where: { userId, status: 'open' } })
  → found  : return existing cart
  → not found : create({ data: { userId, status: 'open' } })
                (unique index prevents duplicate on concurrent insert)
```

Concurrent race: if two requests simultaneously create for the same user, the second insert hits the unique constraint and throws `P2002`; catch and retry the `findFirst` branch.

---

## Pattern 2 — CartItem Deduplication via Upsert-then-Update

**Addresses**: BR-10-04, NFR-10-RELI-01

On `cart_add(variantId, qty)`, the service checks for an existing `CartItem` with `{ cartId, variantId }`. If found, increment quantity; if not, insert. Both paths run the stock check against the **final** quantity:

```
existingItem = findFirst({ where: { cartId, variantId } })
if (existingItem):
    finalQty = existingItem.quantity + requestedQty
    if variant.stock < finalQty → throw cart.insufficient_stock
    update CartItem.quantity = finalQty
else:
    if variant.stock < requestedQty → throw cart.insufficient_stock
    create CartItem({ cartId, variantId, quantity: requestedQty })
```

---

## Pattern 3 — Stock Check (Optimistic at Add, Definitive at Checkout)

**Addresses**: NFR-10-SEC-03, NFR-10-SEC-04, BR-10-06, BR-10-08

Two-phase stock validation:
- **Phase 1 — Optimistic check at add time**: reads `variant.stock` and rejects if insufficient. Not atomic; may allow over-add if stock is sold concurrently. Acceptable for MVP scale.
- **Phase 2 — Definitive check inside `$transaction` at checkout**: re-reads stock with `SELECT FOR UPDATE` semantics (Prisma `$transaction` serializes). Rejects with `checkout.stock_conflict` if stock changed. Cart remains intact; shopper can adjust and retry.

```
$transaction:
  variants = findMany({ where: { id: { in: variantIds } } })
  for each cartItem:
    if variants[variantId].stock < cartItem.quantity → throw checkout.stock_conflict
  // proceed with order creation
```

---

## Pattern 4 — Checkout Atomic Transaction (Create-Order Pattern)

**Addresses**: NFR-10-PERF-03, NFR-10-RELI-02, NFR-10-RELI-03, BR-10-14, NFR-10-SEC-04

All five checkout steps run inside a single Prisma `$transaction` to guarantee atomicity:

```
$transaction([
  Order.create({ userId, status:'pending', totalCents, currency, placedAt }),
  OrderItem.createMany([{ orderId, variantId, qty, priceCents, currency }, ...]),
  ...variantIds.map(id => ProductVariant.update({ where:{ id }, data:{ stock: { decrement: qty } } })),
  Cart.update({ where:{ id: cartId }, data:{ status:'checked_out' } }),
])
```

On any failure: full rollback — cart stays `open`, stock unchanged, no order row created. CartAgent prompt explicitly instructs: "Do not retry automatically — surface the error to the shopper."

---

## Pattern 5 — Enriched Cart Query (Single Join)

**Addresses**: NFR-10-PERF-01, NFR-10-MAINT-01

`CartService.getEnrichedCart(cartId)` fetches the cart with a single Prisma `include` query:

```
Cart.findUnique({
  where: { id: cartId },
  include: {
    items: {
      include: {
        variant: {
          include: { product: { select: { title: true, imageUrl: true } } }
        }
      }
    }
  }
})
```

`lineTotalCents` and `variantLabel` are computed in-process (no extra queries). `totalCents = sum(lineTotalCents)`. This keeps the DB round-trips to one.

---

## Pattern 6 — Anti-Enumeration Ownership Guard

**Addresses**: NFR-10-SEC-01, BR-10 (all service methods)

Every CartService method that takes a `userId` (actorId) and a `cartId` or `itemId` resolves via:

```
findFirst({ where: { id: cartId, userId: actorId } })
→ null: return null (uniform — whether cart doesn't exist or belongs to another user)
```

Agent dispatch maps null to a `ProblemDetails` response with `cart.not_found` — no enumeration of whether the cart exists.

---

## Pattern 7 — Confirmation Gate (Destructive Intent Guard)

**Addresses**: NFR-10-SEC-02, NFR-10-AIML-03, BR-10-09, FR-ORCH-04

`cart_clear` is gated by a two-turn confirmation protocol enforced at the **agent prompt layer** — CartAgent prompt text mandates that `cart_clear` tool is only called after receiving `{ intent: 'confirmation.confirm', action: 'cart.clear' }`. An adversarial eval case verifies the agent doesn't skip this gate on direct "clear my cart" instruction.

The `ConfirmationPrompt` widget (already functional from UoW-08) handles the FE side. No changes to ConfirmationPrompt.tsx needed.

---

## Pattern 8 — computeTotal Pure Function (PBT target)

**Addresses**: NFR-10-PBT-03, NFR-10-MAINT-01

`CartService.computeTotal(items: LineItem[]): { totalCents: number; currency: string }` is extracted as a static/exported pure function:

```typescript
export function computeTotal(items: LineItem[]): { totalCents: number; currency: string } {
  const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const currency = items[0]?.currency ?? 'INR';
  return { totalCents, currency };
}
```

Testable without DB. PBT: for any array of items with non-negative `priceCents` and positive `quantity`, `totalCents = sum(priceCents × quantity)` and empty array → 0.

---

## Pattern 9 — Simulated Payment (No-Op Service)

**Addresses**: NFR-10-AIML-05, NFR-10-SEC-05, BR-10-13

`CheckoutService.simulatePayment()` is a pure synchronous no-op that returns `{ success: true }`. No network call, no external dependency, no PCI-scope data. Keeps the checkout flow deterministic in tests and demo.

```typescript
simulatePayment(): { success: true } {
  return { success: true };
}
```

Future: this method is the swap point for a real payment provider (Razorpay/Stripe). Encapsulating it here means only this one method needs to change.

# NFR Requirements — UoW-10 (Cart + Checkout Agents)

**Stage**: 9 — NFR Requirements
**UoW**: UoW-10-cart-checkout
**Tier**: Greenfield (Comprehensive)
**Generated at**: 2026-05-06T11:15:00Z
**Extensions active**: Security Baseline (15 rules), AI/ML Lifecycle, Property-Based Testing (partial), Accessibility (Level A)

---

## Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-10-PERF-01 | `cart_summary` widget render latency (cart_get tool → widget emitted) | < 200 ms p95 | enriched cart query with variant join, ≤ 10 items at MVP scale |
| NFR-10-PERF-02 | `cart_add` end-to-end (stock check + upsert + enriched cart return) | < 300 ms p95 | 2 DB reads + 1 upsert |
| NFR-10-PERF-03 | `checkout_create_order` transaction duration | < 500 ms p95 | $transaction: re-validate stock + create order + create items + update stock + close cart |
| NFR-10-PERF-04 | `payment_widget` render (address lookup + subtotal compute) | < 200 ms p95 | address query + in-memory sum |

---

## Scalability

| ID | Requirement |
|----|-------------|
| NFR-10-SCAL-01 | Cart enrichment query performs acceptably up to 50 line items (MVP cap) without pagination. |
| NFR-10-SCAL-02 | The partial unique index `carts_user_open_idx (user_id) WHERE status='open'` must remain in place; no full-table scan on cart upsert. |
| NFR-10-SCAL-03 | Checkout `$transaction` acquires row-level locks only on the affected cart and variant rows; does not escalate to table lock. |

---

## Security

| ID | Requirement |
|----|-------------|
| NFR-10-SEC-01 | All cart and checkout operations must verify `actorId = cart.userId` — no cross-user cart access. Anti-enumeration: returning null vs 404 uniformly for missing-or-other-user cart. |
| NFR-10-SEC-02 | `cart_clear` requires explicit confirmation intent — agent must not call `CartService.clearCart` without first receiving `{ intent: 'confirmation.confirm', action: 'cart.clear' }` in the same conversation turn. |
| NFR-10-SEC-03 | Stock check inputs (`quantity`) are typed integers at the tool schema level; negative quantities rejected by JSON schema before reaching service. |
| NFR-10-SEC-04 | `checkout_create_order` re-validates stock inside the transaction — prevents TOCTOU race where stock was available at `cart_add` time but sold out before checkout. |
| NFR-10-SEC-05 | Simulated payment call does not invoke any external payment gateway or network call; no PCI-scope data handled. |
| NFR-10-SEC-06 | Address data (line1, city, etc.) is personal data — not logged in structured event payloads; only `addressId` or `userId` in logs. |

---

## Reliability

| ID | Requirement |
|----|-------------|
| NFR-10-RELI-01 | `cart_add` with duplicate variantId is idempotent in effect — calling it twice adds quantity twice (cumulative), not two rows. Behaviour is deterministic. |
| NFR-10-RELI-02 | `checkout_create_order` is **not** idempotent by default (creates a new order each call). CartAgent must not retry it automatically — agent prompt must surface any checkout failure to the shopper for explicit retry. |
| NFR-10-RELI-03 | If `checkout_create_order` fails mid-transaction (e.g., stock conflict), the rollback leaves the cart intact and open. The shopper can retry or adjust cart before re-attempting checkout. |
| NFR-10-RELI-04 | Cart persistence across sessions is guaranteed by DB storage — no in-memory or session-level state used. |

---

## Observability

| ID | Requirement |
|----|-------------|
| NFR-10-OBS-01 | Structured log events for all cart mutations: `cart.item_added`, `cart.item_updated`, `cart.item_removed`, `cart.cleared`, `cart.checkout_started`, `cart.order_created`. Each includes `{ userId, cartId, ... }`. |
| NFR-10-OBS-02 | Checkout transaction duration emitted as structured log field `durationMs` on `cart.order_created` event. |
| NFR-10-OBS-03 | Stock conflict at checkout emitted as `cart.stock_conflict` log warning with `{ variantId, requested, available }`. |

---

## Maintainability

| ID | Requirement |
|----|-------------|
| NFR-10-MAINT-01 | Unit test line coverage ≥ 75% for `CartService` and `CheckoutService`. |
| NFR-10-MAINT-02 | `CartService` must have ≥ 6 unit tests covering: getOrCreateCart, addItem-dedup, addItem-stock-fail, updateQty-to-zero=remove, clearCart, enrichedCart computation. |
| NFR-10-MAINT-03 | `CheckoutService` must have ≥ 4 unit tests: checkout-start-empty-cart, checkout-start-no-address, create-order-success, create-order-stock-conflict-rollback. |
| NFR-10-MAINT-04 | `CartAgent` must have ≥ 4 unit tests; `CheckoutAgent` must have ≥ 4 unit tests. |
| NFR-10-MAINT-05 | No magic numbers — `MAX_CART_ITEMS = 50`, any limit values as named constants. |

---

## Usability

| ID | Requirement |
|----|-------------|
| NFR-10-USAB-01 | `cart_summary` widget must render within 1.5 s of the "Add to cart" intent being sent (SH-04 acceptance criteria). |
| NFR-10-USAB-02 | Qty stepper "−" button must be `disabled` when `quantity = 1` (to prevent accidental removal; user must tap "Remove" or set qty via text). Actually, per BR-10-05, decrement at qty=1 → remove; button should remain enabled but show "Remove" semantics. aria-label must reflect "Remove item" at qty=1 and "Decrease quantity" otherwise. |
| NFR-10-USAB-03 | Empty cart state must be communicated with `role="status"` for screen readers (Accessibility Level A). |
| NFR-10-USAB-04 | Pay button in PaymentWidget must be `disabled` when `address === null` and include `aria-disabled="true"` with visible "Add a shipping address first" tooltip/text. |

---

## AI/ML Quality

| ID | Requirement |
|----|-------------|
| NFR-10-AIML-01 | `CartAgent` prompt versioned at `cart-agent.v1.0.0`; `CheckoutAgent` at `checkout-agent.v1.0.0`. Loaded via `PromptLoaderService`. |
| NFR-10-AIML-02 | Each agent must have an eval suite with ≥ 2 golden cases + ≥ 2 adversarial cases. |
| NFR-10-AIML-03 | `CartAgent` must not call `cart_clear` without first receiving explicit confirmation intent — enforced by prompt instruction + adversarial eval case. |
| NFR-10-AIML-04 | `CheckoutAgent` must not invent address data if `address_get_default` returns null — agent must surface the missing-address state to the shopper conversationally. |
| NFR-10-AIML-05 | `CheckoutAgent` must not retry `checkout_create_order` automatically on failure — must surface error to shopper with clear retry instruction. |

---

## Property-Based Testing (PBT extension — partial)

| ID | Scope | Invariants |
|----|-------|-----------|
| NFR-10-PBT-01 | `cart_summary` JSON schema round-trip | Valid payloads always validate; missing required fields always fail; negative priceCents/totalCents fail |
| NFR-10-PBT-02 | `payment_widget` JSON schema round-trip | Valid payloads with/without address validate; missing cartId fails; extra root props fail |
| NFR-10-PBT-03 | `CartService.computeTotal(items)` pure function | `totalCents = sum(item.priceCents × item.quantity)` for arbitrary item arrays; empty array → 0 |

**Total NFRs**: 34 across 9 categories

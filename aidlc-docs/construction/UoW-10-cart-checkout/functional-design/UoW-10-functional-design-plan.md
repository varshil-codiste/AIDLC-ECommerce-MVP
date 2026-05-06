# Functional Design Plan — UoW-10 (Cart + Checkout Agents)

**Stage**: 8 — Functional Design
**Tier**: Greenfield (Comprehensive)
**Generated at**: 2026-05-06T11:10:00Z
**Stories in scope**: SH-04, SH-05, SH-06, SH-08
**Design decisions recorded in**: `UoW-10-functional-design-questions.md` (all A)

---

## Scope Summary

| Area | What's new | What's brownfield |
|------|-----------|-------------------|
| DB models | None (Cart + CartItem + Address already in schema.prisma) | Cart, CartItem, Address, ProductVariant, Order |
| Migrations | None | — |
| BE services | CartService (new), CheckoutService (new) | OrderService (reused to create Order at checkout) |
| BE agents | CartAgent (new), CheckoutAgent (new) | — |
| BE tools | cart.tools.ts (new), checkout.tools.ts (new) | — |
| BE prompts | cart-agent.v1.0.0.txt (new), checkout-agent.v1.0.0.txt (new) | — |
| FE widgets | CartSummary.tsx (replace stub), PaymentWidget.tsx (replace stub) | ConfirmationPrompt.tsx (already functional from prior UoW) |
| FE schemas | cart_summary.schema.json (replace stub), payment_widget.schema.json (replace stub) | — |

---

## Artifacts

- `domain-entities.md` — Cart, CartItem, enriched LineItem (view model), Address (reference)
- `business-rules.md` — 16 BRs covering cart lifecycle, stock validation, checkout flow, confirmation gate
- `business-logic-model.md` — 5 workflows: cart-upsert, cart-add, cart-clear, checkout-start, checkout-pay
- `frontend-components.md` — CartSummary + PaymentWidget component trees + intent contracts

---

## Key Design Decisions (from questions)

| # | Decision |
|---|----------|
| Q1 | `totalCents: integer` + `currency: string` — aligns with product pricing; no float math |
| Q2 | Two agents: `CartAgent` + `CheckoutAgent` — clean separation of concerns |
| Q3 | Shipping address from `addresses` table via `address_get_default` tool |
| Q4 | Single-step simulated payment — always succeeds; no artificial latency |
| Q5 | `cart_clear` wires `confirmation_prompt` per FR-ORCH-04 |
| Q6 | Stock check at `cart_add` time — reject if `variant.stock < requestedQuantity` |
| Q7 | Full line-item shape: `{ itemId, variantId, title, variantLabel, priceCents, currency, quantity, lineTotalCents, imageUrl? }` |
| Q8 | Qty stepper emits `cart.update_quantity` intent directly (no chat text needed) |

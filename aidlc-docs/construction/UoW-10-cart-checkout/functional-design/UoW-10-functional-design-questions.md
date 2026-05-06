# Functional Design Questions — UoW-10 (Cart + Checkout Agents)

**Stage**: 8 — Functional Design (Part 1)
**Generated at**: 2026-05-06T11:05:00Z
**Stories in scope**: SH-04, SH-05, SH-06, SH-08

---

## Q1 — Currency / pricing unit in cart_summary widget

The product schema stores prices as `priceCents: Int` + `currency: String` (e.g., INR). The existing `cart_summary.schema.json` stub uses `totalUsd: number`. Which unit should the real widget use?

- **A)** Align with product schema — `totalCents: integer` + `currency: string` (consistent, no float math) ✅ recommended
- **B)** Keep `totalUsd: number` float (matches stub; requires cents → USD conversion)
- **C)** Support both — `totalCents` + `currency` + optional `displayTotal: string`
- **D)** Other

[Answer]:A

---

## Q2 — Cart + Checkout: one agent or two?

Application design lists separate `CartAgent` and `CheckoutAgent` directories. Should they be:

- **A)** Two separate agents (each with its own prompt, tools, eval suite) — clean separation; checkout flow is distinct enough to warrant isolation ✅ recommended
- **B)** One combined `CartAgent` that handles both cart management and checkout (simpler, fewer files)
- **C)** Other

[Answer]:A

---

## Q3 — Shipping address at checkout

The `Address` model already exists in the Prisma schema. How should checkout collect a shipping address?

- **A)** Use existing saved address from `addresses` table — CheckoutAgent calls `address_get_default`, shows it, asks shopper to confirm or change ✅ recommended
- **B)** Collect address inline via structured form intent (no DB lookup; address stored on order as JSON blob)
- **C)** Skip address entirely for the simulated MVP — just show "shipping TBD" placeholder
- **D)** Other

[Answer]:A

---

## Q4 — Simulated payment flow

SH-08 says "simulated payment" for internal demo. How should the simulation work?

- **A)** Single-step simulation — `payment_widget` rendered with "Pay" button; on intent `checkout.pay`, the agent always returns success and calls `checkout_create_order` → `order_card` rendered. No real latency. ✅ recommended for demo speed
- **B)** Two-step with artificial 1s delay — renders "Processing..." state then success (more realistic demo feel)
- **C)** Random success/failure (80% success) to demo the retry path from SH-08
- **D)** Other

[Answer]:A

---

## Q5 — cart.clear confirmation middleware

`FR-ORCH-04` requires a `confirmation_prompt` before destructive intents including `cart-clear`. The `ConfirmationPrompt` widget stub already exists. Should UoW-10 wire up the confirmation flow?

- **A)** Yes — `cart_clear` tool triggers `confirmation_prompt` widget first; shopper must confirm before cart is wiped ✅ recommended (matches FR-ORCH-04)
- **B)** No — skip for MVP; just clear directly with a text warning from the agent
- **C)** Other

[Answer]:A

---

## Q6 — Quantity validation on cart_add

When a shopper adds a variant to the cart, should we validate against current stock?

- **A)** Yes — check `ProductVariant.stock` at add time; reject if stock < requested quantity; return `cart.insufficient_stock` error ✅ recommended
- **B)** No — skip stock check at add time (stock checked at checkout only)
- **C)** Other

[Answer]:A

---

## Q7 — cart_summary widget line items shape

Each cart item in the widget needs to display enough info to render. What fields should each line item include?

- **A)** `{ itemId, variantId, title, variantLabel, priceCents, currency, quantity, lineTotalCents, imageUrl? }` — full display info ✅ recommended
- **B)** `{ itemId, variantId, quantity, priceCents, currency }` — minimal (FE fetches product title separately)
- **C)** Other

[Answer]:A

---

## Q8 — Qty steppers intent for SH-05

SH-05 says "adjust quantities inline". The `cart.update_quantity` intent is defined in agent-contracts.md. Should the widget emit intents directly on stepper click, or go through the chat input?

- **A)** Widget emits structured intent `{ intent: 'cart.update_quantity', itemId, quantity }` directly on stepper click (no chat message required) ✅ recommended — matches FR-CHAT-05
- **B)** Stepper click populates chat input with text like "update item X to qty 2" (conversational)
- **C)** Other

[Answer]:A

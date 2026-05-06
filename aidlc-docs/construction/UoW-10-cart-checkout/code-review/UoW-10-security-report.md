# Security Report — UoW-10 (Cart + Checkout Agents)

**Stage**: 13 — Code Review
**Generated at**: 2026-05-06T12:10:00Z
**Scope**: cart.service.ts, checkout.service.ts, cart.agent.ts, checkout.agent.ts, cart.tools.ts, checkout.tools.ts, CartSummary.tsx, PaymentWidget.tsx

---

## SEC-01 — Raw SQL Injection

**Check**: grep for `$queryRaw`, `$executeRaw`, `Prisma.raw` in cart + checkout source

**Result**: ✅ NONE FOUND — All queries use Prisma ORM typed methods exclusively.

---

## SEC-02 — IDOR / Ownership Guard

**Check**: All CartItem mutations include `userId` in the where clause to prevent cross-user access

**Findings**:
- `updateQty`: `findFirst({ where: { id: itemId, cart: { userId, status: 'open' } } })` ✅
- `removeItem`: `findFirst({ where: { id: itemId, cart: { userId, status: 'open' } } })` ✅
- `clearCart`: `findFirst({ where: { userId, status: 'open' } })` ✅
- `createOrder`: `findFirst({ where: { id: cartId, userId, status: 'open' } })` ✅

**Result**: ✅ All mutations scoped to authenticated userId. Anti-enumeration pattern consistent with NFR-10-SEC-03.

---

## SEC-03 — Role Guard (Shopper-Only Access)

**Check**: CartAgent and CheckoutAgent must reject merchant requests

**Findings**:
- CartAgent: guards at entry with `if (input.user.role !== 'shopper')` → 403 ProblemDetails, no LLM call ✅
- CheckoutAgent: same guard pattern ✅

**Result**: ✅ Both agents enforce shopper-only access. Merchants never reach tool dispatch.

---

## SEC-04 — Confirmation Gate (FR-ORCH-04)

**Check**: cart_clear cannot be called without `confirmation.confirm + action: 'cart.clear'` intent

**Findings**: CartAgent checks:
```typescript
const confirmed =
  input.intent?.intent === 'confirmation.confirm' &&
  (input.intent as Record<string, unknown>)['action'] === 'cart.clear';
if (!confirmed) { yield confirmation_prompt; return; }
```
Prompt also instructs LLM: "NEVER call cart_clear directly".

**Result**: ✅ Double-gated (agent code + prompt instruction). Adversarial eval A-10-01 covers this case.

---

## SEC-05 — TOCTOU Stock Validation (NFR-10-SEC-04)

**Check**: `createOrder` re-validates stock inside `$transaction` regardless of prior `cart_add` check

**Findings**: In `checkout.service.ts`, within the `$transaction`:
```typescript
for (const item of cart.items) {
  if (item.quantity > variant.stock) {
    stockConflicts.push(variant.product.title);
  }
}
if (stockConflicts.length > 0) throw new Error(`checkout.stock_conflict:...`);
```
Re-validation occurs before `order.create` — any stock race between cart_add and checkout_pay is caught here.

**Result**: ✅ TOCTOU handled correctly.

---

## SEC-06 — XSS (Frontend)

**Check**: grep for `dangerouslySetInnerHTML`, `innerHTML`, `__html` in CartSummary.tsx, PaymentWidget.tsx

**Result**: ✅ NONE — All dynamic content is rendered via React JSX text nodes (properly escaped). No unsafe HTML injection.

---

## SEC-07 — Prompt Injection Surface

**Check**: User-controlled content entering the LLM context

**Findings**: `input.message` (user chat text) enters LLM as `userMessage`. Tool results from CartService/CheckoutService (DB-backed) re-enter context as `Tool result for ${toolCall.name}: ${JSON.stringify(toolResult.data)}`.

Cart/checkout data (product titles, addresses) from DB could theoretically contain adversarial text. However this is the same pattern as all prior agents (UoW-06 through UoW-11) — consistent with accepted risk.

**Result**: ⚠️ C-10-01 — same accepted risk profile as prior agents. Not a new vulnerability.

---

## SEC-08 — No Auto-Retry on Payment Failure

**Check**: CheckoutAgent must not auto-retry `checkout_pay` on failure

**Findings**: On error in `dispatchTool`, the method returns `{ type: 'error', problem: {...} }`. The agent immediately yields the error and returns — the while loop exits. No retry logic present.

Prompt reinforces: "Do NOT automatically call checkout_pay again."

**Result**: ✅ No auto-retry. NFR-10-SEC-05 satisfied.

---

## SEC-09 — Payment Data Safety

**Check**: Simulated payment stores no PCI-sensitive data

**Findings**: `simulatePayment()` returns `{ success: true }` synchronously. `createOrder` stores `paymentRef: \`sim_${Date.now()}\`` — a placeholder, not a real card token or PAN.

**Result**: ✅ No PCI-sensitive data stored.

---

## Security Summary

| ID | Rule | Result |
|----|------|--------|
| SEC-01 | No raw SQL | ✅ PASS |
| SEC-02 | IDOR ownership guards | ✅ PASS |
| SEC-03 | Shopper-only role gate | ✅ PASS |
| SEC-04 | cart_clear confirmation gate | ✅ PASS |
| SEC-05 | TOCTOU stock re-validation | ✅ PASS |
| SEC-06 | No XSS in FE | ✅ PASS |
| SEC-07 | Prompt injection surface | ⚠️ C-10-01 (accepted, same as prior UoWs) |
| SEC-08 | No auto-retry on payment failure | ✅ PASS |
| SEC-09 | No PCI data | ✅ PASS |

**Security verdict**: ✅ PASS — 1 accepted concern (C-10-01), no blockers

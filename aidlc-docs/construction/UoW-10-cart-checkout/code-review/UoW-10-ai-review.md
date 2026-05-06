# AI Review — UoW-10 (Cart + Checkout Agents)

**Stage**: 13 — Code Review (AI Verdict)
**Generated at**: 2026-05-06T12:10:00Z
**Reviewer**: AI-DLC automated analysis

---

## Review Scope

All 28 UoW-10 files reviewed: services, agents, tools, prompts, module, registry wiring, schemas, FE components, test/eval suites.

---

## Concerns

### C-10-01 — Prompt Injection Surface (Accepted Risk)

**File**: `cart.agent.ts`, `checkout.agent.ts`
**Severity**: Low
**Description**: Product titles and address data from the database re-enter the LLM context as tool result strings (e.g., `"Tool result for cart_get: {\"items\":[{\"title\":\"...\"}]}"` ). A merchant who has stored adversarial text in a product title could embed prompt-injection payloads visible to shopper carts.
**Mitigation present**: System prompt is loaded from the locked PROMPT_VERSIONS map (not user-controlled). Shopper role guard prevents merchants from using cart tools. The attack surface requires a merchant account to plant payload, then a shopper to add the specific item. This is consistent with the accepted risk posture of all prior agents (noted in UoW-11 C-02 analogy). Prompt-output sandboxing is a UoW-12 scope item.
**Verdict**: ACCEPTED — same risk profile as all prior agents; no new exposure.

### C-10-02 — args Cast Without Runtime Validation

**File**: `cart.agent.ts:157-175`, `checkout.agent.ts:154`
**Severity**: Low
**Description**: `args['variantId'] as string`, `args['itemId'] as string` etc. are TypeScript casts without runtime schema validation. If the LLM produces a malformed tool call (e.g., `variantId: 123` as number), the cast silently passes a non-string to Prisma.
**Mitigation present**: Prisma UUID columns will reject non-UUID strings at DB level (returning null on findUnique). CartService returns `cart.variant_not_found` or `cart.item_not_found` errors which bubble as 400 ProblemDetails — no crash. Pattern is consistent with all prior agents. Runtime zod validation of tool args is out-of-scope for this UoW.
**Verdict**: ACCEPTED — consistent with established pattern; Prisma provides implicit boundary.

---

## Positive Findings

1. **Two-phase stock validation** — optimistic at `cart_add`, definitive in `$transaction` at `createOrder`. No half-created orders possible.
2. **P2002 retry in getOrCreateCart** — concurrent cart creation race condition handled correctly.
3. **computeTotal is pure and exportable** — correctly extracted as `static` so PBT can test it without constructing the full service.
4. **Confirmation gate is double-gated** — implemented in both agent code AND prompt instruction; adversarial eval covers it.
5. **No auto-retry on checkout failure** — agent returns error and terminates; loop does not repeat `checkout_pay`.
6. **Anti-enumeration** — `findFirst({ id, cart: { userId } })` returns null uniformly for wrong-user or missing items; no information leakage.
7. **`<Image>` over `<img>`** — lint warning caught and fixed during review; LCP optimization preserved.
8. **WidgetIntent index signature** — added correctly to FE types rather than using `as any` or casting.

---

## AI Verdict

**PROCEED with caveats**

Both concerns (C-10-01, C-10-02) are accepted risks consistent with the established codebase posture. No new security vulnerabilities introduced. All NFR thresholds met. 490/490 tests passing.

**Condition for PROCEED**: Pod acknowledges C-10-01 and C-10-02 in sign-off.

# Business Rules — UoW-11 (Semantic Search + Tracking + Returns)

**Generated at**: 2026-05-05T21:36:00Z

---

## Search & Discovery

### BR-11-01 — Semantic search returns up to 8 products
**Applies to**: `ProductService.searchSemantic` and the `product_search` agent tool
**Statement**: A semantic search call returns at most 8 products, ordered by cosine similarity DESC.
**Enforcement**:
- Service: `LIMIT 8` in kNN query
- Schema: `product_carousel.items maxItems: 8`
**Error code**: n/a (cap silently)
**User-facing copy**: n/a

### BR-11-02 — Inactive products excluded from search
**Applies to**: All search paths
**Statement**: Products with `status != 'active'` are never returned in search results.
**Enforcement**: `WHERE p.status = 'active'` in both semantic and keyword queries
**Error code**: n/a
**User-facing copy**: n/a

### BR-11-03 — Vector failure falls back to keyword
**Applies to**: `ProductService.search`
**Statement**: When semantic search fails (vector store unreachable, embedding API error, kNN query exception), the service falls back to keyword search and tags the result with `usedFallback: true`.
**Enforcement**:
- Service: `try { semantic } catch { keyword + usedFallback=true }`
- Agent: when `usedFallback === true`, prepend "I couldn't do semantic search; here are keyword matches:" to the LLM-rendered text per SH-02 acceptance
**Error code**: `search.semantic.unavailable` (logged, not user-facing)
**User-facing copy**: "I couldn't do semantic search; here are keyword matches:"

### BR-11-04 — Ambiguous query triggers ONE clarifying question
**Applies to**: ProductAgent shopper-mode `product_search` tool
**Statement**: If the user's message has fewer than 3 alphanumeric tokens AND no concrete noun (the agent decides via prompt), the agent asks ONE clarifying question instead of running search.
**Enforcement**: Agent prompt instruction; clarifying questions are emitted as plain text (no widget)
**Error code**: n/a
**User-facing copy**: agent-generated, e.g. "Could you tell me a bit more — what kind of thing, and any preferences (size, budget, style)?"

### BR-11-05 — Compare caps at 3 products
**Applies to**: `product_compare` tool
**Statement**: When asked to compare more than 3 products, agent caps at 3 and explains why.
**Enforcement**:
- Tool: validates `productIds.length <= 3` in arguments
- Schema: `product_comparison.products maxItems: 3`
**Error code**: `product_compare.too_many` (returned to LLM; agent surfaces to user)
**User-facing copy**: "I can only compare up to 3 products at a time — comparing the first three you mentioned."

### BR-11-06 — Search results hide internal scores
**Applies to**: `product_carousel` widget data
**Statement**: Cosine similarity scores are NOT included in widget payload (internal-only metric).
**Enforcement**: Service trims score before returning agent payload
**Error code**: n/a
**User-facing copy**: n/a

---

## Embedding Lifecycle

### BR-11-07 — Embeddings refresh asynchronously after Product write
**Applies to**: ProductService.create / update
**Statement**: When a Product is created or updated, an outbox event (`product.created` / `product.updated`) is emitted in the same transaction. The embedding refresh runs in a background worker.
**Enforcement**: ProductService writes both Product row and AgentEvent row inside `prisma.$transaction`
**Error code**: n/a
**User-facing copy**: n/a (merchant-facing API returns immediately without waiting for embedding)

### BR-11-08 — Embedding source text is deterministic
**Applies to**: `EmbeddingRefreshWorker.buildTextBlob(product)`
**Statement**: The text used for embedding is `${title}\n${description ?? ''}\n${category?.name ?? ''}\n${variants.map(v => v.attributes).join(' ')}` — same input always produces the same blob.
**Enforcement**: Pure function with PBT in NFR
**Error code**: n/a

### BR-11-09 — Embedding refresh tolerates failures
**Applies to**: `EmbeddingRefreshWorker.process(event)`
**Statement**: If OpenAI embedding call fails, the worker logs `embedding.refresh.failed` and DOES NOT advance the AgentEvent cursor — the event is retried by the next worker cycle. After 3 failures the event is marked `dead_letter`.
**Enforcement**: Reuse existing OutboxDrainWorker retry semantics from UoW-03
**Error code**: `embedding.refresh.failed`
**User-facing copy**: n/a (worker is server-internal)

---

## Order Tracking (SH-09)

### BR-11-10 — Tracking returns shopper-owned orders only
**Applies to**: `OrderAgent.order_get_tracking`
**Statement**: A shopper can fetch tracking only for orders where `Order.userId === actor.id`. Asking about another user's order returns "I don't see that order under your account" with no info-leak per NFR-AIML-05.
**Enforcement**:
- Service: `prisma.order.findFirst({ where: { id, userId: actorId } })`
- Returns `null` if not found OR not owned — same response in both cases (anti-enumeration)
**Error code**: `order.not_found` (single error type covers both genuine 404 and ownership mismatch)
**User-facing copy**: "I don't see that order under your account."

### BR-11-11 — Tracking without orderId returns most-recent order
**Applies to**: `OrderAgent.order_get_tracking({ orderId?: undefined })`
**Statement**: If `orderId` is omitted, return tracking for the shopper's most-recent (highest `placedAt`) order.
**Enforcement**: `prisma.order.findFirst({ where: { userId }, orderBy: { placedAt: 'desc' } })`
**Error code**: `order.none_found` if shopper has zero orders
**User-facing copy**: "You don't have any orders yet."

### BR-11-12 — Tracking events synthesized deterministically
**Applies to**: `OrderService.buildTrackingEvents(order)`
**Statement**: The `events[]` array is built from Order timestamps in this order:
1. `Placed` — at `order.placedAt`
2. `Confirmed` — at `order.lastStatusChangeAt` if status passed `confirmed`
3. `Shipped` — at `order.lastStatusChangeAt` if status passed `shipped`; includes `trackingNumber` and `trackingCarrier` if present
4. `Delivered` — at `order.lastStatusChangeAt` if status is `delivered`
5. `Return requested` — at `order.returnRequestedAt` if status is `return_requested`
6. `Refunded` — at `order.lastStatusChangeAt` if status is `refunded`
7. `Cancelled` — at `order.lastStatusChangeAt` if status is `cancelled`

Only events whose preconditions are met appear; pure function, PBT-testable.
**Enforcement**: Pure function `OrderService.buildTrackingEvents`
**Error code**: n/a

---

## Returns (SH-10)

### BR-11-13 — Only delivered orders can be returned
**Applies to**: `OrderAgent.order_start_return`
**Statement**: A return can be initiated only if `Order.status === 'delivered'`. Any other status returns `order_return.invalid_status`.
**Enforcement**:
- Service: validates current status before transition
- Agent: surfaces error to shopper with explanation
**Error code**: `order_return.invalid_status`
**User-facing copy**: "Returns can only be started for delivered orders. This order is currently {status}."

### BR-11-14 — Return reason is required
**Applies to**: `OrderAgent.order_start_return(orderId, reason)`
**Statement**: The `reason` argument must be a non-empty string of at least 5 characters. The agent collects the reason from the shopper before invoking the tool if not present in the initial message.
**Enforcement**:
- Tool: rejects empty/short reasons with `order_return.reason_required`
- Agent prompt: instructs to ask "What's the reason for the return?" if missing
**Error code**: `order_return.reason_required`
**User-facing copy**: agent-generated, e.g. "Could you tell me why you'd like to return it?"

### BR-11-15 — Return requested is reversible by merchant
**Applies to**: Order status transitions
**Statement**: From `return_requested`, a merchant can transition to `refunded` (approve) OR back to `delivered` (reject). Shopper cannot reverse the request — once requested, only the merchant decides.
**Enforcement**: `VALID_ORDER_TRANSITIONS` extended in `order.tools.ts`
**Error code**: `order.invalid_transition` (existing code from UoW-08)
**User-facing copy**: existing UoW-08 message

### BR-11-16 — Return-state Order_card hides destructive actions
**Applies to**: OrderCard widget rendered after `order_start_return`
**Statement**: When `order.status === 'return_requested'`, the cancel and refund action buttons are hidden in the widget — there is no further shopper action to take.
**Enforcement**: ProductAgent populates `cancelAction: null, refundAction: null` in widget data
**Error code**: n/a
**User-facing copy**: n/a (UX concern)

---

## Cross-cutting

### BR-11-17 — Shopper-only tools rejected for merchants and vice versa
**Applies to**: ProductAgent and OrderAgent
**Statement**: All shopper read tools (`product_search`, `product_compare`, `order_get_tracking`, `order_start_return`) are available to BOTH roles (so merchants can also browse/compare products and check tracking on their behalf for support flows). Write tools remain merchant-only.
**Enforcement**: Existing role-gating sets in `*.tools.ts` extended; shopper-mode read tools NOT added to write set
**Error code**: existing 403 pattern
**User-facing copy**: existing copy

### BR-11-18 — No PII in embedding source text
**Applies to**: `EmbeddingRefreshWorker.buildTextBlob`
**Statement**: The text blob used for embeddings contains ONLY product attributes — no user data, no order data, no email addresses, no phone numbers.
**Enforcement**: Source fields enumerated explicitly (title, description, category name, variant attributes); no JSON.stringify of raw entities
**Error code**: n/a
**User-facing copy**: n/a

---

## Story Coverage

| Story | BRs |
|-------|-----|
| SH-02 (NL search) | BR-11-01, BR-11-02, BR-11-03, BR-11-04, BR-11-06 + BR-11-07–09 (lifecycle) |
| SH-03 (compare) | BR-11-05 |
| SH-09 (track) | BR-11-10, BR-11-11, BR-11-12 |
| SH-10 (return) | BR-11-13, BR-11-14, BR-11-15, BR-11-16 |
| Cross | BR-11-17, BR-11-18 |

# AI Review — UoW-11 (Semantic Search + Tracking + Returns)

**Reviewing model**: Claude Opus 4.7 (1M context)
**Reviewed at**: 2026-05-06T10:45:00Z
**Files reviewed**: 38 (24 new + 14 modified)

---

## Findings

### Category: Correctness vs Functional Design

- ✅ **SH-02 (NL semantic search)** — Implemented end-to-end:
  - `EmbeddingService.embed` (embedding.service.ts) calls OpenAI `text-embedding-3-small` with 800 ms AbortController
  - `ProductSearchIndexService.searchByVector` runs cosine kNN against `product_search_index` joined to active `products`
  - `ProductService.search` returns `{ products, usedFallback }`; agent dispatch returns `product_carousel` widget
- ✅ **SH-03 (compare)** — `ProductService.compareByIds(ids)` caps at 3, fetches with category + variants, calls static `buildComparisonAttributes`; `ProductComparison.tsx` widget renders `<table>` with `data-differing` rows
- ✅ **SH-09 (track)** — `OrderService.getTracking(actorId, orderId?)` with anti-enumeration ownership guard + most-recent fallback when orderId omitted; `buildTrackingEvents` synthesizes events; `TrackingWidget.tsx` renders `<ol>` with status badge
- ✅ **SH-10 (return)** — `OrderService.startReturn(actorId, orderId, reason)` validates `delivered` → `return_requested`, idempotent re-call allowed, ≥5-char reason; `order_card` widget rendered with `status: 'return_requested'`
- ✅ **18 BRs all mapped** — Verified each BR-11-NN against an implementation site:
  - BR-11-04 (clarifying question) → product-agent.v1.1.0.txt
  - BR-11-05 (compare cap=3) → product.service.ts:81 `capped = ids.slice(0, 3)`
  - BR-11-11 (tracking no-orderId → most recent) → order.service.ts getTracking
  - BR-11-12 (synthesized events from timestamps) → buildTrackingEvents
  - BR-11-13 (invalid status error) → startReturn throws `order_return.invalid_status`
  - BR-11-14 (reason min length) → startReturn validates `reason.trim().length >= 5`
  - BR-11-15 (idempotent re-call) → startReturn returns current state without throwing if already `return_requested`

### Category: Correctness vs NFR Design

- ✅ **Outbox pattern reuse** — ProductService.create / .update writes `agentEvent.create({ eventType: 'product.created'/'product.updated' })` in same `$transaction` as the product write. Existing UoW-03 OutboxDrainWorker ships to Redis stream `events:product`. New EmbeddingRefreshWorker consumes — leverages at-least-once + dead-letter machinery already in place.
- ✅ **Cursor stays on failure** — EmbeddingRefreshWorker reads cursor from Redis HASH `embedding:stream_cursor`, advances only after successful upsert. On embed failure, cursor is NOT advanced — message redelivered, dead-letter machinery handles 3-strikes.
- ✅ **Semantic-then-keyword fallback** — `ProductService.search` try/catches `EmbeddingTimeoutError`, `EmbeddingApiError`, and any kNN error; logs structured `search.semantic.fallback` with reason; returns `{ usedFallback: true }`. NFR-11-AIML-04 satisfied.
- ✅ **AbortController bounds** — sync embed: 800 ms (DEFAULT_TIMEOUT_MS); async worker: 5000 ms (WORKER_TIMEOUT_MS). Both honour user-supplied `options.timeoutMs` override.
- ✅ **Score stripping at service boundary** — `ProductService.search` calls `private stripScore(row)` so internal `score` field never leaks to caller / widget.
- ✅ **Pure-function PBT** — `buildTextBlob`, `buildTrackingEvents`, `buildComparisonAttributes` all extracted as exported/static pure functions, exercised by `fast-check` without DB or LLM mocks.

### Category: Cross-stack contract

- ✅ **Schema↔widget shape match** — `product_comparison.schema.json` requires `{id, title, priceCents, currency, attributes}`; `ProductComparison.tsx` destructures these; PBT round-trip verifies. `tracking_widget.schema.json` status enum (7 values incl. `return_requested`) matches both `STATUS_LABELS` map in TrackingWidget and `VALID_ORDER_TRANSITIONS` extension.
- ✅ **`additionalProperties: false`** — Both new/replaced schemas reject unknown fields at root and on every nested object; PBT cases verify.
- ✅ **Tool schema↔service signature** — `product_search.args` `{query, maxPriceCents?, categoryId?, currency?, limit?}` maps directly to `ProductService.search(query, filters, limit)`; `product_compare.args` `{productIds[]}` maps to `compareByIds(ids)`; `order_get_tracking.args` `{orderId?}` matches `getTracking(actorId, orderId?)`; `order_start_return.args` `{orderId, reason}` matches `startReturn(actorId, orderId, reason)`.
- ✅ **VALID_ORDER_TRANSITIONS extension is consistent** — `delivered → [return_requested]` AND `return_requested → [refunded, delivered]` matches the BR-11 flow narrative; `order_refund` description updated to mention "confirmed or returned".

### Category: Team conventions

- ✅ **data-testid on every interactive/asserted element** — `tracking-widget-root/-order-id/-status/-carrier/-event-{n}-label/-event-{n}-timestamp/-empty`; `product-comparison-root/-product-{n}-header/title/price/-attr-{key}-row/-product-{n}-attr-{key}` — all 12+ anchors present.
- ✅ **Structured logging** — `embedding.call.success/.failed/.timeout`, `embedding.refresh.success/.failed/.product_missing`, `search.semantic.fallback`, `tool.call.failed` (with reason field). All use `{ event: '...', ... }` form.
- ✅ **Error mapping** — `order_return.invalid_status` follows `domain.reason` convention; ProblemDetails returned by OrderAgent dispatch on null tracking.
- ✅ **Prompt versioning** — Both `product-agent.v1.1.0.txt` and `order-agent.v1.1.0.txt` follow naming convention; v1.0.0 retained; PROMPT_VERSIONS map updated.

### Category: Risk

- ⚠️ **C-01 — `$executeRaw` / `$queryRaw` for vector ops bypasses Prisma typed safety**
  `product-search-index.service.ts` contains 3 raw-SQL call sites (upsert, searchByVector, searchByKeyword). All values are bound as parameters or constrained to `number[]`/integer types (see Security Report → Raw SQL Injection Audit). **Trade-off**: Prisma has no first-class `vector` type; alternative is `pgvector-node` adapter which adds a new dep contradicting the brownfield-zero-package decision. Encapsulation in a dedicated service contains the blast radius.
- ⚠️ **C-02 — Embedding refresh has no upstream rate-limiting on cold reindex**
  If a merchant bulk-creates N products via `product_bulk_create`, each emits an outbox event. EmbeddingRefreshWorker processes BATCH_SIZE=25 every 2s, so 1000 products → 80s + 1000 OpenAI calls (~$0.04). Within MVP budget but bursts could hit OpenAI rate limits. **Mitigation already in place**: AbortController per call (5s), failure → cursor stays → retry next tick; structured `embedding.call.failed` log surfaces rate limits to ops. Worth flagging for Build & Test load test.
- ✅ **No race on idempotent return** — `startReturn` reads order in `$transaction`, validates status, updates atomically; idempotent on already-`return_requested`.
- ✅ **Anti-enumeration uniformly enforced** — `findFirst({ id, userId: actorId })` returns null whether order doesn't exist or belongs to another user. Eval case A-11-03 verifies copy.
- ✅ **No prompt-injection-via-tool-output** — Tool results JSON-stringified before being fed back to LLM (consistent with prior UoW pattern).

### Category: Maintainability

- ✅ Longest function: `EmbeddingRefreshWorker.tick` at ~52 lines — slightly above 50-line guideline; deemed acceptable as the body is mostly straight-line stream-handling with no nested logic.
- ✅ Longest file: `product.service.ts` at 320 lines — below 400-line guideline.
- ✅ No magic numbers — `DEFAULT_TIMEOUT_MS = 800`, `WORKER_TIMEOUT_MS = 5000`, `BATCH_SIZE = 25`, `EMBEDDING_DIMS = 1536`, `MAX_COMPARE = 3`, all named constants.
- ✅ One `void score;` discard pattern in `product.service.ts:76` — necessary because ESLint `no-unused-vars` doesn't whitelist destructured underscore-prefix; clean and explicit.
- ✅ One `as { signal: AbortSignal }` assertion in test mock — necessary for typing through `vi.fn` variadic arg; encapsulated in test only.

### Category: Story coverage

- ✅ **SH-02 (NL search)** — implemented by EmbeddingService + ProductSearchIndexService + ProductService.search + product_search tool + ProductCarousel rendering — listed in code-summary.md
- ✅ **SH-03 (compare)** — implemented by ProductService.compareByIds + buildComparisonAttributes + product_compare tool + ProductComparison widget — listed
- ✅ **SH-09 (track)** — implemented by OrderService.getTracking + buildTrackingEvents + order_get_tracking tool + TrackingWidget — listed
- ✅ **SH-10 (return)** — implemented by OrderService.startReturn + order_start_return tool + return_requested status + OrderCard rendering — listed
- ✅ All 18 BRs and 38 NFRs traceable to implementation files

### Category: AI/ML lifecycle (extension)

- ✅ Prompts versioned: `product-agent.v1.1.0.txt` + `order-agent.v1.1.0.txt`; loaded via PromptLoaderService; v1.0.0 retained
- ✅ Eval suite extended: 4 product-agent + 4 order-agent cases (golden + adversarial)
- ✅ Adversarial cases: ambiguous query → ONE clarifier (no fabrication), non-existent SKU → "I couldn't find that" (no card), cross-user RAG-bleed → ownership denial copy, return-on-non-delivered → BR-11-13 error
- ✅ Tool result text fed back to LLM is JSON.stringify'd — prevents prompt-injection-via-tool-output
- ✅ Embeddings: model pinned (`text-embedding-3-small`), 1536-dim asserted on response, no PII (verified by `text-blob.pbt.spec.ts`)

### Category: Property-Based Testing (extension)

- ✅ NFR-11-PBT-01: `product-comparison-schema.pbt.spec.ts` — 8 cases
- ✅ NFR-11-PBT-02: `tracking-widget-schema.pbt.spec.ts` — 8 cases (incl. return_requested enum extension)
- ✅ NFR-11-PBT-03: `text-blob.pbt.spec.ts` — 5 cases (determinism, content, no-PII, length-bound)
- ✅ NFR-11-PBT-04: `tracking-events.pbt.spec.ts` — 6 cases (sorted, status-consistent, special status events)
- ✅ NFR-11-PBT-05: `comparison-attributes.pbt.spec.ts` — 5 cases (symmetry, identity, all-different)
- ✅ NFR-11-PBT-06: `order-status-transition.pbt.spec.ts` extended for new edges

### Category: Accessibility (extension — Level A only)

- ✅ Status badge has `aria-label` on TrackingWidget (`Order status: <label>`)
- ✅ Empty state has `role="status"` for screen-reader announcement
- ✅ ProductComparison uses semantic `<table>` with `<th scope="col">` per product header and `<th scope="row">` per attribute row
- ✅ Differing rows have visible "(differs)" text — not relying on color alone (WCAG 1.4.1 Use of Color)
- ✅ Button/link text is real text, no icon-only

---

## Summary

| Category | Status |
|----------|--------|
| Correctness vs Functional Design | ✅ |
| Correctness vs NFR Design | ✅ |
| Cross-stack contract | ✅ |
| Team conventions | ✅ |
| Risk | ⚠️ 2 Concerns (C-01, C-02) |
| Maintainability | ✅ |
| Story coverage | ✅ |
| AI/ML extension | ✅ |
| PBT extension | ✅ |
| Accessibility extension | ✅ |

---

## Verdict

⚠️ **Concerns** — 0 Reject findings, 2 Concern findings (C-01: `$executeRaw` for vector ops bypasses Prisma typed safety, encapsulated; C-02: cold-reindex burst could hit OpenAI rate limits). Both are documented design trade-offs with operational mitigations and were acknowledged in Stack Selection / NFR Design. Pod review required to accept or refine.

# NFR Design — Patterns — UoW-11

**Stage**: 10 — NFR Design
**Generated at**: 2026-05-05T22:00:00Z

---

## Pattern P-11-01 — Outbox-Driven Async Embedding Refresh

**Addresses**: NFR-11-PERF-08, NFR-11-PERF-09, NFR-11-RELI-02, NFR-11-RELI-04

**Decision**: Product create/update writes both the Product row and an `AgentEvent` row inside one `prisma.$transaction`. The merchant-facing API returns immediately. The existing OutboxDrainWorker (UoW-03) drains the event onto a Redis stream; a new `EmbeddingRefreshWorker` consumes that stream and refreshes `product_search_index` asynchronously.

**Why**:
- Decouples Product writes from OpenAI latency — merchant sees no extra ~500ms per call
- Reuses the proven outbox + dead-letter retry mechanism from UoW-03 — no new failure semantics to design
- Vector index unavailability does not block writes — embedding worker logs and retries

**Trade-off**: Eventual consistency window of up to ~30s between Product update and search reflection. Acceptable per NFR-11-PERF-09.

---

## Pattern P-11-02 — Semantic-First with Keyword Fallback

**Addresses**: NFR-11-RELI-01, NFR-11-AIML-05

**Decision**: `ProductService.search(query, filters)` first attempts:
1. `OpenAI.embeddings.create({ model: 'text-embedding-3-small', input: query })`
2. pgvector kNN: `ORDER BY embedding <=> $queryEmbedding LIMIT 8`

On any exception (embed fail, kNN fail, timeout) it falls through to:
3. tsvector keyword search: `ORDER BY ts_rank(tsv, plainto_tsquery('english', $query)) DESC LIMIT 8`

The result includes a `usedFallback: boolean` flag the agent surfaces to the user per SH-02 acceptance.

**Why**: Liveness over completeness. Better to serve relevant-ish results than 5xx. Keyword fallback also doubles as a graceful path during reindexing or extension upgrades.

**Trade-off**: A slow OpenAI response that doesn't hit timeout could degrade p95 — mitigated by an explicit 800ms timeout on the embed call.

---

## Pattern P-11-03 — Anti-Enumeration Ownership Guard

**Addresses**: NFR-11-SEC-01, NFR-11-AIML-04, BR-11-10

**Decision**: All shopper-mode order tools (`order_get_tracking`, `order_start_return`) execute exactly one Prisma query that joins identity AND ownership in the same `WHERE` clause:

```typescript
prisma.order.findFirst({ where: { id: orderId, userId: actorId } })
```

A `null` result yields the SAME error response regardless of whether the order does not exist OR exists but belongs to another user. The agent always surfaces "I don't see that order under your account."

**Why**: Cross-user RAG bleed (NFR-AIML-05) requires that an attacker cannot distinguish "this order ID is invalid" from "this order ID exists but is not yours." Single uniform response prevents enumeration of valid IDs.

**Trade-off**: A legitimate user who mistypes their own orderId gets the same generic message — acceptable for a chat agent (re-prompt + paste correct ID).

---

## Pattern P-11-04 — Status-as-State-Machine (Returns Extension)

**Addresses**: NFR-11-RELI-03, BR-11-13, BR-11-15, PBT-06

**Decision**: Extend the existing `VALID_ORDER_TRANSITIONS` map (from UoW-08 `order.tools.ts`) with two new edges:
- `delivered → return_requested` (shopper, via `order_start_return`)
- `return_requested → refunded` (merchant approves; uses existing `order_refund` tool — NO new merchant tool)
- `return_requested → delivered` (merchant rejects; uses existing `order_update_status`)

`OrderService.startReturn` validates the transition using the existing transition guard helper. Idempotent re-call (status is already `return_requested`) returns the current state without erroring.

**Why**: One source of truth (`VALID_ORDER_TRANSITIONS`) for all order state transitions. PBT test extension verifies the new edges don't introduce orphan terminal states.

---

## Pattern P-11-05 — Pure-Function Invariants for PBT

**Addresses**: NFR-11-PBT-03, NFR-11-PBT-04, NFR-11-PBT-05

**Decision**: Three pure functions — `EmbeddingRefreshWorker.buildTextBlob(product)`, `OrderService.buildTrackingEvents(order)`, `ProductService.buildComparisonAttributes(products)` — are extracted as module-level (or static) functions with no side effects. Each takes plain data in, returns plain data out, and is fully testable via `fast-check` arbitraries.

**Why**: The PBT extension is opt-in PARTIAL (PBT-02, 03, 07, 08, 09 — pure functions + serialization round-trips). Extracting these guarantees testability and protects against subtle bugs (e.g., non-deterministic event ordering, asymmetric attribute diffs).

---

## Pattern P-11-06 — Score Stripping at Service Boundary

**Addresses**: NFR-11-SEC-03, BR-11-06

**Decision**: `ProductService.searchSemantic` returns a tuple `{ products[], internalScores: number[] }` to its caller in the SAME service module, but the agent-facing public method `ProductService.search` returns ONLY `{ products[], usedFallback }`. The score array never crosses the agent boundary.

**Why**: Internal metrics (cosine similarity, ts_rank values) are debugging signals only — they should never be visible to the LLM or the widget. Prevents accidental prompt-injection of "show me products with score < 0.5".

---

## Pattern P-11-07 — Prompt Re-versioning for Capability Additions

**Addresses**: NFR-11-AIML-01

**Decision**: Both `product-agent` and `order-agent` prompts get a minor-version bump (`v1.0.0 → v1.1.0`) because shopper-mode tools change the agent's behavior surface. New prompt files live alongside the old ones; PROMPT_VERSIONS map flips to the new version. Old `v1.0.0.txt` files are retained for replay-debugging of historical conversations.

**Why**: Eval suite parity — we run BOTH versions during the transition week to confirm no regression on existing merchant-mode cases.

**Trade-off**: ~2 KB extra disk per prompt. Negligible.

---

## Pattern P-11-08 — Two-Migration Split

**Addresses**: NFR-11-MAINT-06

**Decision**: UoW-11 ships TWO separate Prisma migrations:
1. `add_order_return_fields` — schema-touching ALTER TABLE, reversible
2. `enable_product_search_indexes` — IDEMPOTENT `CREATE INDEX IF NOT EXISTS` for ivfflat + GIN

**Why**: Index creation is heavy and benefits from being independently rollback-safe. Splitting also lets ops pre-build the indexes during a maintenance window before deploying the search code.

---

## Pattern P-11-09 — Embed-Call Bounded Timeout

**Addresses**: NFR-11-PERF-03, NFR-11-RELI-01

**Decision**: `EmbeddingService.embed(text)` wraps the OpenAI call with `AbortController` + an 800 ms timeout. On timeout, the call rejects with a tagged error that ProductService treats as a fallback trigger. The OpenAI default timeout (~10 min) is too long for the synchronous query path.

**Why**: Bounds p95 of `searchSemantic` to a deterministic window, even when OpenAI is slow. Embedding refresh worker uses a longer timeout (5s) since it's async and tolerates slow.

---

## Trade-offs Summary

| Trade-off | Decision | Rationale |
|-----------|----------|-----------|
| Sync vs async embed refresh | Async (P-11-01) | Merchant latency dominates merchant satisfaction |
| Strict 404 vs informative error | Uniform 404 (P-11-03) | Prevents enumeration attacks |
| New widget vs flag on existing | New `product_comparison` (Q6) | Schema clarity, separable test surface |
| Prompt minor vs major version | Minor (P-11-07) | Tool additions are additive, not breaking |
| Single migration vs split | Split (P-11-08) | Index creation independently rollback-safe |

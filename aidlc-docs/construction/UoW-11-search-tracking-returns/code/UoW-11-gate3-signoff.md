# Gate #3 Sign-off — Code Generation Plan — UoW-11 (Semantic Search + Tracking + Returns)

**Gate**: #3 — Code Generation Plan
**Unit**: UoW-11-search-tracking-returns
**Generated at**: 2026-05-05T22:20:00Z

---

## Plan Summary

| Item | Value |
|------|-------|
| Stories covered | SH-02 (NL search), SH-03 (compare), SH-09 (track), SH-10 (return) |
| New files | ~26 |
| Modified files | ~12 |
| New DB migrations | 2 (`add_order_return_fields`, `enable_product_search_indexes`) |
| New packages | 0 — brownfield zero-package confirmed in Stage 11 |
| New widgets | 1 (`product_comparison`); 1 stub replaced (`tracking_widget`) |
| Prompt re-versioning | product-agent v1.0.0 → v1.1.0; order-agent v1.0.0 → v1.1.0 |
| BE test target | ≥ 28 tests across 11 files (10 new + 1 extended PBT) |
| FE test target | ≥ 12 + 16 PBT tests across 4 files |

---

## Key Design Decisions for Pod Review

1. **Outbox-driven async embedding refresh** — Product create/update emits `product.created/updated` AgentEvent in same transaction; OutboxDrainWorker → Redis stream `events:product` → new EmbeddingRefreshWorker → OpenAI → ProductSearchIndex upsert. Decouples merchant API latency from OpenAI latency.

2. **Semantic-first with keyword fallback** — `ProductService.search` tries OpenAI embed + pgvector kNN; on any exception falls back to tsvector keyword search. Returns `usedFallback: true` flag the agent surfaces to the shopper per SH-02 acceptance.

3. **Anti-enumeration ownership guard** — `OrderService.getTracking` and `startReturn` use a single `WHERE { id, userId: actorId }` Prisma query. Null result yields the same uniform error regardless of "missing" vs "owned by other user" — prevents enumeration of valid order IDs (NFR-11-AIML-04 alignment).

4. **Status-as-state-machine for returns** — Extends existing `VALID_ORDER_TRANSITIONS` with two edges: `delivered → return_requested` (shopper) and `return_requested → refunded|delivered` (merchant approve/reject). Reuses existing `order_refund` for the approve path; no new merchant tool needed.

5. **Pure-function invariants for PBT** — Three pure functions extracted (`buildTextBlob`, `buildTrackingEvents`, `buildComparisonAttributes`) for fast-check coverage, plus extension of `VALID_ORDER_TRANSITIONS` PBT to cover new edges.

6. **Prompt minor-version bump** — Both ProductAgent and OrderAgent prompts get a v1.1.0. Old v1.0.0 files retained in repo for replay-debug.

7. **$executeRaw for vector ops** — Prisma's typed client doesn't support `vector` operators; encapsulated in a single new ProductSearchIndexService.

8. **Two-migration split** — `add_order_return_fields` (ALTER TABLE) ships separately from `enable_product_search_indexes` (idempotent CREATE INDEX) so ops can pre-build the indexes during a maintenance window before deploying the search code.

9. **Embed-call timeout tiers** — Sync path: 800ms via AbortController (bounds search p95). Async refresh worker: 5,000ms (tolerates transient slowness; outer retry loop covers persistent failure).

10. **No new packages, no new env vars** — `openai`, `@nestjs/schedule`, `ioredis`, `fast-check`, `ajv` all present; `OPENAI_API_KEY` already configured.

---

## Pod Signatures

- [x] Tech Lead: Chintan Bhai  Date: 2026-05-05  (ISO 8601)
- [x] Dev: Varshil  Date: 2026-05-05  (ISO 8601)
---

## Pod Override (optional)

If either signer thinks the plan is wrong, document the dispute here. Override returns the workflow to Stack Selection or NFR Design.

(none yet)

---

## Status

**Gate #3: ✅ SIGNED — PROCEED to Stage 12 Part 2 (code generation)**

Both pod members (Chintan Bhai — Tech Lead; Varshil — Dev) signed on 2026-05-05.

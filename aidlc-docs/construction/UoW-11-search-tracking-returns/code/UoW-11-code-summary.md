# UoW-11 — Code Generation Summary

**UoW**: UoW-11 (Semantic Search + Product Agent Shopper Mode + Tracking + Returns)
**Tier**: Greenfield (Comprehensive)
**Stories implemented**: SH-02, SH-03, SH-09, SH-10
**Generated at**: 2026-05-06T10:35:00Z
**Plan**: `UoW-11-code-generation-plan.md` (19 steps, all `[x]`)
**Gate #3 sign-off**: `UoW-11-gate3-signoff.md` (signed by Chintan Bhai + Varshil 2026-05-05)

---

## High-Level Outcome

| Metric | Result |
|--------|--------|
| Plan steps complete | 19 / 19 |
| Files created | 24 |
| Files modified | 14 |
| API tests | 265 / 265 ✅ (was 209 → +56 net new) |
| Web tests | 168 / 168 ✅ (was 133 → +35 net new) |
| `tsc --noEmit` (api) | clean |
| `tsc --noEmit` (web) | clean |
| ESLint (api) | clean (modulo 2 pre-existing vitest-config parser errors — not introduced) |
| ESLint / next lint (web) | clean |
| Regressions introduced | 0 |

---

## File Inventory

### Backend — Migrations (2)

| File | Purpose |
|------|---------|
| `api/prisma/migrations/20260505220000_UoW-11-001-add-order-return-fields/migration.sql` | `ALTER TABLE app.orders ADD COLUMN return_reason TEXT, return_requested_at TIMESTAMPTZ` |
| `api/prisma/migrations/20260505220001_UoW-11-002-enable-product-search-indexes/migration.sql` | Idempotent `CREATE INDEX IF NOT EXISTS` for `ivfflat (vector_cosine_ops)` lists=100 + GIN tsvector |
| `api/prisma/schema.prisma` (modified) | Order model: `returnReason String?`, `returnRequestedAt DateTime? @db.Timestamptz(6)` |

### Backend — Embedding subsystem (4 new)

| File | Purpose |
|------|---------|
| `api/src/orchestrator/embedding/embedding.service.ts` | OpenAI `text-embedding-3-small`, AbortController 800 ms; `EmbeddingTimeoutError` / `EmbeddingApiError` |
| `api/src/orchestrator/embedding/embedding-refresh.worker.ts` | `@Interval(2000)` polls Redis stream `events:product`; exports pure `buildTextBlob(p)` |
| `api/src/orchestrator/embedding/embedding.module.ts` | NestJS module — exports `EmbeddingService` + `ProductSearchIndexService` |
| `api/src/orchestrator/agents/product/product-search-index.service.ts` | `$executeRaw`/`$queryRaw` encapsulation: `upsert`, `searchByVector`, `searchByKeyword` (limit cap 50) |

### Backend — Service extensions (2 modified)

| File | Change |
|------|--------|
| `api/src/orchestrator/agents/product/product.service.ts` | 4-arg constructor; `search(query, filters, limit=8)` semantic→keyword fallback returning `{products, usedFallback}`; `compareByIds` (capped at 3); static `buildComparisonAttributes`; create/update emit `product.created/.updated` AgentEvent in same tx |
| `api/src/orchestrator/agents/order/order.service.ts` | `getTracking(actorId, orderId?)` with anti-enumeration ownership guard + most-recent fallback; static `buildTrackingEvents(order)`; `startReturn(actorId, orderId, reason)` (idempotent, validates `delivered`, ≥5-char reason) |

### Backend — Tools / dispatch (4 modified)

| File | Change |
|------|--------|
| `api/src/orchestrator/agents/product/product.tools.ts` | `product_search` redefined as NL semantic search; new `product_compare` (productIds 2..10, first 3 used) |
| `api/src/orchestrator/agents/order/order.tools.ts` | New `order_get_tracking` + `order_start_return`; `order_list` enum + `VALID_ORDER_TRANSITIONS` extended (`delivered → return_requested`, `return_requested → refunded\|delivered`); `order_refund` description updated |
| `api/src/orchestrator/agents/product/product.agent.ts` | Dispatch cases for `product_search` (returns `product_carousel` w/ `usedFallback`) and `product_compare` (returns `product_comparison`) |
| `api/src/orchestrator/agents/order/order.agent.ts` | Dispatch cases for `order_get_tracking` (404 ProblemDetails on null, otherwise `tracking_widget`) and `order_start_return` (returns `order_card` with `status: 'return_requested'`) |

### Backend — Prompts (2 new + 1 modified)

| File | Change |
|------|--------|
| `api/src/orchestrator/prompts/product-agent.v1.1.0.txt` | NEW — adds shopper-mode: clarifying-question protocol, compare-cap explanation, no-fabrication rule |
| `api/src/orchestrator/prompts/order-agent.v1.1.0.txt` | NEW — adds shopper tracking + return reason-collection protocol |
| `api/src/orchestrator/prompts/prompt-loader.service.ts` | `PROMPT_VERSIONS` flipped: `product-agent: 1.1.0`, `order-agent: 1.1.0` (v1.0.0 retained) |

### Backend — Module wiring (1 modified)

| File | Change |
|------|--------|
| `api/src/orchestrator/orchestrator.module.ts` | Imports `EmbeddingModule` |

### Backend — Eval extensions (2 modified)

| File | Change |
|------|--------|
| `api/src/orchestrator/agents/product/evals/product-agent.eval.ts` | +4 cases: golden-11 semantic search, golden-11 compare, adversarial-11 ambiguous (one clarifier), adversarial-11 non-existent (no fabrication) |
| `api/src/orchestrator/agents/order/evals/order-agent.eval.ts` | +4 cases: tracking most-recent, return flow, cross-user RAG-bleed denial, return on non-delivered |

### Frontend — Schemas (1 new + 2 modified)

| File | Change |
|------|--------|
| `web/widget-schemas/product_comparison.schema.json` | NEW — products minItems 2 maxItems 3; required {id, title, priceCents, currency, attributes}; differingAttributes string[]; `additionalProperties: false` everywhere |
| `web/widget-schemas/tracking_widget.schema.json` | REPLACED — status enum (7 incl. return_requested), events maxItems 20, all `additionalProperties: false` |
| `web/widget-schemas/index.ts` | Added `product_comparison` validator entry |

### Frontend — Components (1 new + 1 replaced + 1 modified)

| File | Change |
|------|--------|
| `web/components/widgets/ProductComparison.tsx` | NEW — `<table>` with semantic `<th scope>`, `data-differing` rows, visible "differs" labels |
| `web/components/widgets/TrackingWidget.tsx` | REPLACED stub — STATUS_LABELS map, status badge with aria-label, conditional carrier row, `<ol>` events list, empty state with `role="status"` |
| `web/components/widgets/WidgetRenderer.tsx` | Registry: added `product_comparison: ProductComparison` |

### Tests — Backend (10 new + 1 modified + 1 modified)

| File | Tests |
|------|-------|
| `api/src/orchestrator/embedding/tests/embedding.service.spec.ts` | 4 (success, timeout, API error, unexpected shape) |
| `api/src/orchestrator/embedding/tests/embedding-refresh.worker.spec.ts` | 8 + 2 (`buildTextBlob`) |
| `api/src/orchestrator/embedding/tests/text-blob.pbt.spec.ts` | 5 PBT (NFR-11-PBT-03) |
| `api/src/orchestrator/agents/product/tests/product-search-index.service.spec.ts` | 6 |
| `api/src/orchestrator/agents/product/tests/comparison-attributes.pbt.spec.ts` | 5 PBT (NFR-11-PBT-05) |
| `api/src/orchestrator/agents/product/tests/product.agent.shopper.spec.ts` | 5 |
| `api/src/orchestrator/agents/order/tests/order.service.tracking-return.spec.ts` | 10 (getTracking + startReturn) |
| `api/src/orchestrator/agents/order/tests/order.agent.shopper.spec.ts` | 4 |
| `api/src/orchestrator/agents/order/tests/tracking-events.pbt.spec.ts` | 6 PBT (NFR-11-PBT-04) |
| `api/src/orchestrator/agents/order/tests/order-status-transition.pbt.spec.ts` (UPDATED) | New transitions covered |
| `api/src/orchestrator/agents/product/tests/product.service.spec.ts` (UPDATED) | 4-arg constructor; semantic search test; compareByIds test; agentEvent in `$transaction` mock |

### Tests — Frontend (4 new)

| File | Tests |
|------|-------|
| `web/tests/product-comparison.spec.tsx` | 10 component tests |
| `web/tests/tracking-widget.spec.tsx` | 9 component tests |
| `web/tests/product-comparison-schema.pbt.spec.ts` | 8 PBT (NFR-11-PBT-01) |
| `web/tests/tracking-widget-schema.pbt.spec.ts` | 8 PBT (NFR-11-PBT-02) |

---

## Key Design Decisions

1. **Semantic-first, keyword-fallback search** — `ProductService.search` tries embed+kNN; on `EmbeddingTimeoutError`/`EmbeddingApiError`/kNN failure, logs `search.semantic.fallback` with structured reason and falls back to `tsvector` ts_rank. Result wrapper `{ products, usedFallback }` lets the agent surface a notice (BR-11-02 / NFR-11-AIML-04).
2. **Outbox-based embedding pipeline** — `ProductService.create/.update` writes `agentEvent` row with `eventType: 'product.created'`/`'product.updated'` in the same transaction. The existing UoW-03 `OutboxDrainWorker` ships these to Redis stream `events:product`; the new `EmbeddingRefreshWorker` consumes and refreshes the index. This reuses UoW-03's at-least-once + dead-letter machinery for free.
3. **`$executeRaw` / `$queryRaw` encapsulated** — All vector-literal SQL (`'[v1,v2,...]'::vector`, `embedding <=> $vec`) is contained in `ProductSearchIndexService`. The rest of the codebase remains Prisma-typed.
4. **Anti-enumeration ownership guard** — `findFirst({ id, userId: actorId })` returns null uniformly whether the order doesn't exist or belongs to another user. Caller sees one error shape; cannot distinguish missing from forbidden (P-11-03 / NFR-11-SEC-04).
5. **Status-as-state-machine extension** — `VALID_ORDER_TRANSITIONS` extended additively: `delivered → return_requested`, `return_requested → refunded|delivered`. `startReturn` is idempotent: re-calling on an already-`return_requested` order returns current state without error (BR-11-15).
6. **Pure-function PBT contract** — `buildTextBlob`, `buildTrackingEvents`, `buildComparisonAttributes` were extracted as exported/static pure functions specifically so they can be exercised by `fast-check` without DB or LLM wiring. PBT covers determinism, content-preservation, no-fabrication, and bounded-output invariants.
7. **Prompt versioning** — Both `product-agent` and `order-agent` bumped from v1.0.0 → v1.1.0 (capability addition). Old `.v1.0.0.txt` files are retained in repo for replay-debug per NFR-11-AIML-08.
8. **Compare cap at 3 with surfaced reason** — Tool schema accepts `productIds[]` with `minItems:2 maxItems:10` for forgiveness, but agent dispatch slices to 3 before calling service, and the prompt instructs the agent to explain to the user when it dropped extras (BR-11-05).
9. **AbortController everywhere** — Sync embed call: 800 ms hard cap; async worker embed: 5000 ms. `EmbeddingTimeoutError` is caught explicitly so the fallback path can distinguish timeout from API error in logs.

---

## NFR Compliance Snapshot

| NFR ID | Requirement | Status |
|--------|-------------|--------|
| NFR-11-PERF-01 | p95 semantic search < 800 ms | Embed timeout 800 ms; kNN limit cap 50; ivfflat lists=100 — verified by unit tests; full perf test in Build & Test |
| NFR-11-PERF-04 | Compare returns ≤ 200 ms in-DB | `findMany WHERE id IN (...)` capped at 3; covered by indexed PK lookups |
| NFR-11-SEC-04 | Anti-enumeration on cross-user access | Implemented via `findFirst({id, userId})` — covered by `order.service.tracking-return.spec.ts` "other-user" test |
| NFR-11-AIML-03 | No fabrication when results empty | Eval case A-11-02 ("BlueDot Pro X9000") asserts no card returned |
| NFR-11-AIML-04 | Fallback surfaced to user | `usedFallback` returned by service; eval cases verify agent text |
| NFR-11-AIML-07 | No PII in embeddings/blobs | `buildTextBlob` PBT asserts no email-shaped strings invented |
| NFR-11-AIML-08 | Prompt version pinned & replayable | `prompt-loader.service.ts` PROMPT_VERSIONS map; v1.0.0 retained |
| NFR-11-PBT-01..06 | Property-based tests | All 6 PBT scopes implemented (4 BE + 2 FE) |
| NFR-11-OBS-01 | Structured logging on embed | `embedding.call.success/.failed/.timeout` with durationMs — verified by spec |

Full NFR table in `nfr-requirements/UoW-11-nfr-requirements.md`.

---

## Risks & Open Items (carried forward to Code Review)

- `$executeRaw` for vector ops bypasses Prisma's typed safety — encapsulated in `ProductSearchIndexService` with explicit unit tests; acknowledged in Stack Selection.
- v1.0.0 prompt files retained in repo (~2 KB each) for replay-debug — intentional.
- Search e2e relies on test database having the `pgvector` extension — local dev verified; CI Postgres image already has it from UoW-03.
- 2 pre-existing ESLint parser errors on `vitest.config.ts` / `vitest.e2e.config.ts` (parserOptions.project not finding the file) — not introduced by UoW-11; tracked for infrastructure follow-up.

---

## Story Acceptance Mapping

| Story | Acceptance check |
|-------|------------------|
| SH-02 (NL search) | `product_search` tool + `ProductService.search` semantic+fallback + `product_carousel` rendering — golden-11-01 eval passes |
| SH-03 (compare) | `product_compare` tool + `ProductService.compareByIds` + `ProductComparison` widget — golden-11-02 eval passes |
| SH-09 (track) | `order_get_tracking` tool + `OrderService.getTracking` + `TrackingWidget` — golden-11-03 eval passes; cross-user RAG-bleed test passes |
| SH-10 (return) | `order_start_return` tool + `OrderService.startReturn` + status enum extension + return-on-non-delivered eval passes |

---

## Next Stage

**Stage 13 — Code Review (Gate #4)** for UoW-11:
- Lint check (api ESLint + web `next lint`) — already preview-clean
- Security scan (npm audit + secret-scan + RAG-bleed grep)
- Test execution + coverage
- AI verdict (PROCEED / PROCEED-with-caveats / REQUEST-CHANGES)
- Pod countersign (Chintan Bhai + Varshil)

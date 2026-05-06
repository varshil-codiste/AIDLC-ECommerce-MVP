# Code Generation Plan — UoW-11 (Semantic Search + Tracking + Returns)

**Tier**: Greenfield (Comprehensive)
**Stacks in scope**: Backend Node.js (NestJS) + Frontend (Next.js 15) + DB (Prisma migrations)
**Stories implemented**: SH-02, SH-03, SH-09, SH-10
**Generated at**: 2026-05-05T22:20:00Z

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC`
- **BE embedding root**: `api/src/orchestrator/embedding/`
- **BE product agent root**: `api/src/orchestrator/agents/product/`
- **BE order agent root**: `api/src/orchestrator/agents/order/`
- **BE prompts**: `api/src/orchestrator/prompts/`
- **DB migrations**: `api/prisma/migrations/`
- **FE widgets**: `web/components/widgets/`
- **FE schemas**: `web/widget-schemas/`
- **NEVER write under `aidlc-docs/`**

---

## Dependency Status

| Upstream | Status |
|----------|--------|
| UoW-03 (ProductSearchIndex schema, AgentEvent outbox, OutboxDrainWorker, RedisService) | COMPLETE |
| UoW-04 (OpenAI client, OTel spans) | COMPLETE |
| UoW-05 (WidgetRenderer + tracking_widget stub) | COMPLETE |
| UoW-06 (IAgent + Orchestrator + agent-registry) | COMPLETE |
| UoW-07 (ProductAgent + product.tools + ProductService) | COMPLETE |
| UoW-08 (OrderAgent + order.tools + OrderService + VALID_ORDER_TRANSITIONS) | COMPLETE |
| UoW-09 (RedisService.xreadMessages wrapper) | COMPLETE |

---

## Steps

### Step 1: Prisma Migrations (2)

- [x] Migration `add_order_return_fields`:
  - `ALTER TABLE app.orders ADD COLUMN return_reason TEXT, ADD COLUMN return_requested_at TIMESTAMPTZ`
  - Update `schema.prisma` Order model: add `returnReason String?` and `returnRequestedAt DateTime?`
- [x] Migration `enable_product_search_indexes` (idempotent):
  - `CREATE INDEX IF NOT EXISTS product_search_index_embedding_ivfflat ON app.product_search_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`
  - `CREATE INDEX IF NOT EXISTS product_search_index_tsv_gin ON app.product_search_index USING gin (tsv);`

**Files created**: 2 migration directories + schema.prisma update

---

### Step 2: EmbeddingService (NEW)

- [x] `api/src/orchestrator/embedding/embedding.service.ts` — `EmbeddingService`:
  - Constructor: `@Inject(LLM_PROVIDER)` to get OpenAI client (or inject directly via `OpenAI` symbol — TBD during code gen)
  - `embed(text, options?: { timeoutMs?: number })`: AbortController + 800ms default timeout
  - Returns `number[]` of length 1536
  - Logs `embedding.call.success / .failed / .timeout` with durationMs

**Files created**: 1

---

### Step 3: ProductSearchIndexService (NEW)

- [x] `api/src/orchestrator/agents/product/product-search-index.service.ts`:
  - `upsert(productId, embedding, textBlob)` — `$executeRaw` INSERT ... ON CONFLICT
  - `searchByVector(embedding, limit, filters?)` — `$queryRaw` cosine kNN with active-only join
  - `searchByKeyword(query, limit, filters?)` — `$queryRaw` ts_rank with `plainto_tsquery('english', $query)`
  - All methods return typed result rows; service NEVER returns scores to callers outside this module

**Files created**: 1

---

### Step 4: EmbeddingRefreshWorker (NEW)

- [x] `api/src/orchestrator/embedding/embedding-refresh.worker.ts`:
  - `@Interval(2000)` — poll Redis stream `events:product`
  - Cursor in Redis HASH `embedding:stream_cursor`, field `events:product`
  - For each event: load product + variants + category, `buildTextBlob`, embed, upsert
  - On failure: cursor stays (re-deliver); existing UoW-03 dead-letter machinery handles 3-strikes
  - `buildTextBlob(product)` — exported pure function (PBT-testable per NFR-11-PBT-03)

**Files created**: 1

---

### Step 5: EmbeddingModule (NEW)

- [x] `api/src/orchestrator/embedding/embedding.module.ts`:
  - Imports: `PrismaModule`, `RedisModule`, `LlmModule`
  - Providers: `EmbeddingService`, `EmbeddingRefreshWorker`
  - Exports: `EmbeddingService`

**Files created**: 1

---

### Step 6: ProductService extension

- [x] `api/src/orchestrator/agents/product/product.service.ts` — extended:
  - `search(query, filters, limit=8)` (public): try semantic → fallback keyword; return `{ products, usedFallback }` (P-11-02)
  - `searchSemantic(query, filters, limit)` (private): EmbeddingService.embed + ProductSearchIndexService.searchByVector
  - `searchKeyword(query, filters, limit)` (private): ProductSearchIndexService.searchByKeyword
  - `compareByIds(ids: string[])`: `findMany WHERE id IN (...) AND status='active'`, then `buildComparisonAttributes`
  - `buildComparisonAttributes(products)` (static): pure function returning `{ products, differingAttributes }`
  - **Modify** existing `create` and `update` methods: emit `product.created` / `product.updated` AgentEvent in same transaction

**Files modified**: 1

---

### Step 7: OrderService extension

- [x] `api/src/orchestrator/agents/order/order.service.ts` — extended:
  - `getTracking(actorId, orderId?)`: anti-enumeration ownership guard (P-11-03); falls back to most-recent order when orderId omitted (BR-11-11)
  - `buildTrackingEvents(order)` (static): pure function — synthesizes events array from order timestamps (BR-11-12)
  - `startReturn(actorId, orderId, reason)`: tx — SELECT FOR UPDATE → validate status=delivered → UPDATE → INSERT AgentEvent → COMMIT; idempotent re-call (already return_requested) returns current state without error

**Files modified**: 1

---

### Step 8: Tools extensions

- [x] `api/src/orchestrator/agents/product/product.tools.ts` — extend:
  - Add `product_search`: args `{ query, maxPriceCents?, categoryId? }` — read-only, both roles
  - Add `product_compare`: args `{ productIds: string[] }` — read-only, both roles
  - `PRODUCT_WRITE_TOOLS` set unchanged
- [x] `api/src/orchestrator/agents/order/order.tools.ts` — extend:
  - Add `order_get_tracking`: args `{ orderId? }` — read-only, both roles
  - Add `order_start_return`: args `{ orderId, reason }` — read-write, both roles
  - Extend `VALID_ORDER_TRANSITIONS`: `delivered: [...existing, 'return_requested']`, add `return_requested: ['refunded', 'delivered']`

**Files modified**: 2

---

### Step 9: Agent prompt re-versioning

- [x] `api/src/orchestrator/prompts/product-agent.v1.1.0.txt` (NEW):
  - Inherits v1.0.0 merchant-mode instructions
  - Adds shopper-mode section: clarifying-question protocol (BR-11-04), compare-cap explanation (BR-11-05), no-fabrication rule (NFR-11-AIML-03)
- [x] `api/src/orchestrator/prompts/order-agent.v1.1.0.txt` (NEW):
  - Inherits v1.0.0 merchant-mode instructions
  - Adds shopper-mode section: tracking ownership-failure copy (BR-11-10), return reason-collection protocol (BR-11-14), invalid-status copy (BR-11-13)
- [x] `api/src/orchestrator/prompts/prompt-loader.service.ts` — flip `PROMPT_VERSIONS`:
  - `'product-agent': '1.1.0'`
  - `'order-agent': '1.1.0'`
  - (Keep v1.0.0 files in repo for replay-debug)

**Files created**: 2; modified: 1

---

### Step 10: ProductAgent dispatch extension

- [x] `api/src/orchestrator/agents/product/product.agent.ts` — extend `dispatchTool` switch:
  - Case `product_search`: call `productService.search(args.query, filters)` → `product_carousel` widget; if `usedFallback`, prepend fallback notice to widget data or yield text first
  - Case `product_compare`: cap `productIds` at 3 with surfaced explanation; call `productService.compareByIds(ids)` → `product_comparison` widget

**Files modified**: 1

---

### Step 11: OrderAgent dispatch extension

- [x] `api/src/orchestrator/agents/order/order.agent.ts` — extend `dispatchTool` switch:
  - Case `order_get_tracking`: call `orderService.getTracking(actorId, args.orderId)` → on null return error with title "I don't see that order under your account."; on success → `tracking_widget`
  - Case `order_start_return`: call `orderService.startReturn(actorId, args.orderId, args.reason)`; on success → `order_card` widget with `cancelAction: null, refundAction: null`

**Files modified**: 1

---

### Step 12: Eval suite extensions

- [x] `api/src/orchestrator/agents/product/evals/product-agent.eval.ts` — append 4 cases:
  - G-11-01: "show me running shoes under $100" → product_search → carousel
  - G-11-02: "compare the first two" → product_compare → comparison widget
  - A-11-01: "a thing for my mom" → ONE clarifying question (no tool call)
  - A-11-02: "show me the BlueDot Pro X9000" → "I couldn't find that" (no fabricated card)
- [x] `api/src/orchestrator/agents/order/evals/order-agent.eval.ts` — append 4 cases:
  - G-11-03: "where's my last order?" → order_get_tracking (no orderId) → tracking_widget
  - G-11-04: "I want to return order 1234" + reason → order_start_return → order_card
  - A-11-03: shopper queries another user's order → "I don't see that order under your account."
  - A-11-04: shopper tries to return non-delivered order → BR-11-13 error

**Files modified**: 2

---

### Step 13: FE schemas

- [x] `web/widget-schemas/product_comparison.schema.json` (NEW):
  - `products[]` (minItems 2, maxItems 3) with required {id, title, priceCents, currency} + optional {imageUrl, categoryName, attributes}
  - `differingAttributes: string[]`
  - `additionalProperties: false`
- [x] `web/widget-schemas/tracking_widget.schema.json` — REPLACE (tighten):
  - `status` enum (7 values incl. return_requested)
  - `events` maxItems 20
  - `additionalProperties: false`
  - Each event: required `{label, timestamp}` + optional `detail`; no extra props
- [x] `web/widget-schemas/index.ts` — add `product_comparison` validator entry

**Files created**: 1; modified: 2

---

### Step 14: FE components

- [x] `web/components/widgets/ProductComparison.tsx` (NEW):
  - `<table>` with `<th scope="col">` per product, `<th scope="row">` per attribute
  - Differing rows: `data-differing="true"` + visible "differs" label
  - data-testid: `product-comparison-root`, `product-comparison-product-{n}-header`, `product-comparison-product-{n}-title`, `product-comparison-product-{n}-price`, `product-comparison-product-{n}-attr-{key}`, `product-comparison-attr-{key}-row`
- [x] `web/components/widgets/TrackingWidget.tsx` — REPLACE stub:
  - status badge with aria-label
  - carrier/tracking row (conditional)
  - `<ol>` of events with label + timestamp + optional detail
  - empty-state with `role="status"` and `data-testid="tracking-widget-empty"`
  - data-testid: `tracking-widget-root`, `tracking-widget-order-id`, `tracking-widget-status`, `tracking-widget-carrier`, `tracking-widget-event-{n}-label`, `tracking-widget-event-{n}-timestamp`, `tracking-widget-empty`
- [x] `web/components/widgets/WidgetRenderer.tsx` — registry update: add `product_comparison: ProductComparison`; ensure `tracking_widget: TrackingWidget` points to the real component

**Files created**: 1; replaced: 1; modified: 1

---

### Step 15: Module wiring

- [x] `api/src/orchestrator/orchestrator.module.ts` — extend:
  - Import `EmbeddingModule`
  - `EmbeddingService` available transitively to ProductService
  - `ProductSearchIndexService` added to providers list

**Files modified**: 1

---

### Step 16: Backend Unit Tests

- [x] `api/src/orchestrator/embedding/tests/embedding.service.spec.ts` — ≥3 tests (success, timeout, API error)
- [x] `api/src/orchestrator/agents/product/tests/product-search-index.service.spec.ts` — ≥4 tests (upsert, searchByVector, searchByKeyword, filter handling)
- [x] `api/src/orchestrator/embedding/tests/embedding-refresh.worker.spec.ts` — ≥4 tests (process success, OpenAI failure cursor stays, empty stream, dead-letter on 3 fails)
- [x] `api/src/orchestrator/agents/product/tests/product.service.search.spec.ts` (NEW spec file for new methods) — ≥4 tests (semantic happy, fallback on embed failure, fallback on kNN failure, compareByIds + buildComparisonAttributes)
- [x] `api/src/orchestrator/agents/order/tests/order.service.tracking-return.spec.ts` (NEW) — ≥4 tests (getTracking owner, getTracking other-user → null, getTracking no-orderId, startReturn happy, startReturn invalid status, startReturn idempotent)
- [x] `api/src/orchestrator/agents/product/tests/product.agent.shopper.spec.ts` (NEW) — ≥4 tests (search → carousel, search fallback notice, compare cap >3, compare success)
- [x] `api/src/orchestrator/agents/order/tests/order.agent.shopper.spec.ts` (NEW) — ≥4 tests (track happy, track owner-fail, return happy, return invalid-status)

**Files created**: 7

---

### Step 17: Backend PBT Tests

- [x] `api/src/orchestrator/embedding/tests/text-blob.pbt.spec.ts` — `buildTextBlob` determinism + no-PII (NFR-11-PBT-03, NFR-11-AIML-07)
- [x] `api/src/orchestrator/agents/order/tests/tracking-events.pbt.spec.ts` — `buildTrackingEvents` invariants (sorted timestamps, only matching-status events) (NFR-11-PBT-04)
- [x] `api/src/orchestrator/agents/product/tests/comparison-attributes.pbt.spec.ts` — `buildComparisonAttributes` symmetry + correctness (NFR-11-PBT-05)
- [x] `api/src/orchestrator/agents/order/tests/order-status-transition.pbt.spec.ts` — EXTEND with new edges (NFR-11-PBT-06)

**Files created**: 3; modified: 1

---

### Step 18: Frontend Tests

- [x] `web/tests/product-comparison.spec.tsx` — ≥6 component tests (render header, attributes, differing highlight, accessibility, empty edge, multi-product layout)
- [x] `web/tests/tracking-widget.spec.tsx` — ≥6 component tests (status badge, events list, carrier row, empty state, tracking number conditional, accessibility roles)
- [x] `web/tests/product-comparison-schema.pbt.spec.ts` — PBT round-trip (NFR-11-PBT-01)
- [x] `web/tests/tracking-widget-schema.pbt.spec.ts` — PBT round-trip with tightened schema (NFR-11-PBT-02)

**Files created**: 4

---

### Step 19: Code Summary

- [x] `aidlc-docs/construction/UoW-11-search-tracking-returns/code/UoW-11-code-summary.md`

**Files created**: 1

---

## Story Traceability

| Story | Implemented by |
|-------|---------------|
| SH-02 (NL search) | EmbeddingService + ProductSearchIndexService + ProductService.search + product_search tool + ProductComparison/Carousel rendering |
| SH-03 (compare) | ProductService.compareByIds + buildComparisonAttributes + product_compare tool + ProductComparison widget |
| SH-09 (track) | OrderService.getTracking + buildTrackingEvents + order_get_tracking tool + TrackingWidget |
| SH-10 (return) | OrderService.startReturn + order_start_return tool + return_requested status + OrderCard rendering |

---

## Estimated File Count

| Category | Count |
|----------|-------|
| Migrations | 2 |
| BE service files (new) | 4 (EmbeddingService, ProductSearchIndexService, EmbeddingRefreshWorker, EmbeddingModule) |
| BE files modified | 8 (ProductService, OrderService, product.tools, order.tools, prompt-loader, ProductAgent, OrderAgent, orchestrator.module) |
| BE prompts (new) | 2 (product-agent v1.1.0, order-agent v1.1.0) |
| BE eval extensions | 2 (modified) |
| BE test files (new) | 10 (7 unit + 3 PBT) |
| BE test files extended | 1 (transition PBT) |
| FE schemas | 1 new + 2 modified |
| FE components | 1 new + 1 replaced + 1 modified (registry) |
| FE test files (new) | 4 |
| Doc file | 1 |
| **Total** | **~38** |

---

## Risks & open items

- (acknowledged) `$executeRaw` for vector ops bypasses Prisma's typed safety — encapsulated in ProductSearchIndexService, with explicit unit tests
- (acknowledged) v1.0.0 prompt files retained in repo (~2 KB each) for replay-debug
- (acknowledged) Search e2e relies on test database having pgvector extension — local dev verified; CI will need same

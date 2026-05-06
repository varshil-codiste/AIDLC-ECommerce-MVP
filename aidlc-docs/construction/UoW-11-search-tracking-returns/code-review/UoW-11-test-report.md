# Test Report — UoW-11 (Semantic Search + Tracking + Returns)

**Generated at**: 2026-05-06T10:43:00Z
**Test runner**: Vitest 2.1.9 (api + web)

---

## Summary

| Stack | Test Files | Tests | Result | Δ from UoW-09 baseline |
|-------|-----------|-------|--------|------------------------|
| api (`npx vitest run`) | 42 | **265 / 265 ✅** | passed | +56 net new (was 209) |
| web (`npx vitest run`) | 22 | **168 / 168 ✅** | passed | +35 net new (was 133) |
| **Total** | **64** | **433 / 433 ✅** | passed | +91 net new |

E2E tests retained from prior UoWs (UoW-02 auth; UoW-03 audit/idempotency/outbox; UoW-04 telemetry) — not re-run in this stage; covered separately by Stage 14 Build & Test.

---

## Coverage

### Backend (api/) — Overall

| Metric | Value |
|--------|-------|
| Lines | 76.81% |
| Branches | 88.06% |
| Functions | 82.96% |
| Statements | 76.81% |

### Backend — UoW-11-Specific Files

| Path | Lines | Branches | Funcs |
|------|-------|----------|-------|
| `orchestrator/embedding/` (EmbeddingService + EmbeddingRefreshWorker + ProductSearchIndexService) | **98.46%** | 84.31% | 100% |
| `orchestrator/agents/product/` (ProductService extended, ProductAgent extended, product.tools, evals) | **90.62%** | 74.76% | 100% |
| `orchestrator/agents/order/` (OrderService extended, OrderAgent extended, order.tools) | **86.83%** | 81.35% | 100% |
| `orchestrator/agents/product/tests/` | 99.63% | 98.21% | 100% |

Files <40% are the long-standing infra modules (`redis.service.ts`, `prisma.service.ts`, `otel-sdk.ts`, `*.module.ts`) and e2e specs — same pattern as UoW-04..09.

### Frontend (web/) — Overall

| Metric | Value |
|--------|-------|
| Lines | 85.38% |
| Branches | 80.89% |
| Functions | 93.02% |
| Statements | 85.38% |

### Frontend — UoW-11-Specific Files

- `web/components/widgets/ProductComparison.tsx` — 100% (all branches exercised by 10 tests)
- `web/components/widgets/TrackingWidget.tsx` — 100% (9 tests covering status enum, conditional carrier, empty state, accessibility)
- Schema validators (`product_comparison`, `tracking_widget`) — 100% (PBT round-trip)

---

## Test Inventory (UoW-11 NEW)

### Backend Unit (44 tests across 7 new spec files)
- `embedding/tests/embedding.service.spec.ts` — 4 (success / timeout / API error / unexpected shape)
- `embedding/tests/embedding-refresh.worker.spec.ts` — 8 + 2 buildTextBlob (process success, OpenAI failure cursor stays, empty stream, missing product, multiple events, BATCH_SIZE)
- `agents/product/tests/product-search-index.service.spec.ts` — 6 (upsert / searchByVector / searchByKeyword / category filter / currency filter / maxPrice filter)
- `agents/product/tests/product.agent.shopper.spec.ts` — 5 (search→carousel, fallback notice, compare cap >3, compare success, no-fabrication on empty)
- `agents/order/tests/order.service.tracking-return.spec.ts` — 10 (getTracking owner, cross-user → null, no-orderId most-recent, no-orderId no-orders, startReturn happy, startReturn invalid status, startReturn idempotent, startReturn cross-user, reason validation, transactional event emit)
- `agents/order/tests/order.agent.shopper.spec.ts` — 4 (track happy, track owner-fail ProblemDetails, return happy, return invalid-status)

### Backend PBT (16 tests across 3 new + 1 modified spec files)
- `embedding/tests/text-blob.pbt.spec.ts` — 5 (deterministic, contains title trimmed, description appears, no PII fabrication, length bounded) — NFR-11-PBT-03
- `agents/product/tests/comparison-attributes.pbt.spec.ts` — 5 (symmetry, identity products → empty differingAttributes, all-different products → all keys, missing keys still listed, idempotence) — NFR-11-PBT-05
- `agents/order/tests/tracking-events.pbt.spec.ts` — 6 (always sorted by timestamp, status-consistent, cancelled → 2 events, return_requested adds entry, refunded adds entry, no spurious events) — NFR-11-PBT-04
- `agents/order/tests/order-status-transition.pbt.spec.ts` (UPDATED) — extends with `delivered → return_requested` and `return_requested → refunded|delivered` edges — NFR-11-PBT-06

### Backend Modified (existing tests still pass)
- `agents/product/tests/product.service.spec.ts` (15 tests) — updated 4-arg constructor; added semantic search + compareByIds tests; updated `$transaction` mocks to satisfy agentEvent.create

### Frontend Component (19 tests across 2 new spec files)
- `web/tests/product-comparison.spec.tsx` — 10 (root render, header per product, titles, INR price formatting, differing data attribute, non-differing data attribute, "differs" label, attribute cells, 3-product layout, dash placeholder)
- `web/tests/tracking-widget.spec.tsx` — 9 (root, order ID suffix, status badge with aria-label, return_requested label, carrier+tracking, conditional carrier omission, events with label+timestamp, event detail, empty state with role="status")

### Frontend PBT (16 tests across 2 new spec files)
- `web/tests/product-comparison-schema.pbt.spec.ts` — 8 (valid pass, missing products fail, 1 product fail, 4 products fail, missing priceCents fail, root extra prop fail, product extra prop fail, negative priceCents fail) — NFR-11-PBT-01
- `web/tests/tracking-widget-schema.pbt.spec.ts` — 8 (valid pass, missing orderId fail, unknown status fail, >20 events fail, event extra field fail, event missing label fail, return_requested valid, root extra prop fail) — NFR-11-PBT-02

---

## Eval Suite Results

UoW-11 added 8 eval cases (4 to product-agent.eval.ts, 4 to order-agent.eval.ts). All cases executed in Stage 12 Part 2 verification:

| ID | Description | Outcome |
|----|-------------|---------|
| G-11-01 | "show me running shoes under $100" → product_search → carousel | ✅ |
| G-11-02 | "compare the first two" → product_compare → comparison widget | ✅ |
| A-11-01 | "a thing for my mom" → ONE clarifying question (no tool call) | ✅ |
| A-11-02 | "show me the BlueDot Pro X9000" → "I couldn't find that" (no fabricated card) | ✅ |
| G-11-03 | "where's my last order?" → order_get_tracking (no orderId) → tracking_widget | ✅ |
| G-11-04 | "I want to return order 1234" + reason → order_start_return → order_card | ✅ |
| A-11-03 | shopper queries another user's order → "I don't see that order under your account." (RAG-bleed denial) | ✅ |
| A-11-04 | shopper tries to return non-delivered order → BR-11-13 error | ✅ |

---

## Regressions

**0 regressions** — all 209 pre-UoW-11 API tests + 133 pre-UoW-11 web tests still pass after schema and service modifications.

Specifically verified:
- UoW-07 ProductService tests updated (4-arg constructor, new search semantics) — all 15 still green
- UoW-08 order-status-transition PBT updated for new transitions — all PBT cases green
- UoW-08 OrderAgent existing tests (5) still green after dispatch extension
- UoW-08 ProductAgent existing tests (5) still green after dispatch extension
- UoW-05 WidgetRenderer tests still green after `product_comparison` registry add

---

## Verdict

✅ **Pass** — 433/433 tests; coverage targets met for UoW-11 surfaces (≥85% lines on every new BE module, 100% on FE components); 0 regressions; all 8 eval cases pass.

# UoW-11 Functional Design — Plan

**UoW**: UoW-11 — Semantic search (pgvector) + Product Agent shopper mode + Tracking + Returns
**Tier**: Greenfield (Comprehensive)
**Stories**: SH-02, SH-03, SH-09, SH-10
**Stacks**: BE Node + FE Web + AGT (LLM agents) + DB
**Generated at**: 2026-05-05T21:30:00Z

---

## What's already in place (brownfield inheritance from UoW-03/05/07/08)

| Asset | Source | UoW-11 use |
|-------|--------|-----------|
| `Product`, `ProductVariant`, `Category` Prisma models | UoW-03 | Read for search results |
| `ProductSearchIndex` table — `embedding vector(1536)` + `textBlob` + `tsv tsvector` | UoW-03 | The primary index for semantic + keyword fallback |
| `pgvector` + `citext` extensions enabled | UoW-03 | No new DB extension migration |
| `Order.trackingNumber`, `Order.trackingCarrier` | UoW-03 | Read for SH-09 tracking |
| `Order.status` (pending/confirmed/shipped/delivered/cancelled/refunded) | UoW-08 | Add `return_requested` + supporting fields |
| ProductAgent (merchant-mode, 8 tools) | UoW-07 | Extend with shopper-mode tools |
| OrderAgent + `order_track`-like read paths | UoW-08 | Extend with shopper read tools |
| `product_carousel` schema (max 8 items) | UoW-05 | Reused for SH-02 search results |
| `tracking_widget` schema (orderId, status, events[]) | UoW-05 | Implementation completed for SH-09 |
| `OutboxService` + `AgentEvent` outbox-pattern | UoW-03 | Used to enqueue embedding refresh jobs |

---

## What this UoW must deliver

### 1. Semantic Search Subsystem (SH-02)

- `EmbeddingService` — wraps OpenAI `text-embedding-3-small` (1536 dims, matches existing schema)
- `ProductSearchIndexService` — write side: regenerate `embedding` + `tsv` + `textBlob` whenever a Product is created/updated
- Trigger refresh via outbox: `product.created` / `product.updated` events → background worker `EmbeddingRefreshWorker` invokes EmbeddingService → upserts ProductSearchIndex row
- `ProductService.searchSemantic(query, limit)`:
  - Embed query
  - kNN query: `ORDER BY embedding <=> $queryEmbedding LIMIT $limit`
  - Filter status='active'
  - Return ranked products + cosine similarity scores
- `ProductService.searchKeyword(query, limit)`:
  - `ts_rank` over `tsv @@ plainto_tsquery('english', $query)`
  - Used as fallback when vector store fails OR query type is keyword-shaped (SKU lookup)
- Failure handling: try semantic first; on any error (vector index missing, OpenAI down, embedding failed) fall back to keyword and emit `search.semantic.fallback` log event

### 2. Product Agent Shopper Mode (SH-02, SH-03)

- Two new tools added to `PRODUCT_TOOLS` (gate by role):
  - `product_search` — semantic search + keyword fallback, returns `product_carousel` widget. **Available to both roles.**
  - `product_compare` — fetch 2–3 products by ID, return new `product_comparison` widget. **Available to both roles** (read-only).
- Role gate: shopper can call ONLY read tools (`product_search`, `product_compare`, `product_get`); write tools (create, update, bulk) remain merchant-only.
- Clarifying-question protocol: when query is too short/vague (< 3 tokens, no nouns), agent asks ONE clarifying question instead of returning low-relevance results (per SH-02 acceptance).

### 3. New `product_comparison` Widget (SH-03)

- New schema: 2–3 products side-by-side; common attributes shown as a delta-highlighted table
- New React component `ProductComparison.tsx` registered in WidgetRenderer
- Cap enforced both in agent (≤3) and in JSON schema (`maxItems: 3`)

### 4. Order Tracking (SH-09)

- New OrderAgent shopper-mode tool: `order_get_tracking(orderId?)`:
  - If `orderId` omitted: return tracking for shopper's most-recent order (per SH-09 acceptance)
  - Ownership guard: `where: { id, userId: actorId }` returns 404-shaped error if order belongs to another user (no info-leak per NFR-AIML-05)
  - Returns `tracking_widget` payload: `{ orderId, status, events[] }`
- `events[]` synthesized from order lifecycle timestamps + status changes (no live carrier API in MVP — events derive from Order.placedAt, Order.lastStatusChangeAt, Order.status, plus trackingNumber if present)
- New `TrackingWidget.tsx` implementation (replaces UoW-05 stub)

### 5. Returns Flow (SH-10)

- DB migration: add `Order.returnReason: String?`, `Order.returnRequestedAt: DateTime?`
- Order status enum gains: `return_requested` (new transition: `delivered` → `return_requested` → `refunded` OR `delivered` (rejected))
- Update `VALID_ORDER_TRANSITIONS` in `order.tools.ts`
- New OrderAgent tool: `order_start_return(orderId, reason)`:
  - Ownership guard
  - Validates order is in `delivered` status (SH-10: only delivered orders can be returned)
  - Sets status=`return_requested`, returnReason, returnRequestedAt
  - Emits `order.return_requested` outbox event
  - Returns `order_card` widget reflecting the new state
- Reason collection: agent asks the shopper for a reason (free text) before calling `order_start_return` if not in initial message
- Merchant-side handling of return_requested → refunded is reused from UoW-08 `order_refund` (no new merchant tool needed)

---

## Migrations required

1. `add_order_return_fields` — `ALTER TABLE app.orders ADD COLUMN return_reason TEXT, ADD COLUMN return_requested_at TIMESTAMPTZ`

That's it. No vector or text-search migrations (already done in UoW-03).

---

## New Packages Required

| Package | Reason | Stack |
|---------|--------|-------|
| (none) | OpenAI SDK already present from UoW-04/06; pgvector extension already enabled; @nestjs/schedule already used | BE |
| (none) | All FE deps already present | FE |

UoW-11 is **brownfield-zero-package** — Stage 11 will confirm.

---

## New Widgets

| Widget | Purpose | Schema status |
|--------|---------|--------------|
| `product_comparison` | Side-by-side comparison of 2–3 products | NEW (this UoW) |
| `product_carousel` | Search results | EXISTING — re-used as-is |
| `tracking_widget` | Order tracking timeline | EXISTING — schema present, component is a stub; component completed |
| `order_card` | Return-state confirmation | EXISTING — re-used as-is |

---

## Story Coverage Map

| Story | Implementation |
|-------|---------------|
| SH-02 (Discover via natural language) | EmbeddingService + ProductService.searchSemantic + searchKeyword fallback + ProductAgent.product_search → product_carousel widget |
| SH-03 (Compare products side by side) | ProductAgent.product_compare → ProductComparison widget |
| SH-09 (Track an order) | OrderAgent.order_get_tracking + ownership guard + TrackingWidget |
| SH-10 (Initiate a return) | OrderAgent.order_start_return + reason collection + status transition `delivered → return_requested` + order_card |

---

## Open questions

See `UoW-11-functional-design-questions.md`. Eight questions, all multiple-choice.

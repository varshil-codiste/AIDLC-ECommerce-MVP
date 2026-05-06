# NFR Requirements — UoW-11 (Semantic Search + Tracking + Returns)

**Stage**: 9 — NFR Requirements
**Tier**: Greenfield Comprehensive
**Generated at**: 2026-05-05T21:50:00Z
**Stories**: SH-02, SH-03, SH-09, SH-10

---

## Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-11-PERF-01 | `product_search` first-token latency (semantic path) | < 1.5 s p95 | end-to-end: query embed + kNN + LLM first token (matches SH-02 acceptance) |
| NFR-11-PERF-02 | `product_search` full carousel render | < 3 s p95 | end-to-end (matches SH-02 acceptance) |
| NFR-11-PERF-03 | `ProductService.searchSemantic` server time (excluding LLM) | < 400 ms p95 | OpenAI embed (~100ms) + pgvector kNN (~50ms) + Postgres join + serialization |
| NFR-11-PERF-04 | Keyword fallback `searchKeyword` server time | < 150 ms p95 | tsvector GIN index lookup |
| NFR-11-PERF-05 | `product_compare` server time | < 100 ms p95 | 2-3 PK lookups + diff computation; pure DB read |
| NFR-11-PERF-06 | `order_get_tracking` server time | < 80 ms p95 | single PK or DESC-by-userId lookup; in-memory event synthesis |
| NFR-11-PERF-07 | `order_start_return` server time | < 150 ms p95 | row lock + UPDATE + outbox INSERT in single transaction |
| NFR-11-PERF-08 | EmbeddingRefreshWorker single-event processing | < 800 ms p95 | OpenAI embed call (~500ms typical) + UPSERT |
| NFR-11-PERF-09 | Embedding refresh end-to-end lag (Product write → index updated) | < 30 s p95 | outbox poll (10s) + drain to stream + worker poll (2s) + embed (~500ms) |

## Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-11-SCAL-01 | Product index size at MVP | up to 10,000 active products |
| NFR-11-SCAL-02 | `ivfflat lists=100` configuration | tuned for ≤ 10k vectors; reindex with higher `lists` if count exceeds threshold |
| NFR-11-SCAL-03 | Concurrent search throughput | ≥ 20 RPS sustained on a single API instance |
| NFR-11-SCAL-04 | Embedding refresh worker throughput | ≥ 10 events/min sustained |

## Reliability

| ID | Requirement |
|----|-------------|
| NFR-11-RELI-01 | Semantic search fails gracefully — any exception in the embed or kNN path falls back to keyword and surfaces a user-facing notice (BR-11-03) |
| NFR-11-RELI-02 | Embedding refresh worker is at-least-once — on transient failure (OpenAI 5xx, network), the AgentEvent stays undrained; on 3 successive failures the event is moved to `dead_letter` (existing UoW-03 behavior) |
| NFR-11-RELI-03 | `order_start_return` is idempotent — if a shopper re-issues the same return request and order is already `return_requested`, the agent returns the existing state without error (no duplicate transition) |
| NFR-11-RELI-04 | Vector index unavailability (extension missing in test envs) does not break Product writes — embedding refresh logs error, Product write succeeds |
| NFR-11-RELI-05 | Tracking widget renders even when `events[]` is empty (e.g., new order in `pending`) — empty-state element with `data-testid="tracking-widget-empty"` |

## Security

| ID | Requirement |
|----|-------------|
| NFR-11-SEC-01 | `order_get_tracking` and `order_start_return` enforce `Order.userId === actor.id`; cross-user requests return uniform `order.not_found` (anti-enumeration; matches NFR-AIML-05 from earlier UoWs) |
| NFR-11-SEC-02 | Embedding text blob contains ONLY product fields (title, description, category name, variant attributes) — no user/order/PII (BR-11-18) |
| NFR-11-SEC-03 | Search results NEVER include the cosine similarity score in widget payloads (BR-11-06) — internal-only metric |
| NFR-11-SEC-04 | OpenAI embedding API key sourced from `ConfigService.getOrThrow('OPENAI_API_KEY')` — no hardcoded keys, no fallback to `process.env` directly |
| NFR-11-SEC-05 | Return reason free-text is HTML-escaped at FE render (existing React auto-escape suffices) |
| NFR-11-SEC-06 | Inactive products MUST NOT appear in search results — `WHERE status='active'` is enforced server-side; never rely on FE filtering |

## Observability

| ID | Requirement |
|----|-------------|
| NFR-11-OBS-01 | `ProductService.search` emits `{ event: 'search.semantic.executed', durationMs, resultCount }` on success; `{ event: 'search.semantic.fallback', reason, durationMs }` on fallback to keyword |
| NFR-11-OBS-02 | `EmbeddingRefreshWorker` emits `{ event: 'embedding.refresh.success', productId, durationMs }` and `{ event: 'embedding.refresh.failed', productId, error, attempt }` |
| NFR-11-OBS-03 | OrderService.startReturn emits `{ event: 'order.return_requested', orderId, userId }` (no reason content — may contain PII-adjacent material) |
| NFR-11-OBS-04 | Tracing: `product.search` and `order.return_start` get OTel spans with `agent`, `tool`, `usedFallback` (where applicable) attributes |
| NFR-11-OBS-05 | Metric counters: `search_total{path="semantic"|"keyword"|"fallback"}`, `embedding_refresh_total{result="success"|"failed"|"dead_letter"}` |

## Maintainability

| ID | Requirement |
|----|-------------|
| NFR-11-MAINT-01 | Unit test line coverage ≥ 75% for `ProductService` (extended), `EmbeddingService`, `EmbeddingRefreshWorker`, `OrderService` (extended return + tracking methods) |
| NFR-11-MAINT-02 | `EmbeddingRefreshWorker` ≥ 4 unit tests; `EmbeddingService` ≥ 3 unit tests |
| NFR-11-MAINT-03 | ProductAgent shopper-mode tools (`product_search`, `product_compare`) ≥ 4 unit tests in addition to existing UoW-07 tests |
| NFR-11-MAINT-04 | OrderAgent shopper-mode tools (`order_get_tracking`, `order_start_return`) ≥ 4 unit tests in addition to existing UoW-08 tests |
| NFR-11-MAINT-05 | New widget `<ProductComparison>` and replaced `<TrackingWidget>` each ≥ 6 component tests |
| NFR-11-MAINT-06 | Migration scripts must be reversible (down migration provided where possible) |

## Usability

| ID | Requirement |
|----|-------------|
| NFR-11-USA-01 | Clarifying-question latency: when agent decides to ask one clarifying question (BR-11-04), the question text streams within 800 ms p95 (no tool call required = direct LLM text) |
| NFR-11-USA-02 | `<ProductComparison>` renders without overflow on 320px viewport (mobile-first); horizontal scroll allowed on >320px content |
| NFR-11-USA-03 | `<TrackingWidget>` empty-state copy: "Tracking will appear here once your order ships." |

## Accessibility (extension: WCAG 2.2 Level A only)

| ID | Requirement |
|----|-------------|
| NFR-11-A11Y-01 | `<ProductComparison>` uses `<table>` with `<th scope="col">` and `<th scope="row">` — programmatic structure for screen readers |
| NFR-11-A11Y-02 | Differing-attribute cells in `<ProductComparison>` use BOTH visual highlight AND a non-color signal (visible "differs" label or icon with text alt) |
| NFR-11-A11Y-03 | Product images in comparison have `alt` text — falls back to product title when no description |
| NFR-11-A11Y-04 | `<TrackingWidget>` events list uses `<ol>` (semantic ordering); status badge has `aria-label` mirroring visible text |
| NFR-11-A11Y-05 | Empty states use `role="status"` (live region) so they're announced when widgets update |

## AI/ML (extension: AI/ML Lifecycle)

| ID | Requirement |
|----|-------------|
| NFR-11-AIML-01 | ProductAgent prompt re-versioned to `product-agent.v1.1.0.txt` (added shopper-mode instructions). OrderAgent prompt re-versioned to `order-agent.v1.1.0.txt` (added tracking + return tools). PromptLoaderService VERSIONS map updated. |
| NFR-11-AIML-02 | Eval suite extended: ProductAgent gains ≥ 4 new shopper cases (search-happy, ambiguous-query-clarification, fallback-keyword, compare-cap). OrderAgent gains ≥ 4 new shopper cases (track-by-id, track-no-id-recent, track-other-user-denial, return-flow). |
| NFR-11-AIML-03 | Hallucination guardrail: agent MUST NOT invent products/orders not present in tool results. Eval includes one adversarial case ("show me the BlueDot Pro X9000" — product doesn't exist) → expected response is "I couldn't find that" not a fabricated card. |
| NFR-11-AIML-04 | Cross-user RAG bleed prevention: if shopper asks about another user's order ID, response is the canonical "I don't see that order under your account" (NFR-AIML-05 alignment) — verified by adversarial eval case. |
| NFR-11-AIML-05 | Fallback rate observability: in production, `search.semantic.fallback / search.semantic.executed` ratio < 5% over a 7-day window — alarm if exceeded |
| NFR-11-AIML-06 | Eval pass rate ≥ 0.95 on golden set (existing rule from prior UoWs); adversarial cases must achieve 100% pass |
| NFR-11-AIML-07 | Embedding source text MUST NOT contain PII (BR-11-18) — automated test asserts no email/phone-shaped strings in `buildTextBlob` output |

## PBT (extension: Property-Based Testing — partial)

| ID | Requirement | Scope |
|----|-------------|-------|
| NFR-11-PBT-01 | `product_comparison` schema round-trip — arbitrary valid payloads pass AJV; missing/extra fields fail | FE |
| NFR-11-PBT-02 | `tracking_widget` schema round-trip (tightened schema) — arbitrary valid payloads pass; unknown status enum fails | FE |
| NFR-11-PBT-03 | `EmbeddingRefreshWorker.buildTextBlob` deterministic — same Product input always yields same blob | BE pure function |
| NFR-11-PBT-04 | `OrderService.buildTrackingEvents` invariant — for any Order, events are sorted by timestamp ascending; only matching-status events appear | BE pure function |
| NFR-11-PBT-05 | `ProductService.buildComparisonAttributes` invariant — for any 2-3 products, the `differingAttributes` set is symmetric (a differs from b iff b differs from a) | BE pure function |
| NFR-11-PBT-06 | `VALID_ORDER_TRANSITIONS` extended — `delivered → return_requested` is the only edge from `delivered` introduced by UoW-11; refunded and cancelled remain terminal | BE constants |

---

## Tech Stack Constraints (handed to Stage 11)

- **OpenAI SDK**: already present (UoW-04/06) — used for embeddings via `openai.embeddings.create({ model: 'text-embedding-3-small', input })`
- **pgvector**: extension already enabled in datasource
- **Migration tool**: Prisma migrate (UoW-03 baseline) — UoW-11 adds 2 new migrations
- **No new packages**: confirmed greenfield-zero-package; reuses existing infra
- **Index strategy**: `ivfflat lists=100` for vectors, `gin` for tsvector — both established by UoW-11 migration

---

## NFR-to-Story Traceability

| Story | NFRs |
|-------|------|
| SH-02 (NL search) | PERF-01..04, SCAL-01..03, RELI-01, SEC-02, SEC-03, SEC-06, OBS-01, MAINT-01..03, USA-01, AIML-01..03, AIML-05..07, PBT-03, PBT-05 |
| SH-03 (compare) | PERF-05, MAINT-03, MAINT-05, USA-02, A11Y-01..03, AIML-01, PBT-01, PBT-05 |
| SH-09 (track) | PERF-06, RELI-05, SEC-01, MAINT-04, MAINT-05, USA-03, A11Y-04, A11Y-05, AIML-04, PBT-02, PBT-04 |
| SH-10 (return) | PERF-07, RELI-03, SEC-01, SEC-05, OBS-03, MAINT-04, AIML-02, PBT-06 |
| Cross-cutting | OBS-02, OBS-04, OBS-05, MAINT-06, AIML-01, AIML-02 |

---

**Total NFRs**: 38 across 9 categories.

# Code Review Report — UoW-11 (Semantic Search + Tracking + Returns)

**Generated at**: 2026-05-06T10:46:00Z
**Reviewer**: Claude Opus 4.7 (1M context)
**Stories in scope**: SH-02 (NL search), SH-03 (compare), SH-09 (track), SH-10 (return)

---

## Synthesized Verdict Block

| Check | Result | Detail |
|-------|--------|--------|
| **Check 1 — Lint** | ✅ Pass | 0 errors, 0 warnings, 0 format violations across BE Node + FE web within UoW-11 scope (2 pre-existing parser errors on vitest config files unrelated) |
| **Check 2 — Security (SAST + deps)** | ✅ Pass | 0 SAST findings; UoW-11 added 0 packages; `npm audit --production` 0 vulns both stacks; all 3 raw-SQL sites verified parameterized; all user-scoped reads enforce ownership filter; all 15 Security Baseline rules Compliant; all 8 AI/ML rules Compliant |
| **Check 3 — Tests** | ✅ Pass | 265/265 API + 168/168 web; 91 new tests; embedding subsystem 98.46% lines coverage; product/order agents ≥86% lines; 0 regressions; all 8 eval cases pass |
| **Check 4 — AI Review** | ⚠️ Concerns | 0 Reject; 2 Concerns: C-01 `$executeRaw` for vector ops bypasses Prisma typed safety; C-02 cold-reindex burst could hit OpenAI rate limits |

---

## Verdict: **PROCEED with caveats**

**Rationale**: All four mechanical checks pass. The two Concerns flagged in the AI Review are documented design trade-offs explicitly endorsed in the Stack Selection and NFR Design docs (raw-SQL encapsulation as the only path to vector ops without adding a new dep; rate-limit handling via existing AbortController + cursor-stays-on-failure machinery). The pod must explicitly accept these caveats at countersign.

---

## Concerns Detail (for pod review)

### C-01 — `$executeRaw` / `$queryRaw` for vector ops bypasses Prisma typed safety

- **File**: `api/src/orchestrator/agents/product/product-search-index.service.ts`
- **Behavior**: All three methods (`upsert`, `searchByVector`, `searchByKeyword`) use raw-SQL tagged templates because Prisma has no first-class `vector` type. Vector literals are interpolated as `[${embedding.join(',')}]::vector` (where `embedding: number[]` makes injection structurally impossible), and all other values are bound parameters.
- **Trade-off**: The alternative (`pgvector-node` adapter with Prisma) would add a new dependency, contradicting the Stack Selection decision of brownfield-zero-package. Encapsulation in a single dedicated service contains the blast radius.
- **Mitigation**: Security Report → Raw SQL Injection Audit verified each call site; explicit unit tests cover vector-roundtrip and filter-bind paths; integration tests exercise the index against a real Postgres in Build & Test.
- **Decision needed**: Accept as the documented design choice, or open a follow-up ticket to evaluate `pgvector-node` once adapter stability is confirmed.

### C-02 — Cold-reindex burst on bulk product creation could hit OpenAI rate limits

- **File**: `api/src/orchestrator/embedding/embedding-refresh.worker.ts`
- **Behavior**: Worker processes BATCH_SIZE=25 every 2s. A merchant `product_bulk_create` of N products produces N outbox events; ~1000 products → 80s + 1000 OpenAI calls (~$0.04). Within MVP cost budget but bursts could 429.
- **Trade-off**: A token-bucket pre-throttler would smooth bursts but adds complexity. Current design relies on the existing AbortController + cursor-stays-on-failure pattern: a 429 surfaces as `embedding.call.failed`, cursor doesn't advance, message is redelivered next tick.
- **Mitigation**: Structured `embedding.call.failed` log event with status code provides operational signal; UoW-03 dead-letter machinery handles 3-strikes; worth flagging for Build & Test load test (1000-product synthetic burst).
- **Decision needed**: Accept the back-pressure-via-retry approach, or add a token-bucket throttler before Build & Test.

---

## Files Reviewed

- **New (24)**: 2 migrations, EmbeddingService + EmbeddingRefreshWorker + EmbeddingModule + ProductSearchIndexService, 2 prompt v1.1.0 files, 9 test files (BE), 5 web files (1 schema + 1 component + 3 test files), 4 BE PBT/extension test files
- **Modified (14)**: ProductService, OrderService, product.tools, order.tools, ProductAgent, OrderAgent, prompt-loader.service, orchestrator.module, schema.prisma, product.service.spec, order-status-transition.pbt.spec, product-agent.eval, order-agent.eval, WidgetRenderer, tracking_widget.schema.json, web/widget-schemas/index.ts, TrackingWidget (replaced)

---

## Reports Index

- `UoW-11-lint-report.md`
- `UoW-11-security-report.md`
- `UoW-11-test-report.md`
- `UoW-11-ai-review.md`

---

## Next Step

Awaiting Gate #4 pod countersignature in `UoW-11-code-review-signoff.md`.

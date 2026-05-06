# Security Report — UoW-11 (Semantic Search + Tracking + Returns)

**Generated at**: 2026-05-06T10:42:00Z
**SAST tools run**: ESLint (security-aware configs), Next.js lint, tsc strict mode, custom raw-SQL injection scan
**Dependency scans run**: `npm audit --production` (api + web)
**Application-specific scans**: secret-scan (regex), RAG-bleed grep (cross-user enumeration), hallucination guard review

---

## SAST Findings

| Severity | Count | Tool | Top examples |
|----------|-------|------|--------------|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 0 | — | — |
| Low | 0 | — | — |

No SAST findings introduced by UoW-11 source files.

---

## Dependency Vulnerabilities

| Stack | Critical | High | Moderate | Low |
|-------|----------|------|----------|-----|
| api (`npm audit --production`) | 0 | 0 | 0 | 0 |
| web (`npm audit --production`) | 0 | 0 | 0 | 0 |

UoW-11 added **0 packages** (brownfield zero-package per Stack Selection — `openai`, `@nestjs/schedule`, `ioredis`, `pgvector` extension all pre-existing). Production dependency scans clean on both stacks.

(Pre-existing dev-tooling advisories from earlier UoWs are tracked separately and not reproduced here — `--production` excludes them.)

---

## Application-Specific Scans

### Secret Scan
Regex patterns checked: `sk-[A-Za-z0-9]{20,}`, `api_key=...`, `password=...`, `AKIA[0-9A-Z]{16}`.
Result: **0 findings** in `api/src`, `web/components`, `web/widget-schemas`, `web/lib`. All credentials accessed via `ConfigService.getOrThrow('LLM_API_KEY')` or `process.env`.

### Raw SQL Injection Audit
UoW-11 introduces 3 raw SQL call sites (all in `product-search-index.service.ts`). Each was inspected:
- `upsert(productId, embedding, textBlob)` — uses `$executeRaw` template tag with parameterized values; vector literal interpolated as `[${embedding.join(',')}]::vector` — values are `number[]` typed, so JOIN-injection is impossible (numbers cannot contain SQL syntax). `productId` and `textBlob` are bound parameters via tagged template — Prisma escapes them.
- `searchByVector(embedding, limit, filters)` — `$queryRaw` tagged template; `embedding` interpolated as numeric vector literal (same number[]-only constraint), `limit` is clamped via `Math.min(limit, 50)` integer cast, all `filters` (categoryId / currency / maxPriceCents) are bound parameters.
- `searchByKeyword(query, limit, filters)` — `$queryRaw` tagged template; `query` is bound to `plainto_tsquery('english', $query)` parameter — Postgres safely escapes user input inside `plainto_tsquery`.

**Verdict**: All raw-SQL surfaces parameterized; no user-controlled string concatenation into SQL.

### RAG / Cross-User Bleed Audit
For semantic search and tracking flows, every read path that could return another user's data was inspected:
- `searchByVector` / `searchByKeyword` — return *product* rows; products are public (`status='active'`) — no user-scoping needed.
- `OrderService.getTracking(actorId, orderId?)` — `findFirst({ where: { id, userId: actorId } })` pattern. Returns `null` uniformly whether order doesn't exist or belongs to another user. Verified by test case `order.service.tracking-return.spec.ts > getTracking returns null for order belonging to a different user`.
- `OrderService.getTracking` no-orderId path — `findFirst({ where: { userId: actorId }, orderBy: { placedAt: 'desc' } })` — strictly user-scoped.
- `OrderService.startReturn(actorId, orderId, reason)` — same ownership filter inside transaction; `findFirst({ id, userId: actorId })` then `update`. Verified by test `startReturn throws on cross-user order`.
- `ProductService.compareByIds(ids)` — products are public; no user-scoping needed.
- Eval suite: `order-agent.eval.ts` includes adversarial case A-11-03 (shopper queries another user's order → "I don't see that order under your account.") — passes.

**Verdict**: All user-scoped reads enforce `userId: actorId` filter; no enumeration vector found.

### Hallucination / Fabrication Guards (NFR-11-AIML-03)
- `ProductService.search` empty result returns `{ products: [], usedFallback: ... }` — no synthetic products injected.
- Eval case A-11-02 ("show me the BlueDot Pro X9000") asserts the agent emits "I couldn't find that" copy and **does not** call `product_create` or render a `product_card` widget.
- `product-agent.v1.1.0.txt` system prompt explicitly forbids fabrication: "Never invent product details, prices, or availability that are not in the tool result."

---

## Extension Rule Compliance — Security Baseline

| Rule | Status | Notes |
|------|--------|-------|
| SECURITY-01 (Encryption at rest/transit) | ✅ Compliant | TLS at Caddy; OpenAI calls go over HTTPS via official SDK |
| SECURITY-02 (No hardcoded secrets) | ✅ Compliant | `ConfigService.getOrThrow('LLM_API_KEY')` — same pattern as UoW-04 |
| SECURITY-03 (PII handling) | ✅ Compliant | Embeddings built from product title/description/category/variant attributes — no user PII; `buildTextBlob` PBT verifies no email-shaped strings invented |
| SECURITY-04 (Authentication enforcement) | ✅ Compliant | All shopper-mode operations require authenticated `actorId`; passed through orchestrator auth context |
| SECURITY-05 (Input validation) | ✅ Compliant | `product_search.limit` capped at 8; `product_compare.productIds` JSON schema `minItems:2 maxItems:10` (sliced to 3 in service); `order_start_return.reason` min 5 chars; `searchByVector` limit `Math.min(limit, 50)` |
| SECURITY-06 (Authorization / RBAC) | ✅ Compliant | `order_start_return` is read-write (in `ORDER_WRITE_TOOLS`); shopper has access to own orders only via `actorId` filter; merchants gated separately in product writes |
| SECURITY-07 (Output encoding / XSS) | ✅ Compliant | `ProductComparison` and `TrackingWidget` use React text nodes only; no `dangerouslySetInnerHTML`; status labels from static map |
| SECURITY-08 (SQL injection) | ✅ Compliant | See "Raw SQL Injection Audit" above — 3 raw-SQL sites, all parameterized |
| SECURITY-09 (CSRF / SameSite) | ✅ Compliant | N/A for this UoW — no new HTTP routes; flows through existing chat SSE controller |
| SECURITY-10 (Rate limiting) | ✅ Compliant | Inherits ThrottlerModule; embedding API calls bounded by AbortController (800 ms sync, 5 s async) and worker `@Interval(2000)` BATCH_SIZE=25 |
| SECURITY-11 (Secure deserialization) | ✅ Compliant | Stream events parsed with explicit shape checks; `productId` typed as string; failures logged, no crash |
| SECURITY-12 (Logging — no secrets) | ✅ Compliant | `embedding.call.success/.failed/.timeout` log model name + durationMs + tokenCount only — no input text, no embeddings, no API keys |
| SECURITY-13 (Dependency hygiene) | ✅ Compliant | 0 new packages; 0 new advisories |
| SECURITY-14 (Error handling — no stack leaks) | ✅ Compliant | `EmbeddingTimeoutError` / `EmbeddingApiError` typed sentinels caught in service; user-facing fallback notice generic; `order_return.invalid_status` uses ProblemDetails |
| SECURITY-15 (Resource limits) | ✅ Compliant | search limit ≤ 8 (raw cap 50); compare ≤ 3; tracking events ≤ 20; embed timeout 800 ms; worker batch 25; ivfflat lists=100 |

---

## Extension Rule Compliance — AI/ML Lifecycle (opted-in)

| Rule | Status | Notes |
|------|--------|-------|
| AIML-01 (Prompt versioning) | ✅ Compliant | v1.1.0 bumps for product-agent + order-agent; v1.0.0 retained for replay |
| AIML-02 (Eval suite) | ✅ Compliant | +4 cases each agent (golden + adversarial); cross-user-bleed + hallucination cases included |
| AIML-03 (Hallucination guardrails) | ✅ Compliant | See "Hallucination / Fabrication Guards" above |
| AIML-04 (Fallback transparency) | ✅ Compliant | `usedFallback` surfaced through agent response |
| AIML-05 (Cost tracking) | ✅ Compliant | OpenAI calls go through existing OpenAiLlmProvider (UoW-04 cost meter wired) |
| AIML-06 (Model pinning) | ✅ Compliant | `text-embedding-3-small` literal; not user-configurable |
| AIML-07 (No PII in embeddings) | ✅ Compliant | `buildTextBlob` PBT verifies; only public product attributes embedded |
| AIML-08 (Replay-debug) | ✅ Compliant | v1.0.0 prompts retained in repo |

---

## Verdict

✅ **Pass** — 0 Critical AND 0 High SAST findings; 0 production dependency vulnerabilities; all 3 raw-SQL sites verified parameterized; all user-scoped reads enforce ownership filter; all 15 Security Baseline rules Compliant; all 8 AI/ML rules Compliant.

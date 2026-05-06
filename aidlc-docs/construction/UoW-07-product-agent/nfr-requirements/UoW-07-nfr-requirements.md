# NFR Requirements — UoW-07 (Product Agent + Product Tools)

**UoW**: UoW-07 — Product Agent + Product Tools (merchant mode first)  
**Tier**: Greenfield (Comprehensive)  
**Generated at**: 2026-05-05T16:25:00Z  
**Stacks in scope**: BE Node.js + FE + Agent

---

## Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-07-PERF-01 | ProductAgent first-token streaming latency | < 1.5 s p95 | OTel span `agent.product.first_token_ms` |
| NFR-07-PERF-02 | Message → product_edit_preview widget fully rendered | < 3.0 s p95 | OTel span `turn.widget_emit_ms` |
| NFR-07-PERF-03 | `product_search` tool response time | < 500 ms p95 | OTel span `tool.product_search_ms` |
| NFR-07-PERF-04 | `product_bulk_create` 50 products end-to-end | < 5 s total | OTel span `tool.product_bulk_create_ms` |
| NFR-07-PERF-05 | ProductAgent tool-calling loop hard limit | ≤ 5 iterations per turn | Enforced in agent; counter in OTel attribute |

*Inherits global targets: NFR-PERF-01 (first-token < 1.5 s), NFR-PERF-02 (widget < 3.0 s).*

---

## Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-07-SCAL-01 | ProductAgent is stateless — no in-memory state persisted between turns | Verified by design (all state in conversation context) |
| NFR-07-SCAL-02 | Bulk create uses a single DB transaction per item, not N batch queries | No N+1 pattern; batch attempted sequentially within 5 s budget |
| NFR-07-SCAL-03 | ProductService methods are horizontally scalable (no instance-local locks) | Stateless service; DB is the authority |

---

## Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-07-AVAIL-01 | Product read operations degrade gracefully when LLM is unavailable | Returns structured error event; never crashes SSE stream |
| NFR-07-AVAIL-02 | Bulk create: LLM unavailable blocks preview generation; partial list displayed with error | Agent surfaces "LLM unavailable" text event; no silent failure |

*Global availability SLO 99.9% (NFR-AVAIL-01) inherited — no changes required.*

---

## Security

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-07-SEC-01 | Write tools (`product_create`, `product_update`, `product_archive`, `product_bulk_create`, `product_update_stock`) restricted to role = merchant \| admin | Enforced in ProductAgent before tool dispatch | BR-PROD-10 |
| NFR-07-SEC-02 | Every successful write emits an AuditLog row with actor, action, entity, diff | Verified by AuditLog check in service tests | BR-PROD-09, NFR-SEC-04 |
| NFR-07-SEC-03 | `product.archive` added to DESTRUCTIVE_INTENTS — confirmation_prompt required | Enforced by OrchestratorService confirmation protocol | FR-ORCH-04 |
| NFR-07-SEC-04 | Bulk product lines are NOT logged in full (may contain merchant pricing strategy) | Only title + validation result logged; full payload never in logs | NFR-AIML-06 |
| NFR-07-SEC-05 | SKU auto-generation does not leak sequential IDs (uses slug + random suffix) | Slug + 4-char hex suffix | NFR-SEC-01 |
| NFR-07-SEC-06 | User-supplied product descriptions pass through to LLM — prompt injection defense | System prompt explicitly instructs model to ignore format-breaking attempts; NFR-AIML-08 | NFR-AIML-08 |

---

## Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-07-REL-01 | `product_bulk_create` is partial-success — individual failures do not roll back successes | Each item committed independently; successes + failures returned to agent | BR-PROD-08 |
| NFR-07-REL-02 | SKU collision auto-retry up to 5 attempts before surface error | Implemented in ProductService; logged at warn level | BR-PROD-06 |
| NFR-07-REL-03 | ProductAgent handles LLM JSON parse failure without crashing | Yields `{ type: 'error' }` output; OrchestratorService surfaces error event | — |
| NFR-07-REL-04 | ProductService write operations wrapped in Prisma transactions with AuditLog | Atomicity: product + audit log both commit or both roll back | BR-PROD-09 |

---

## Observability

| ID | Requirement |
|----|-------------|
| NFR-07-OBS-01 | Each tool call emits a structured log: `{ tool, productId?, actorId, durationMs, success }` |
| NFR-07-OBS-02 | OTel child span per tool invocation; tagged `agent_name=product`, `tool=<name>` |
| NFR-07-OBS-03 | Tool iteration count per turn recorded as OTel attribute `agent.tool_iterations` |
| NFR-07-OBS-04 | Bulk create logs final summary: `{ attempted, succeeded, failed }` at info level |
| NFR-07-OBS-05 | LLM cost (tokens in/out, cost_usd) recorded per ProductAgent turn via LlmCostMeterService (inherits UoW-06) |

---

## Maintainability

| ID | Requirement |
|----|-------------|
| NFR-07-MAINT-01 | Unit test line coverage ≥ 75% for `ProductService` (tool implementations) |
| NFR-07-MAINT-02 | ProductAgent system prompt versioned as `product-agent.v1.0.0.txt`; PROMPT_VERSIONS constant updated |
| NFR-07-MAINT-03 | Tool definitions in a typed constant (`PRODUCT_TOOLS: LlmTool[]`), not inline strings in agent |
| NFR-07-MAINT-04 | Widget AJV schemas committed to `web/widget-schemas/` and imported by WidgetRenderer type guard |

---

## Usability

| ID | Requirement |
|----|-------------|
| NFR-07-USE-01 | Product preview widget renders within 3.0 s of merchant's confirm message (NFR-07-PERF-02) |
| NFR-07-USE-02 | Conversational field collection: agent asks at most one clarifying question per interaction turn |
| NFR-07-USE-03 | Bulk preview shows line-level status (valid ✓ / invalid ✗) so merchant can identify errors at a glance |

---

## AI/ML Quality

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-07-AIML-01 | ProductAgent system prompt version-controlled: `product-agent.v1.0.0.txt`; version pinned in `PROMPT_VERSIONS` | NFR-AIML-01 |
| NFR-07-AIML-02 | Eval suite committed before Gate #4: 5 golden-path cases (add, update, bulk, archive, query) + 3 adversarial (prompt injection, invalid price, archived product update) | NFR-AIML-02 |
| NFR-07-AIML-03 | Agent cites Product ID in any factual claim ("Updated product ID: `abc-123`") — no confabulation | NFR-AIML-03 |
| NFR-07-AIML-04 | Tool-calling loop hard limit: 5 iterations per turn; exceeding limit yields error event | NFR-AIML-04 derived |
| NFR-07-AIML-05 | PII redaction (`redactPii()`) applied to merchant message before LLM call | NFR-AIML-06 (inherited from UoW-06) |
| NFR-07-AIML-06 | LLM tool-call response validated against `LlmToolCall` schema before dispatch to ProductService | NFR-AIML-02 |
| NFR-07-AIML-07 | Product description content passed to LLM in system-role context, not user-role, to reduce injection surface | NFR-AIML-08 |

---

## Property-Based Testing

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-07-PBT-01 | `product_edit_preview` widget: `parse(serialize(x)) == x` round-trip property test | NFR-PBT-02 |
| NFR-07-PBT-02 | `bulk_product_preview` widget: round-trip property test (50-item max, valid/invalid counts sum to total) | NFR-PBT-02 |
| NFR-07-PBT-03 | Price parser: for any valid price string (₹N, $N, "N rupees") parsed priceCents > 0 and ≤ 9_999_999 | NFR-PBT-03 derived |
| NFR-07-PBT-04 | Bulk-line parser: `parsedCount ≤ inputLineCount` and `parsedCount ≤ 50` for all inputs | NFR-PBT-02 |

---

## Accessibility (WCAG 2.2 Level A)

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-07-A11Y-01 | ProductEditPreview Confirm and "Edit more" buttons keyboard-operable (no mouse-only interaction) | NFR-A11Y-01 |
| NFR-07-A11Y-02 | DiffBadge uses `<del>` / `<ins>` semantic elements for screen-reader diff announcements | NFR-A11Y-03 |
| NFR-07-A11Y-03 | BulkProductPreview invalid-row indicator uses icon + text label — not color alone | NFR-A11Y-06 |
| NFR-07-A11Y-04 | Confirm action in bulk preview announced as `aria-live="assertive"` (destructive / irreversible action) | NFR-A11Y-03 |

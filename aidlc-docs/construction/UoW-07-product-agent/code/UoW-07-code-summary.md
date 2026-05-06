# Code Summary — UoW-07 (Product Agent + Product Tools)

**Stage**: 12 — Code Generation  
**Completed at**: 2026-05-05T16:45:00Z  
**Total tests**: 113 API (21 files) + 61 web (10 files) — all passing  
**tsc**: 0 errors (api + web)  
**ESLint**: 0 warnings or errors  

---

## Files Created / Modified

### Backend (NestJS)

| File | Status | Notes |
|------|--------|-------|
| `api/src/orchestrator/types/orchestrator.types.ts` | MODIFIED | Added `LlmTool`, `LlmToolCall` interfaces; `tools?` on `LlmParams` |
| `api/src/orchestrator/agents/product/product.tools.ts` | NEW | `PRODUCT_TOOLS: LlmTool[]` (8 tools) + `WRITE_TOOLS` Set |
| `api/src/orchestrator/agents/product/product.service.ts` | NEW | `ProductService` — search, getById, listCategories, create, update, updateStock, archive, bulkCreate; all writes in `$transaction` with `AuditLogService` |
| `api/src/orchestrator/prompts/product-agent.v1.0.0.txt` | NEW | System prompt with tool-use instructions, conversational guidance, prompt injection defense |
| `api/src/orchestrator/agents/product/product.agent.ts` | NEW | `ProductAgent implements IAgent` — agentic loop (max 5 iterations), tool dispatch, widget emission, role guard (403 for shopper), loop-limit error (500) |
| `api/src/orchestrator/agents/product/evals/product-agent.eval.ts` | NEW | 8 eval cases (5 golden + 3 adversarial) per NFR-07-AIML-02 |
| `api/src/orchestrator/confirmation/destructive-intents.const.ts` | MODIFIED | Added `'product.archive'` |
| `api/src/orchestrator/agents/agent-registry.ts` | MODIFIED | Added `'product'` → `ProductAgent` entry |
| `api/src/orchestrator/prompts/prompt-loader.service.ts` | MODIFIED | Added `'product-agent': '1.0.0'` to `PROMPT_VERSIONS` |
| `api/src/orchestrator/orchestrator.module.ts` | MODIFIED | Added `ProductAgent`, `ProductService` as providers |

### Backend Tests

| File | Tests | Coverage |
|------|-------|---------|
| `api/src/orchestrator/agents/product/tests/product.service.spec.ts` | 8 | search, listCategories, create/$transaction, update guards, archive guard, bulkCreate partial-success, getById |
| `api/src/orchestrator/agents/product/tests/product.agent.spec.ts` | 5 | text output, product_create → widget, shopper blocked (403), loop limit (500), bulk_product_preview widget |
| `api/src/orchestrator/agents/product/tests/product-price-parser.pbt.spec.ts` | 5 (PBT) | Valid range, ≤0 fails, >9999999 fails, non-integer fails, rupee×100 conversion (NFR-07-PBT-03) |
| `api/src/orchestrator/agents/product/tests/product-bulk-parser.pbt.spec.ts` | 5 (PBT) | Parsed ≤ input, parsed ≤ 50 cap, skipped=0 for ≤50, empty=0, all non-whitespace counted (NFR-07-PBT-04) |

### Frontend (Next.js)

| File | Status | Notes |
|------|--------|-------|
| `web/widget-schemas/product_edit_preview.schema.json` | UPDATED | Full schema with mode, product, diff, missingFields, confirmAction, editMoreAction |
| `web/widget-schemas/bulk_product_preview.schema.json` | NEW | Schema with validCount, invalidCount, products[], confirmAction, cancelAction |
| `web/widget-schemas/index.ts` | MODIFIED | Added `bulk_product_preview` import + AJV compilation |
| `web/lib/types/chat.types.ts` | MODIFIED | Added `WidgetIntent` interface; added `bulk_product_preview` to `WidgetType` union |
| `web/components/widgets/DiffBadge.tsx` | NEW | `<del>` / `<ins>` semantic diff display |
| `web/components/widgets/ProductFieldRow.tsx` | NEW | Label + value + optional DiffBadge + isMissing support |
| `web/components/widgets/ProductEditPreview.tsx` | REPLACED STUB | Full implementation — fields, diff badges, confirm/edit-more buttons, missing notice |
| `web/components/widgets/BulkProductRow.tsx` | NEW | Single product row with valid/invalid indicator and error badge |
| `web/components/widgets/BulkProductPreview.tsx` | NEW | Summary header, scrollable product rows, confirm/cancel buttons |
| `web/components/widgets/WidgetRenderer.tsx` | MODIFIED | Added `bulk_product_preview` registry entry |

### Frontend Tests

| File | Tests | Coverage |
|------|-------|---------|
| `web/tests/product-edit-preview.spec.tsx` | 6 | Renders title, formatted price (₹), confirm intent, edit-more intent, missing notice, diff badges |
| `web/tests/bulk-product-preview.spec.tsx` | 5 | Summary counts, rows, error indicator, confirm intent, cancel intent |
| `web/tests/product-widget-schemas.pbt.spec.ts` | 12 (PBT) | product_edit_preview: valid pass, missing mode/product/confirmAction fail, bad price fails, extra prop fails; bulk_product_preview: valid pass, missing required fields fail, >50 products fails (NFR-07-PBT-01/02) |

---

## Test Summary

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| API (Vitest) | 21 | 113 | ✓ All pass |
| Web (Vitest) | 10 | 61 | ✓ All pass |

---

## Story Traceability

| FR | Implemented by |
|----|----------------|
| FR-AGT-PROD-01 (create conversationally) | ProductAgent + product_create tool + ProductEditPreview widget |
| FR-AGT-PROD-03 (update any field) | product_update + product_update_stock tools |
| FR-AGT-PROD-04 (archive) | product_archive tool + DESTRUCTIVE_INTENTS |
| FR-AGT-PROD-05 (bulk add paste) | product_bulk_create tool + BulkProductPreview widget |
| MR-02 (add product conversationally) | ProductAgent conversational flow + ProductEditPreview |
| MR-03 (update product) | product_update tool + diff-highlighted ProductEditPreview |
| MR-04 (bulk add paste) | product_bulk_create + BulkProductPreview partial-success |

---

## Notable Decisions

- `llm.complete()` (not `streamCompletion`) used for tool-calling turns — structured JSON responses require full content
- `$transaction` wraps all writes for atomicity; `AuditLogService.insert` called within the same transaction
- SKU auto-generated via 5-attempt slug+hex4 retry loop using `productVariant.findUnique`
- `fast-check` added to `web/devDependencies` for schema PBT tests
- `WidgetIntent` type added to `chat.types.ts`; `bulk_product_preview` added to `WidgetType` union

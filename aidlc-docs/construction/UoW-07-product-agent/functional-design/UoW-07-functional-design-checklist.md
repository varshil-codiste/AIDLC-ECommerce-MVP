# Functional Design Checklist — UoW-07 (Product Agent + Product Tools)

**Date**: 2026-05-05  
**Tier**: Greenfield (Comprehensive)

---

- [x] Every entity in `domain-entities.md` has fields, constraints, and relationships
  - Product: 10 fields with types, nullability, and constraints documented
  - ProductVariant: 7 fields documented
  - Category: 6 fields documented
  - ProductAgentState and ProductDraft in-memory concepts documented

- [x] Every business rule has BR-ID, statement, enforcement points, error code, user-facing copy
  - BR-PROD-01 through BR-PROD-10 (10 rules)

- [x] Every workflow has a state machine / sequence diagram + text alternative
  - Workflow 1: Add Product (MR-02) — ASCII state flow + text alternative
  - Workflow 2: Update Product (MR-03) — ASCII state flow + text alternative
  - Workflow 3: Bulk Add (MR-04) — ASCII state flow + text alternative
  - Workflow 4: Archive Product (FR-AGT-PROD-04) — ASCII state flow + text alternative
  - ProductAgent agentic loop (tool-calling pattern) documented
  - ProductAgent state machine documented

- [x] FE in scope: every interactive element has a `data-testid`
  - ProductEditPreview: 9 data-testids documented
  - BulkProductPreview: 5+ data-testids documented
  - DiffBadge: 2 data-testids documented
  - ProductFieldRow: 1 data-testid pattern documented

- [x] AI/ML extension rules addressed
  - ProductAgent system prompt will be versioned (product-agent.v1.0.0.txt)
  - Tool-calling loop has hard limit (max 5 iterations per turn)
  - LLM output parsed with schema validation before widget emission
  - No PII in tool results beyond what merchant explicitly provided

- [x] Accessibility rules addressed (Level A)
  - Confirm/cancel buttons will have descriptive aria-labels
  - DiffBadge uses semantic markup (del/ins elements) for screen reader support
  - BulkProductRow error badges will have role="alert" if dynamically inserted

- [x] No new DB schemas required — existing Product/ProductVariant/Category models sufficient
- [x] Tool catalogue defined (8 tools)
- [x] Widget JSON schemas defined for `product_edit_preview` and `bulk_product_preview`
- [x] `product.archive` added to DESTRUCTIVE_INTENTS (extends UoW-06 confirmation protocol)

# Business Logic Model — UoW-07 (Product Agent + Product Tools)

---

## Agent Tool Catalogue

The `ProductAgent` exposes the following tools to the LLM:

| Tool | Permission | Description |
|------|-----------|-------------|
| `product_search` | Both | Full-text + filter search (title, category, status) |
| `product_get` | Both | Get single product + variants by ID or title |
| `product_list_categories` | Both | List all categories (id, name) |
| `product_create` | Merchant/Admin | Create product + default variant |
| `product_update` | Merchant/Admin | Patch any product field |
| `product_update_stock` | Merchant/Admin | Update variant stock quantity |
| `product_archive` | Merchant/Admin | Soft-delete (status = 'archived') |
| `product_bulk_create` | Merchant/Admin | Create up to 50 products in one operation |

---

## Workflow 1: Add Product Conversationally (MR-02, FR-AGT-PROD-01)

```
Merchant: "Add a product: Linen Shirt, ₹45, 100 in stock"
                    │
                    ▼
         ProductAgent receives turn
         Extracts: title="Linen Shirt", price=4500, stock=100
         Missing: description, category
                    │
         ┌──────────▼──────────┐
         │ Ask for description  │ ← one clarifying question per missing required field
         └──────────┬──────────┘
                    │  Merchant: "A light cotton summer shirt"
                    ▼
         All required fields collected
         Agent calls product_list_categories → offers category or skips
                    │
                    ▼
         Emits: product_edit_preview widget (mode="create")
                    │
         ┌──────────┴──────────┐
         │                     │
   Merchant: "Confirm"   Merchant: "Edit more"
         │                     │
         ▼                     ▼
  product.confirm_create   Agent asks: "Which field?"
  intent fires             Re-enters extraction loop
         │
         ▼
  ProductService.create()
  AuditLog entry
  Agent: "✓ Linen Shirt added successfully."
```

**Text alternative**: Merchant says "Add a product". Agent extracts known fields from the message, identifies missing required fields (description, category), asks one clarifying question at a time. When all required fields are present, agent emits a `product_edit_preview` widget with a Confirm and "Edit more" action. On confirm intent, ProductAgent calls `product_create` tool, ProductService writes to DB, audit log is written. Agent confirms success with a text response.

---

## Workflow 2: Update Product (MR-03, FR-AGT-PROD-03)

```
Merchant: "Change the Linen Shirt price to ₹50"
                    │
                    ▼
         ProductAgent: product_search("Linen Shirt")
         → resolves to product ID
                    │
         Checks status ≠ 'archived' (BR-PROD-05)
                    │
                    ▼
         Emits: product_edit_preview widget
                mode="update"
                diff=[{ field:"priceCents", from:4500, to:5000 }]
                    │
         Merchant confirms
                    │
                    ▼
         ProductService.update({ priceCents: 5000 })
         AuditLog entry (diff recorded)
         Agent: "✓ Price updated to ₹50."
```

**Text alternative**: Merchant describes a change. Agent resolves the product name to an ID via `product_search`, checks the product is not archived, builds a diff, emits `product_edit_preview` in update mode showing the before/after. On confirm, calls `product_update` tool.

---

## Workflow 3: Bulk Add via Conversational Paste (MR-04, FR-AGT-PROD-05)

```
Merchant pastes:
  "Blue Mug, ₹200, 50 in stock
   Red Mug, ₹220, 30 in stock
   ..."
                    │
                    ▼
         ProductAgent: parses each line
         Validates each entry (BR-PROD-01..04)
         Checks count ≤ 50 (BR-PROD-07)
                    │
         For ambiguous entries, asks ONE clarifying question
         (e.g. "Line 3 has no price — should I skip it or ask for each?")
                    │
                    ▼
         Emits: bulk_product_preview widget
                validCount, invalidCount, per-line status
                    │
         Merchant confirms
                    │
                    ▼
         ProductService.bulkCreate(lines)
         Each attempted independently (BR-PROD-08)
         AuditLog entry per created product
                    │
                    ▼
         Agent: "49 products added. 1 failed: 'Widget XL' — price was missing."
```

**Text alternative**: Merchant pastes a newline-separated list. Agent parses each line, validates each entry, asks at most one clarifying question for ambiguities. Renders `bulk_product_preview` showing valid/invalid counts and per-item status. On confirm, calls `product_bulk_create` tool. Returns partial-success summary.

---

## Workflow 4: Archive Product (FR-AGT-PROD-04)

```
Merchant: "Archive the Linen Shirt"
                    │
                    ▼
         ProductAgent: product_search("Linen Shirt") → ID
         Checks not already archived
                    │
                    ▼
         Since archiving is destructive, OrchestratorService intercepts
         and emits confirmation_prompt (DESTRUCTIVE_INTENTS includes "product.archive")
                    │
         Merchant confirms
                    │
                    ▼
         ProductService.archive(id) — sets status='archived'
         AuditLog entry
         Agent: "✓ Linen Shirt has been archived."
```

**Text alternative**: Archive is a destructive operation. The orchestrator's confirmation protocol (established in UoW-06) intercepts the `product.archive` intent before the agent acts, rendering a `confirmation_prompt`. On confirm, ProductService sets `status='archived'`.

---

## ProductAgent Agentic Loop (Tool-Calling Pattern)

```
AgentInput received
        │
        ▼
  Build LLM prompt:
  system_prompt + tool_definitions + prior_context + user_message
        │
        ▼
  LLM.complete() → response
        │
   ┌────┴────┐
   │         │
 text     tool_call
   │         │
   ▼         ▼
 yield     execute tool via ProductService
 text       collect result
 output      │
             ▼
        add tool result to context
        loop back to LLM
        (max 5 tool-call iterations per turn)
             │
             ▼ (LLM returns text or widget instruction)
        yield widget or text output
```

**Max tool iterations per turn**: 5 (prevents runaway loops; hard limit enforced in agent)

---

## ProductAgent State Machine

```
IDLE
  │ ← merchant message with product intent
  ▼
EXTRACTING_FIELDS
  │ ← all required fields present
  ▼
AWAITING_CONFIRMATION  ← emits product_edit_preview / bulk_product_preview
  │                       (confirmation.cancel → back to IDLE)
  │ ← confirmation.confirm
  ▼
PERSISTING
  │ ← success
  ▼
IDLE (success response)
  │ ← failure
  ▼
ERROR (surfaces error text, returns to IDLE)
```

Text alternative: Agent starts idle. When a product-related message arrives, it enters EXTRACTING_FIELDS state, gathering required fields through LLM tool calls. When all required fields are present, it moves to AWAITING_CONFIRMATION by emitting a preview widget. On confirm intent it moves to PERSISTING; on success it returns to IDLE with a confirmation message; on failure it surfaces the error and returns to IDLE.

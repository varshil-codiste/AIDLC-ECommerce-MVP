# Frontend Components — UoW-07 (Product Agent + Product Tools)

**Scope**: Two new widget components + their AJV JSON schemas.  
**Stack**: Next.js 15 App Router, TypeScript, Tailwind CSS.  
**Pattern**: Follows the widget rendering pattern established in UoW-05 (WidgetRenderer dispatch).

---

## Component Tree

```
WidgetRenderer (existing — UoW-05)
├── ProductEditPreview         ← NEW
│   ├── ProductFieldRow        ← NEW (reusable field display)
│   ├── DiffBadge              ← NEW (shows "was ₹45 → now ₹50")
│   ├── MissingFieldNotice     ← NEW (highlights optional missing fields)
│   └── WidgetActionBar (existing pattern)
│       ├── ConfirmButton
│       └── EditMoreButton
└── BulkProductPreview         ← NEW
    ├── BulkSummaryHeader      ← NEW (valid N / invalid M)
    ├── BulkProductRow         ← NEW (per-product line with status)
    │   └── RowErrorBadge      ← NEW
    └── WidgetActionBar (existing pattern)
        ├── ConfirmButton
        └── CancelButton
```

---

## Components

### ProductEditPreview

| Prop | Type | Notes |
|------|------|-------|
| data | `ProductEditPreviewData` | Widget payload |
| onIntent | `(intent: WidgetIntent) => void` | Fires confirm or editMore intent |

**State**: none (stateless display component)  
**data-testid**:
- `product-edit-preview-root`
- `product-edit-preview-title`
- `product-edit-preview-price`
- `product-edit-preview-stock`
- `product-edit-preview-description`
- `product-edit-preview-category`
- `product-edit-preview-confirm-btn`
- `product-edit-preview-edit-more-btn`
- `product-edit-preview-diff-{field}` (per diff entry)
- `product-edit-preview-missing-notice`

### ProductFieldRow

| Prop | Type | Notes |
|------|------|-------|
| label | string | e.g. "Price" |
| value | string | Formatted display value |
| diff | `{ from: string; to: string }?` | If present, renders DiffBadge |
| isMissing | boolean | Renders muted placeholder if true |

**data-testid**: `product-field-row-{label-slug}`

### DiffBadge

| Prop | Type | Notes |
|------|------|-------|
| from | string | Previous value (struck through) |
| to | string | New value (highlighted) |

**data-testid**: `diff-badge-from`, `diff-badge-to`

### BulkProductPreview

| Prop | Type | Notes |
|------|------|-------|
| data | `BulkProductPreviewData` | Widget payload |
| onIntent | `(intent: WidgetIntent) => void` | Fires confirm or cancel intent |

**State**: none  
**data-testid**:
- `bulk-product-preview-root`
- `bulk-product-preview-summary` (e.g. "49 valid · 1 invalid")
- `bulk-product-preview-confirm-btn`
- `bulk-product-preview-cancel-btn`
- `bulk-product-row-{index}`
- `bulk-product-row-{index}-error`

### BulkProductRow

| Prop | Type | Notes |
|------|------|-------|
| index | number | Row number |
| title | string | |
| priceCents | number \| null | |
| stock | number \| null | |
| errors | string[] | Empty = valid |

**data-testid**: `bulk-product-row-{index}`, `bulk-product-row-{index}-error-{code}`

---

## Widget JSON Schemas

### product_edit_preview

```json
{
  "type": "object",
  "required": ["type", "data"],
  "properties": {
    "type": { "type": "string", "const": "product_edit_preview" },
    "data": {
      "type": "object",
      "required": ["product", "mode", "confirmAction"],
      "properties": {
        "mode": { "type": "string", "enum": ["create", "update"] },
        "product": {
          "type": "object",
          "required": ["title", "priceCents", "stock"],
          "properties": {
            "id": { "type": "string" },
            "title": { "type": "string" },
            "priceCents": { "type": "integer", "minimum": 1 },
            "currency": { "type": "string" },
            "stock": { "type": "integer", "minimum": 0 },
            "description": { "type": "string" },
            "categoryId": { "type": "string" },
            "imageUrls": { "type": "array", "items": { "type": "string" } }
          }
        },
        "diff": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["field", "from", "to"],
            "properties": {
              "field": { "type": "string" },
              "from": {},
              "to": {}
            }
          }
        },
        "missingFields": { "type": "array", "items": { "type": "string" } },
        "confirmAction": {
          "type": "object",
          "required": ["intent"],
          "properties": { "intent": { "type": "string" } }
        },
        "editMoreAction": {
          "type": "object",
          "required": ["intent"],
          "properties": { "intent": { "type": "string" } }
        }
      }
    }
  }
}
```

### bulk_product_preview

```json
{
  "type": "object",
  "required": ["type", "data"],
  "properties": {
    "type": { "type": "string", "const": "bulk_product_preview" },
    "data": {
      "type": "object",
      "required": ["products", "validCount", "invalidCount", "confirmAction"],
      "properties": {
        "validCount": { "type": "integer", "minimum": 0 },
        "invalidCount": { "type": "integer", "minimum": 0 },
        "products": {
          "type": "array",
          "maxItems": 50,
          "items": {
            "type": "object",
            "required": ["title"],
            "properties": {
              "title": { "type": "string" },
              "priceCents": { "type": ["integer", "null"] },
              "stock": { "type": ["integer", "null"] },
              "errors": { "type": "array", "items": { "type": "string" } }
            }
          }
        },
        "confirmAction": {
          "type": "object",
          "required": ["intent"],
          "properties": { "intent": { "type": "string" } }
        },
        "cancelAction": {
          "type": "object",
          "required": ["intent"],
          "properties": { "intent": { "type": "string" } }
        }
      }
    }
  }
}
```

---

## State Management

- Both widgets are **stateless display components** — no local state
- Actions dispatch intents via the existing `onIntent` callback (UoW-05 pattern)
- No new global state required

# Frontend Components — UoW-11

**Generated at**: 2026-05-05T21:40:00Z

UoW-11 adds **one new widget** (`product_comparison`) and **completes one existing stub** (`tracking_widget`). Both register with the existing WidgetRenderer from UoW-05.

---

## Component Tree

```
<ChatPage>                                   ← existing (UoW-05)
└── <MessageList>                            ← existing
    └── <WidgetRenderer>                     ← existing — registry extended
        ├── <ProductCarousel>                ← existing (UoW-07) — re-used as-is for SH-02
        ├── <ProductComparison>              ← NEW — SH-03
        ├── <TrackingWidget>                 ← REPLACED stub — SH-09
        └── <OrderCard>                      ← existing (UoW-08) — re-used for SH-10 return state
```

---

## New Component: `<ProductComparison>`

**Purpose**: Render 2–3 products side-by-side in a column-wise table. Highlight cells that differ between products.

| Aspect | Detail |
|--------|--------|
| Type | Display widget (read-only; no intents emitted) |
| Props | `data: ProductComparisonData`, `onIntent?: (intent: WidgetIntent) => void` |
| State | Stateless |

### Schema (`product_comparison.schema.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["products"],
  "properties": {
    "products": {
      "type": "array",
      "minItems": 2,
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["id", "title", "priceCents", "currency"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "priceCents": { "type": "integer", "minimum": 0 },
          "currency": { "type": "string" },
          "imageUrl": { "type": "string" },
          "categoryName": { "type": "string" },
          "attributes": {
            "type": "object",
            "additionalProperties": { "type": "string" }
          }
        },
        "additionalProperties": false
      }
    },
    "differingAttributes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Attribute keys whose values differ across products — used for cell highlighting"
    }
  },
  "additionalProperties": false
}
```

### Test IDs (team convention)

| Element | Test ID |
|---------|---------|
| Root container | `product-comparison-root` |
| Column header for product N | `product-comparison-product-{n}-header` |
| Title cell for product N | `product-comparison-product-{n}-title` |
| Price cell for product N | `product-comparison-product-{n}-price` |
| Attribute cell (product N, attribute K) | `product-comparison-product-{n}-attr-{k}` |
| Highlighted (differing) attribute row | `product-comparison-attr-{k}-row[data-differing="true"]` |

---

## Replaced Component: `<TrackingWidget>`

**Purpose**: Render an order's status timeline. Stub from UoW-05 emitted only `<div>tracking widget</div>`.

| Aspect | Detail |
|--------|--------|
| Type | Display widget |
| Props | `data: TrackingWidgetData`, `onIntent?: (intent: WidgetIntent) => void` |
| State | Stateless |

### Schema (existing — `tracking_widget.schema.json` from UoW-05)

The existing schema is loose (`additionalProperties: true`). UoW-11 will TIGHTEN it:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["orderId", "status", "events"],
  "properties": {
    "orderId": { "type": "string" },
    "status": {
      "type": "string",
      "enum": ["pending", "confirmed", "shipped", "delivered", "cancelled", "refunded", "return_requested"]
    },
    "trackingNumber": { "type": ["string", "null"] },
    "trackingCarrier": { "type": ["string", "null"] },
    "events": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "object",
        "required": ["label", "timestamp"],
        "properties": {
          "label": { "type": "string" },
          "timestamp": { "type": "string" },
          "detail": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

### Test IDs

| Element | Test ID |
|---------|---------|
| Root container | `tracking-widget-root` |
| Order ID display | `tracking-widget-order-id` |
| Current status badge | `tracking-widget-status` |
| Carrier + tracking number row | `tracking-widget-carrier` |
| Event N label | `tracking-widget-event-{n}-label` |
| Event N timestamp | `tracking-widget-event-{n}-timestamp` |
| Empty-events fallback | `tracking-widget-empty` |

---

## Re-used Components (no change)

| Component | Used by | Notes |
|-----------|---------|-------|
| `<ProductCarousel>` | SH-02 search results | Already implemented in UoW-07; max 8 items per existing schema cap (BR-11-01) |
| `<OrderCard>` | SH-10 return confirmation | Renders `status: 'return_requested'`; agent passes `cancelAction: null, refundAction: null` per BR-11-16 — the existing component already hides buttons when those props are absent |
| `<MessageList>` clarifying-question text bubble | SH-02 ambiguous-query response, SH-10 reason prompt | Plain LLM text; no widget |

---

## State Management (no change)

- Local state: `useState` for any in-component UI flags
- Server state: SSE-driven via existing chat reducer (UoW-05)
- Routing: App Router (existing)

---

## Accessibility (Level A — extension enabled)

- `<ProductComparison>`:
  - `<table>` with `<th scope="col">` headers for each product column
  - `<th scope="row">` for each attribute row
  - Alt text on product images (use `title` if no description provided)
  - Differing-attribute highlight uses both color AND a visible label ("differs") — color alone is not the only signal
- `<TrackingWidget>`:
  - `<ol>` for the events list (semantic ordering)
  - Status badge has `aria-label` mirroring the visible text
  - Empty-state message has `role="status"`

---

## WidgetRenderer Registry Update

Two entries added in `web/components/widgets/WidgetRenderer.tsx`:

```typescript
import { ProductComparison } from './ProductComparison';
import { TrackingWidget } from './TrackingWidget';

const REGISTRY = {
  // ...existing...
  product_comparison: ProductComparison,  // NEW
  tracking_widget: TrackingWidget,         // REPLACED
};
```

---

## Out of Scope (FE)

- Animated transitions on the `product_comparison` table (CSS `transition` only — keep MVP minimal)
- Drag-to-rearrange columns (use natural order from agent)
- "Add to cart" CTA on comparison cells (deferred to UoW-10 cart flow)
- Live tracking polling for shipped orders — `tracking_widget` is a static snapshot

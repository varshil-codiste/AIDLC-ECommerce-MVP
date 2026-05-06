# Logical Components — UoW-12 (Confirmation Widgets + Accessibility Level A)

**Stage**: 10 — NFR Design
**UoW**: UoW-12-confirmation-widgets-a11y
**Generated at**: 2026-05-06T12:25:00Z

---

## Component LC-12-01: ProductCard Widget

**Purpose**: Display a single product (image, title, price, stock badge) with an Add-to-cart CTA
**Type**: Pure display React component — receives all data via `data` prop
**NFR coverage**: NFR-12-PERF-01, NFR-12-SEC-03, NFR-A11Y-05, NFR-A11Y-06, NFR-A11Y-08, NFR-12-RELI-01, NFR-12-RELI-02
**Inputs**: `{ title, priceCents, currency, imageUrl?, stock?, variantId? }`
**Outputs**: `onIntent({ intent: 'cart.add', variantId })` when "Add to cart" clicked
**Schema**: `product_card.schema.json` (updated — priceCents + currency; additionalProperties: false)

---

## Component LC-12-02: ProductCarousel Widget

**Purpose**: Horizontal scrollable list of product preview cards for browsing
**Type**: Pure display React component — list of products in `data.products`
**NFR coverage**: NFR-12-PERF-02, NFR-12-SEC-04, NFR-A11Y-05, NFR-A11Y-06, NFR-12-RELI-01, NFR-12-SCAL-01
**Inputs**: `{ products: [{ productId, title, priceCents, currency, imageUrl? }] }`
**Outputs**: `onIntent({ intent: 'product.view', productId })` when item clicked
**Schema**: `product_carousel.schema.json` (no change required — was not one of the 3 inconsistencies)

---

## Component LC-12-03: DashboardDigest Widget

**Purpose**: 4-tile KPI dashboard for merchant overview (orders, revenue, stock alerts, new customers)
**Type**: Pure display React component — renders 4 labeled metric tiles
**NFR coverage**: NFR-12-PERF-03, NFR-12-RELI-01, NFR-12-RELI-03, BR-12-09
**Inputs**: `{ metrics: { ordersToday, revenueTodayCents, lowStockAlerts, newCustomersToday } }`
**Outputs**: no user interactions (display-only)
**Formatting**: `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` applied to `revenueTodayCents / 100`
**Schema**: `dashboard_digest.schema.json` (updated — metrics wrapper + field renames; additionalProperties: false)

---

## Component LC-12-04: ConfirmationPrompt Widget

**Purpose**: Destructive-action confirmation dialog with configurable message and Confirm/Cancel buttons
**Type**: Pure display React component — imperative intent emission on click
**NFR coverage**: NFR-12-PERF-04, NFR-12-SEC-02, NFR-A11Y-03, NFR-A11Y-04, NFR-12-RELI-04, BR-12-01, BR-12-02, BR-12-06
**Inputs**: `{ message, confirmLabel?, cancelLabel?, confirmIntent, cancelIntent? }`
**Outputs**:
- Confirm click: `onIntent(data.confirmIntent)`
- Cancel click: `onIntent(data.cancelIntent ?? { intent: 'confirmation.cancel' })`
**ARIA**: `aria-live="assertive"` on root div
**Schema**: `confirmation_prompt.schema.json` (updated — confirmIntent/cancelIntent as objects; additionalProperties: false)

---

## Component LC-12-05: Updated Schema Files (3 files)

**Purpose**: Fix schema inconsistencies between BE emitter data shapes and JSON schema definitions
**Type**: Static JSON schema files (consumed by AJV in WidgetRenderer)
**NFR coverage**: NFR-12-SEC-01, NFR-12-RELI-03, NFR-12-PBT-01 through PBT-03

| Schema file | Change |
|-------------|--------|
| `product_card.schema.json` | Replace `priceUsd: number` with `priceCents: integer (≥0)` + `currency: string`; add `variantId: string` (optional); `additionalProperties: false` |
| `dashboard_digest.schema.json` | Add `metrics` object wrapper; rename fields to `ordersToday`, `revenueTodayCents`, `lowStockAlerts`, `newCustomersToday`; `additionalProperties: false` |
| `confirmation_prompt.schema.json` | Change `confirmIntent` from `string` to `object (additionalProperties: true)`; change `cancelIntent` from `string` to `object (additionalProperties: true)`; `additionalProperties: false` at root |

---

## Component LC-12-06: Accessibility Audit Pass (21 widget files)

**Purpose**: Systematic Level A compliance sweep across all delivered widget components
**Type**: Code modification pass — not a runtime component
**NFR coverage**: NFR-A11Y-01 through NFR-A11Y-08
**Scope**: All 21 widget `.tsx` files in `web/components/widgets/`

| Widget file | Expected a11y fix |
|-------------|-------------------|
| CartSummary.tsx | Add `aria-label` to qty +/− buttons; verify `focus:ring-2` on all buttons |
| ProductCard.tsx | `alt={data.title}` on image; `focus:ring-2` on Add-to-cart button; stock badge text label |
| ProductCarousel.tsx | `alt={item.title}` on item images; `focus:ring-2` on item click targets |
| DashboardDigest.tsx | No interactive elements; add `aria-live="polite"` on root for updates |
| ConfirmationPrompt.tsx | `aria-live="assertive"` on root (from stub); `focus:ring-2` on both buttons |
| All other 16 widgets | Audit: missing `alt` text, missing `aria-label`, missing `focus:ring-2`, `div`-as-button usage |

**Total logical components**: 6

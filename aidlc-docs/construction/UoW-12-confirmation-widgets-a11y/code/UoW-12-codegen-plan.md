# Code Generation Plan — UoW-12 (Confirmation Widgets + Accessibility Level A)

**Stage**: 12 — Code Generation
**UoW**: UoW-12-confirmation-widgets-a11y
**Generated at**: 2026-05-06T12:35:00Z
**Files to create/modify**: 21 total (4 widget impls + 4 schema fixes + 7 widget a11y patches + 3 new test files + 3 PBT test files)

---

## Part 1: Schema Fixes (3 schemas + 1 tighten)

### Step 1 — Fix `product_card.schema.json`
- Replace `priceUsd: number` → `priceCents: integer (≥0)` + `currency: string`
- Add `variantId: string` (optional)
- Change `stockCount` → `stock` (matches functional design)
- Set `additionalProperties: false`
- Remove old `priceUsd` field entirely

### Step 2 — Fix `dashboard_digest.schema.json`
- Add `metrics` object wrapper with required fields
- Rename fields: `ordersToday`, `revenueTodayCents`, `lowStockAlerts`, `newCustomersToday`
- Remove flat fields that matched old BE shape
- Set `additionalProperties: false` at root and inside `metrics`

### Step 3 — Fix `confirmation_prompt.schema.json`
- Change `confirmIntent` from `string` → `object (additionalProperties: true)` (required)
- Change `cancelIntent` from `string` → `object (additionalProperties: true)` (optional)
- Set `additionalProperties: false` at root

### Step 4 — Tighten `product_carousel.schema.json`
- Add typed `items` array with required fields: `productId`, `title`, `priceCents`, `currency`; optional `imageUrl`
- Set `additionalProperties: false` at root and item level

---

## Part 2: Widget Implementations (4 stubs replaced)

### Step 5 — Implement `ProductCard.tsx`
- Props: `data: Record<string, unknown>`, `onIntent?: (intent: WidgetIntent) => void`
- Cast data to typed interface `ProductCardData`
- Render: image (if present, `<Image alt={title}`), title, formatted price (`priceCents / 100`, INR), stock badge (text + color), Add-to-cart button (if `variantId` present)
- Empty state: return `null` if no data
- data-testids: `product-card-root`, `product-card-title`, `product-card-price`, `product-card-image`, `product-card-stock`, `product-card-add-btn`
- Accessibility: `focus:ring-2`, `alt={title}`, stock badge text label (not color-only)

### Step 6 — Implement `ProductCarousel.tsx`
- Props: `data: Record<string, unknown>`, `onIntent?: (intent: WidgetIntent) => void`
- Cast data to `ProductCarouselData { products: ProductPreview[] }`
- Render: horizontal scrollable list (`overflow-x-auto flex gap-3`)
- Each item: card with image + title + price; click emits `{ intent: 'product.view', productId }`
- Empty state: nothing rendered if `products` empty
- data-testids: `product-carousel-root`, `product-carousel-item-{n}`, `product-carousel-item-{n}-title`
- Accessibility: `alt={item.title}`, `focus:ring-2` on item buttons

### Step 7 — Implement `DashboardDigest.tsx`
- Props: `data: Record<string, unknown>` (no onIntent — display only)
- Cast data to `DashboardDigestData { metrics: { ordersToday, revenueTodayCents, lowStockAlerts, newCustomersToday } }`
- Render: 2×2 grid of KPI tiles; revenue formatted with Intl.NumberFormat (INR, paise÷100)
- data-testids: `dashboard-digest-root`, `dashboard-digest-orders`, `dashboard-digest-revenue`, `dashboard-digest-low-stock`, `dashboard-digest-new-customers`
- Accessibility: `aria-live="polite"` on root

### Step 8 — Implement `ConfirmationPrompt.tsx`
- Props: `data: Record<string, unknown>`, `onIntent?: (intent: WidgetIntent) => void`
- Cast data to `ConfirmationPromptData { message, confirmLabel?, cancelLabel?, confirmIntent, cancelIntent? }`
- Render: message text, Confirm button, Cancel button
- Confirm click: `onIntent(data.confirmIntent as WidgetIntent)`
- Cancel click: `onIntent((data.cancelIntent as WidgetIntent) ?? { intent: 'confirmation.cancel' })`
- Preserve `aria-live="assertive"` on root div
- data-testids: `confirmation-prompt-root`, `confirmation-prompt-message`, `confirmation-prompt-confirm-btn`, `confirmation-prompt-cancel-btn`
- Accessibility: `focus:ring-2` on both buttons

---

## Part 3: Accessibility Audit (existing 17 widgets)

### Step 9 — Read and audit all non-stub widgets
Widgets to audit (stubs already replaced above; audit only fully-implemented widgets):
- CartSummary.tsx (already a11y-complete — verify)
- PaymentWidget.tsx (already a11y-complete — verify)
- AttentionSummary.tsx
- BulkProductPreview.tsx
- CustomerCard.tsx
- NotificationInbox.tsx
- OrderCard.tsx
- OrderList.tsx
- OrderStatusUpdate.tsx
- ProductComparison.tsx
- ProductEditPreview.tsx
- TrackingWidget.tsx

### Step 10 — Apply accessibility fixes
For each widget with issues:
- Add `aria-label` to icon-only buttons (qty steppers, close buttons)
- Add `alt` to any `<Image>` missing meaningful alt
- Add `focus:ring-2 focus:ring-offset-2 focus:outline-none` to interactive elements
- Add `aria-live="polite"` to streaming content regions
- Replace any `div`-as-button with `<button>`

---

## Part 4: Tests

### Step 11 — `web/tests/product-card.spec.tsx`
6+ tests: render, no-image, no-variantId (btn hidden), add-to-cart intent, empty data, data-testids + aria

### Step 12 — `web/tests/product-carousel.spec.tsx`
6+ tests: render items, empty products, item click intent, image alt text, data-testids

### Step 13 — `web/tests/dashboard-digest.spec.tsx`
6+ tests: render 4 tiles, revenue format INR, zero values, data-testids, aria-live

### Step 14 — `web/tests/confirmation-prompt.spec.tsx`
6+ tests: render, confirm click, cancel click, cancel default intent, aria-live, data-testids

### Step 15 — `web/tests/product-card-schema.pbt.spec.ts`
PBT: valid shape validates, priceUsd rejected, missing required fields fail, additionalProperties fail

### Step 16 — `web/tests/dashboard-digest-schema.pbt.spec.ts`
PBT: valid nested metrics validates, flat shape fails, missing metrics fails, extra root props fail

### Step 17 — `web/tests/confirmation-prompt-schema.pbt.spec.ts`
PBT: valid object confirmIntent validates, string confirmIntent fails, missing message fails, extra root props fail

---

## File Count Summary

| Category | Files |
|----------|-------|
| Schema fixes | 4 (product_card, dashboard_digest, confirmation_prompt, product_carousel) |
| Widget implementations | 4 (ProductCard, ProductCarousel, DashboardDigest, ConfirmationPrompt) |
| Accessibility patches | up to 12 existing widgets (patches only where issues found) |
| Component test files | 4 |
| PBT schema test files | 3 |
| **Total new/modified** | **15–27** (depending on a11y audit results) |

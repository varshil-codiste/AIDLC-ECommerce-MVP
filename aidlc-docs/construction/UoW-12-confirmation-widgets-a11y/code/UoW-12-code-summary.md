# Code Generation Summary — UoW-12 (Confirmation Widgets + Accessibility Level A)

**Stage**: 12 — Code Generation Part 2
**UoW**: UoW-12-confirmation-widgets-a11y
**Generated at**: 2026-05-06T12:50:00Z

---

## Files Created / Modified

### Schema Fixes (4 files)
| File | Change |
|------|--------|
| `web/widget-schemas/product_card.schema.json` | Replaced `priceUsd` → `priceCents + currency`; renamed `stockCount` → `stock`; added optional `variantId`; `additionalProperties: false` |
| `web/widget-schemas/dashboard_digest.schema.json` | Added `metrics` object wrapper; renamed fields to `ordersToday`, `revenueTodayCents`, `lowStockAlerts`, `newCustomersToday`; `additionalProperties: false` at root and nested |
| `web/widget-schemas/confirmation_prompt.schema.json` | Changed `confirmIntent` + `cancelIntent` from `string` → `object`; `additionalProperties: false` at root |
| `web/widget-schemas/product_carousel.schema.json` | Replaced opaque array with typed items (`productId`, `title`, `priceCents`, `currency`, optional `imageUrl`); `additionalProperties: false` |

### Widget Implementations (4 files)
| File | Stub Replaced | Key features |
|------|--------------|-------------|
| `web/components/widgets/ProductCard.tsx` | UoW-07 stub | Image with alt, formatted price (INR), stock badge (text+color), Add-to-cart button (hidden if no variantId), null if no data |
| `web/components/widgets/ProductCarousel.tsx` | UoW-11 stub | Horizontal scroll list, item click → `product.view` intent, image alt, focus:ring on items |
| `web/components/widgets/DashboardDigest.tsx` | UoW-06 stub | 4 KPI tiles, Intl.NumberFormat INR for revenue (paise÷100), aria-live=polite on root |
| `web/components/widgets/ConfirmationPrompt.tsx` | UoW-12 stub | aria-live=assertive preserved, confirmIntent object pass-through, cancelIntent fallback, focus:ring on buttons |

### Accessibility Fixes — Existing Widgets (6 files)
| File | Fix applied |
|------|------------|
| `web/components/widgets/CartSummary.tsx` | Added `focus:ring-2 focus:ring-offset-2 focus:outline-none` to qty +/−, Checkout, and Clear buttons |
| `web/components/widgets/PaymentWidget.tsx` | Added `focus:ring-2 focus:ring-offset-2 focus:outline-none` to Pay button |
| `web/components/widgets/CustomerCard.tsx` | Added `focus:ring-2 focus:ring-offset-1` to "View details" button |
| `web/components/widgets/NotificationInbox.tsx` | Added `focus:ring-2 focus:ring-offset-1 rounded` to "Mark all read" button |
| `web/components/widgets/OrderCard.tsx` | Added `focus:ring-2 focus:ring-offset-1` to Cancel and Refund buttons |
| `web/components/widgets/OrderList.tsx` | Added `focus:ring-2 focus:ring-offset-1` to bulk action buttons |

### Test Files (8 files)
| File | Tests |
|------|-------|
| `web/tests/product-card.spec.tsx` | 10 (render, image alt, btn visibility, intent emission, stock badges, empty state, a11y class) |
| `web/tests/product-carousel.spec.tsx` | 7 (render, empty, item click, alt text, focus:ring, query label) |
| `web/tests/dashboard-digest.spec.tsx` | 7 (render, revenue INR, zero values, 4 tiles, aria-live) |
| `web/tests/confirmation-prompt.spec.tsx` | 8 (render, message, labels, defaults, confirm/cancel intent, aria-live, focus:ring) |
| `web/tests/product-card-schema.pbt.spec.ts` | 6 (valid pass, priceUsd rejected, missing required, negative, extra prop) |
| `web/tests/dashboard-digest-schema.pbt.spec.ts` | 6 (valid pass, flat shape rejected, missing metrics, missing field, extra root, extra metrics field) |
| `web/tests/confirmation-prompt-schema.pbt.spec.ts` | 6 (valid pass, string confirmIntent rejected, missing message/confirmIntent, string cancelIntent, extra prop) |
| `web/tests/widget-renderer.spec.tsx` | Updated 2 tests to use new schema shapes (ProductCard title check; confirmation_prompt with object intent) |

---

## Build Results

| Stack | Command | Result |
|-------|---------|--------|
| Web TypeScript | `npx tsc --noEmit` (web/) | ✅ 0 errors |

---

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| Web — UoW-12 new (50 new tests) | 50 | ✅ PASS |
| Web — regression (all prior UoWs) | 200 | ✅ PASS |
| **Total web** | **250** | **✅ PASS** |

**Regressions**: 0 (2 widget-renderer tests updated to new schema; 0 broken)

---

## NFR Coverage

| NFR | Status |
|-----|--------|
| NFR-A11Y-01: Keyboard operability | ✅ `<button>` tags used; no div-as-button |
| NFR-A11Y-02: aria-label on icon-only buttons | ✅ CartSummary qty buttons already had aria-label |
| NFR-A11Y-03: aria-live=polite on content regions | ✅ DashboardDigest root; BulkProductPreview summary (pre-existing) |
| NFR-A11Y-04: aria-live=assertive on ConfirmationPrompt | ✅ Preserved from stub |
| NFR-A11Y-05: Meaningful alt on images | ✅ ProductCard `alt={title}`, ProductCarousel `alt={item.title}` |
| NFR-A11Y-06: Focus rings | ✅ All 4 new widgets + 6 patched existing widgets |
| NFR-A11Y-07: No div-as-button | ✅ All interactive elements are `<button>` or `<a>` |
| NFR-A11Y-08: Color not sole indicator | ✅ ProductCard stock badge: text label + color |
| NFR-12-PBT-01..03 | ✅ 18 PBT tests across 3 schemas |
| BR-12-01 ConfirmationPrompt before destructive op | ✅ Widget implemented; CartAgent gate in UoW-10 |
| BR-12-02 Cancel = no state change | ✅ Cancel emits cancelIntent only |
| BR-12-03 ProductCard Add-to-cart hidden if no variantId | ✅ Button gated on `d.variantId` |
| BR-12-09 DashboardDigest revenue as INR | ✅ Intl.NumberFormat (INR, paise÷100) |
| BR-12-10 ProductCard emits cart.add + variantId | ✅ onClick emits `{ intent: 'cart.add', variantId }` |

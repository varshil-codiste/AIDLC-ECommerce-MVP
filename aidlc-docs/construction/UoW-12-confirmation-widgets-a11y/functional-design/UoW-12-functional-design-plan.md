# Functional Design Plan — UoW-12

**Stage**: 8 — Functional Design
**Unit**: UoW-12-confirmation-widgets-a11y
**Stories**: MR-13 (confirmation prompt), CC-01 (Accessibility Level A)
**Cross-cutting**: ProductCard, ProductCarousel, DashboardDigest widget replacements; schema alignment
**Generated at**: 2026-05-06T12:15:00Z

---

## Scope Summary

UoW-12 is the final UoW. It:
1. Replaces 4 remaining widget stubs (ProductCard, ProductCarousel, DashboardDigest, ConfirmationPrompt)
2. Fixes 3 schema inconsistencies (Q1=A)
3. Adds accessibility Level A across all 21 widgets (Q3=A)
4. No new BE agents, no new DB models, no new packages

---

## Business Rules

| ID | Rule |
|----|------|
| BR-12-01 | ConfirmationPrompt must render before any destructive operation (MR-13) |
| BR-12-02 | Confirmation "Cancel" must result in no state change |
| BR-12-03 | ProductCard "Add to cart" button is hidden when no variantId is present |
| BR-12-04 | Every interactive element must be keyboard-operable (Tab/Enter/Space) — CC-01 |
| BR-12-05 | Every image must have a meaningful alt attribute — CC-01 |
| BR-12-06 | aria-live=assertive is required on ConfirmationPrompt — CC-01 |
| BR-12-07 | aria-live=polite is required on streaming message regions — CC-01 |
| BR-12-08 | Widget schemas must match actual BE emitter data shapes |
| BR-12-09 | DashboardDigest revenue is formatted as INR currency (cents ÷ 100) |
| BR-12-10 | ProductCard emits cart.add intent with variantId on button click |

---

## Widget Functional Specifications

### ProductCard
- Shows: product image (optional), title, formatted price (priceCents + currency), stock badge (optional), Add to cart button (if variantId present)
- Add to cart: emit `{ intent: 'cart.add', variantId }`
- Empty state: if no product data, show nothing
- data-testids: `product-card-root`, `product-card-title`, `product-card-price`, `product-card-image`, `product-card-stock`, `product-card-add-btn`

### ProductCarousel
- Shows: scrollable horizontal list of product preview cards (title + price + image)
- Each item clickable: emit `{ intent: 'product.view', productId }` (passive — no cart action here)
- data-testids: `product-carousel-root`, `product-carousel-item-{n}`, `product-carousel-item-{n}-title`

### DashboardDigest
- Shows: 4 KPI tiles — Orders Today, Revenue Today (formatted), Low Stock Alerts, New Customers (24h)
- BE shape: `{ metrics: { ordersToday, revenueTodayCents, lowStockAlerts, newCustomersToday } }`
- Revenue formatted with Intl.NumberFormat (INR, cents ÷ 100)
- data-testids: `dashboard-digest-root`, `dashboard-digest-orders`, `dashboard-digest-revenue`, `dashboard-digest-low-stock`, `dashboard-digest-new-customers`

### ConfirmationPrompt
- Shows: message, Confirm button, Cancel button (with configurable labels)
- Confirm: emit the `confirmIntent` object (passed as-is from widget data)
- Cancel: emit the `cancelIntent` object (or `{ intent: 'confirmation.cancel' }` if not provided)
- aria-live=assertive on root (already in stub — preserve)
- data-testids: `confirmation-prompt-root`, `confirmation-prompt-message`, `confirmation-prompt-confirm-btn`, `confirmation-prompt-cancel-btn`

---

## Schema Changes (Q1=A — fix all three)

| Schema | Change |
|--------|--------|
| `product_card.schema.json` | Replace `priceUsd` → `priceCents + currency`; add `variantId` as required when present; `additionalProperties: false` |
| `dashboard_digest.schema.json` | Add `metrics` object wrapper; rename fields to match BE; `additionalProperties: false` |
| `confirmation_prompt.schema.json` | Change `confirmIntent` from `string` to `object`; update `cancelIntent` to `object`; `additionalProperties: false` |

---

## Accessibility Level A Audit Plan (CC-01, Q3=A)

All 21 widget files audited for:

| Check | NFR | Fix action |
|-------|-----|-----------|
| Alt text on all images | NFR-A11Y-04 | Add meaningful `alt` to all `<Image>` elements |
| Icon-only buttons have `aria-label` | NFR-A11Y-01 | Add `aria-label` to qty stepper +/− buttons |
| `aria-live=polite` on widget content regions | NFR-A11Y-03 | Add to streaming areas if missing |
| `aria-live=assertive` on ConfirmationPrompt | NFR-A11Y-03 | Already in stub — verify preserved |
| Focus rings visible | NFR-A11Y-01 | Tailwind `focus:ring-2 focus:ring-offset-2` on all interactive elements |
| Keyboard operability of all buttons/links | NFR-A11Y-01 | Verify onClick handlers work with Enter; no `div` used as button |
| Color not sole signal | NFR-A11Y-06 | Add text labels alongside color indicators |
| Page title + lang in layout | NFR-A11Y-08 | Already verified in UoW-01 smoke test |

---

## Checklist

- [x] Q1 answered: fix all three schema inconsistencies (A)
- [x] Q2 answered: ProductCard includes Add to cart button (A)
- [x] Q3 answered: full accessibility audit across all 21 widgets (A)
- [x] Q4 answered: DashboardDigest uses Intl.NumberFormat for revenue (A)
- [x] Business rules documented (10 BRs)
- [x] Widget specs documented (4 widgets)
- [x] Schema changes identified (3 schemas)
- [x] Accessibility audit plan documented

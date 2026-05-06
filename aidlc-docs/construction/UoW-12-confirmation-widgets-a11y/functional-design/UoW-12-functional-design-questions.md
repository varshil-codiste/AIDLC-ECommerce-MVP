# Functional Design Questions — UoW-12

**Stage**: 8 — Functional Design
**Unit**: UoW-12-confirmation-widgets-a11y
**Generated at**: 2026-05-06T12:15:00Z

---

## Q1 — Schema inconsistencies: fix or preserve?

Three widget schemas have data-shape mismatches between the BE emitter and the pre-UoW-05 stub schema:

| Widget | Schema field | BE actually sends | Impact |
|--------|-------------|-------------------|--------|
| `product_card` | `priceUsd: number` | Product agent sends `priceCents + currency` (cents + INR) | Schema shows USD float; BE uses INR paise integer |
| `dashboard_digest` | Flat `ordersToday`, `revenueToday`, etc. | Nested `{ metrics: { ordersToday, revenueTodayCents, ... } }` | BE data doesn't match schema |
| `confirmation_prompt` | `confirmIntent: string` | CartAgent sends `confirmIntent: { intent, action }` (object) | Schema says string; BE sends object |

**A)** Fix all three schemas + update the BE emitters to match — tighten everything to `additionalProperties: false` and consistent field names.

**B)** Fix only `confirmation_prompt` (highest impact; it's actively used in cart flow) — leave `product_card` and `dashboard_digest` schemas loose (`additionalProperties: true`) and implement the FE widgets to handle the actual BE shape.

**C)** Preserve all three schemas exactly as-is and implement FE widgets that defensively handle both old schema fields and actual BE fields (dual-field support).

[Answer]: A

---

## Q2 — ProductCard: Add-to-cart integration

The `product_card` widget shows a single product. Should it include an "Add to cart" button?

**A)** Yes — render an "Add to cart" button that emits `{ intent: 'cart.add', variantId }` using the `variantId` from the widget data (already in schema as optional). If no `variantId` is present, hide the button.

**B)** No — ProductCard is display-only; cart actions are handled by the shopper separately (they say "add Nike Air Max to cart" in chat). Keep it as a pure display card.

[Answer]: A

---

## Q3 — Accessibility audit scope

CC-01 requires Accessibility Level A across all widgets. The audit should cover:

**A)** All 21 widget files (full sweep) — fix missing `alt` attributes, add `aria-label` to icon-only buttons, ensure focus rings are present via Tailwind `focus:ring`, add `aria-live` regions where missing, and verify keyboard operability on all interactive elements.

**B)** Only the 4 new widgets being implemented in UoW-12 — the prior widgets were shipped with CI green and are considered acceptable.

[Answer]: A

---

## Q4 — DashboardDigest display

The BE emits `revenueTodayCents` (integer, paise) inside a `metrics` object. How should the widget display revenue?

**A)** Format with `Intl.NumberFormat` (cents ÷ 100, currency INR) — same pattern as CartSummary/PaymentWidget. Show ordersToday, revenueTodayCents (formatted), lowStockAlerts, newCustomersToday.

**B)** Show raw numbers — simpler; revenue as plain integer; no currency formatting in this widget.

[Answer]: A

---

All answers received. Proceeding to functional design plan.

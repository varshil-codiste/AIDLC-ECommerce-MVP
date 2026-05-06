# NFR Requirements — UoW-12 (Confirmation Widgets + Accessibility Level A)

**Stage**: 9 — NFR Requirements
**UoW**: UoW-12-confirmation-widgets-a11y
**Tier**: Greenfield (Comprehensive)
**Generated at**: 2026-05-06T12:20:00Z
**Extensions active**: Security Baseline (15 rules), AI/ML Lifecycle, Property-Based Testing (partial), Accessibility (Level A)

---

## Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-12-PERF-01 | `ProductCard` widget initial render time | < 100 ms | Client-side React render from widget data received; no network fetch |
| NFR-12-PERF-02 | `ProductCarousel` render with ≤ 20 product items | < 150 ms | Horizontal list render; items are pre-loaded in widget data |
| NFR-12-PERF-03 | `DashboardDigest` KPI tile render (4 tiles, formatted values) | < 100 ms | Pure display; `Intl.NumberFormat` cost negligible |
| NFR-12-PERF-04 | `ConfirmationPrompt` render after widget emission | < 50 ms | Minimal DOM — message + 2 buttons only |

---

## Scalability

| ID | Requirement |
|----|-------------|
| NFR-12-SCAL-01 | `ProductCarousel` must render acceptably with up to 50 items without pagination (MVP cap); virtualization is out of scope for UoW-12. |
| NFR-12-SCAL-02 | Accessibility attributes (`aria-label`, `aria-live`, `alt`) are static strings; they impose no runtime scaling cost. |

---

## Security

| ID | Requirement |
|----|-------------|
| NFR-12-SEC-01 | All three fixed schemas (`product_card`, `dashboard_digest`, `confirmation_prompt`) must use `"additionalProperties": false` at root and nested objects — no extra properties admitted. |
| NFR-12-SEC-02 | `ConfirmationPrompt` must pass the `confirmIntent` object through as-received — no mutation, no string coercion. The widget must not reconstruct or synthesise intent objects. |
| NFR-12-SEC-03 | `ProductCard` `cart.add` intent must include only `{ intent: 'cart.add', variantId }` — no other fields injected by the widget. |
| NFR-12-SEC-04 | `ProductCarousel` item click emits only `{ intent: 'product.view', productId }` from schema-validated `productId`; no free-text injection. |

---

## Reliability

| ID | Requirement |
|----|-------------|
| NFR-12-RELI-01 | All 4 new widget components must handle missing optional fields gracefully (no runtime crash): `ProductCard` with no `imageUrl`, `stock`, or `variantId`; `ProductCarousel` with empty `products` array; `DashboardDigest` with any metric value of 0; `ConfirmationPrompt` with no `cancelIntent`. |
| NFR-12-RELI-02 | `ProductCard` renders nothing (returns `null`) when no product data is present in the widget payload — consistent with BR-12-03 empty state. |
| NFR-12-RELI-03 | Schema fixes must not break existing widget data flows — all prior emitted widget types (ordercards, cart_summary, payment_widget, etc.) remain validated correctly. |
| NFR-12-RELI-04 | `ConfirmationPrompt` Cancel button, when clicked, always emits a non-null intent: `cancelIntent` from data if present, otherwise `{ intent: 'confirmation.cancel' }`. |

---

## Observability

| ID | Requirement |
|----|-------------|
| NFR-12-OBS-01 | AJV schema validation errors for the 3 fixed schemas must be observable — existing `WidgetRenderer` error boundary logs validation failures; no new logging infrastructure needed. |
| NFR-12-OBS-02 | `ConfirmationPrompt` confirm and cancel events are surfaced as user intents through the existing SSE intent pathway — no additional instrumentation required. |

---

## Maintainability

| ID | Requirement |
|----|-------------|
| NFR-12-MAINT-01 | Each of the 4 new widget components (`ProductCard`, `ProductCarousel`, `DashboardDigest`, `ConfirmationPrompt`) must have a dedicated test file with ≥ 6 unit tests each. |
| NFR-12-MAINT-02 | Tests must cover: happy-path render, empty/missing optional fields, button click intent emission, and accessibility attributes (aria-label, aria-live, alt text presence). |
| NFR-12-MAINT-03 | No `div` elements used as buttons — interactive elements must be `<button>` tags (keyboard operability, WCAG NFR-A11Y-01). |
| NFR-12-MAINT-04 | All widget files that receive accessibility fixes must pass the existing lint configuration (no new lint suppressions added). |

---

## Usability (Accessibility Level A — CC-01)

*Primary NFR category for UoW-12. Accessibility extension is enabled (Level A only; AA-only rules are N/A).*

| ID | NFR Ref | Requirement | Target |
|----|---------|-------------|--------|
| NFR-A11Y-01 | CC-01 | All interactive elements (buttons, links) keyboard-operable via Tab/Enter/Space | 100% of interactive elements across all 21 widgets |
| NFR-A11Y-02 | CC-01 | Icon-only buttons must carry `aria-label` describing the action | CartSummary qty stepper +/− buttons; any icon-only button in existing widgets |
| NFR-A11Y-03 | CC-01 | `aria-live=polite` on all streaming/updating content regions | All widgets that update content dynamically |
| NFR-A11Y-04 | CC-01 | `aria-live=assertive` on `ConfirmationPrompt` root | `confirmation-prompt-root` div |
| NFR-A11Y-05 | CC-01 | Every `<Image>` element must have a meaningful, non-empty `alt` attribute | ProductCard image, ProductCarousel item images, any other `<Image>` across 21 widgets |
| NFR-A11Y-06 | CC-01 | Focus rings visible on all interactive elements | Tailwind `focus:ring-2 focus:ring-offset-2` on every button and link |
| NFR-A11Y-07 | CC-01 | No `div`/`span` used as interactive element — all clickable elements must be `<button>` or `<a>` | Audit all 21 widgets; replace divs-as-buttons |
| NFR-A11Y-08 | CC-01 | Color is not the sole indicator of status — text or icon label must accompany color badges | Stock badge in ProductCard: "In Stock" text + color; "Low Stock" text + color |
| NFR-A11Y-09 | CC-01 | Page `<html lang="en">` present; `<title>` present in layout | Verified in UoW-01 smoke test — confirmed N/A for UoW-12 widgets |

---

## AI/ML Quality

*No new LLM agents in UoW-12. AI/ML extension rules are N/A for this UoW.*

| ID | Requirement |
|----|-------------|
| NFR-12-AIML-01 | N/A — UoW-12 introduces no new agents, no new prompt files, no new LLM tool calls. Existing agent prompt versions unchanged. |

---

## Property-Based Testing (PBT extension — partial)

| ID | Scope | Invariants |
|----|-------|-----------|
| NFR-12-PBT-01 | `product_card` JSON schema round-trip | Valid `{ priceCents, currency, title }` payloads always validate; `priceUsd` field rejected (removed); negative `priceCents` fails; missing required fields fail; extra properties at root fail |
| NFR-12-PBT-02 | `dashboard_digest` JSON schema round-trip | Valid nested `{ metrics: { ordersToday, revenueTodayCents, lowStockAlerts, newCustomersToday } }` validates; flat field shape (pre-fix) fails; extra root-level properties fail; negative metric values fail |
| NFR-12-PBT-03 | `confirmation_prompt` JSON schema round-trip | `confirmIntent` as object validates; `confirmIntent` as string fails (post-fix); missing `message` fails; `cancelIntent` as string fails; additional root properties fail |

**Total NFRs**: 28 across 8 categories (AI/ML: 1 N/A entry; Accessibility: 9 requirements = primary UoW-12 quality focus)

# NFR Design Patterns — UoW-12 (Confirmation Widgets + Accessibility Level A)

**Stage**: 10 — NFR Design
**UoW**: UoW-12-confirmation-widgets-a11y
**Generated at**: 2026-05-06T12:25:00Z

---

## Resilience

### Pattern P-RES-01: Graceful null-safe widget rendering
**Applies to**: NFR-12-RELI-01, NFR-12-RELI-02
**Implementation**:
- Each widget component guards optional props at render time with optional-chaining (`?.`) and nullish coalescing (`??`)
- `ProductCard` returns `null` when `data` is undefined or empty (consistent with WidgetRenderer unknown-type guard)
- `ConfirmationPrompt` defaults `cancelIntent` to `{ intent: 'confirmation.cancel' }` inline — no external fallback service needed
- No retry logic required (pure display components; data is emitted once by the agent)

---

## Scalability

### Pattern P-SCAL-01: Static accessibility attributes
**Applies to**: NFR-12-SCAL-02
**Implementation**:
- All `aria-label`, `aria-live`, `alt` values are compile-time string literals
- No runtime computation required for accessibility attributes
- `ProductCarousel` renders all items inline up to 50-item MVP cap; no virtualization added

---

## Performance

### Pattern P-PERF-01: Pure display components — no data fetching
**Applies to**: NFR-12-PERF-01 through NFR-12-PERF-04
**Implementation**:
- All 4 new widgets are pure display components — they receive all data via the `data` prop from the WidgetRenderer
- No `useEffect`/`fetch` inside widget components; all data pre-loaded in widget payload
- `Intl.NumberFormat` for `DashboardDigest` revenue: constructed once per render, not memoized (negligible cost for 1 format call)
- `ProductCarousel` horizontal scroll: CSS `overflow-x: auto` + `flex-nowrap` — no JS scroll library

---

## Security

### Pattern P-SEC-01: Strict AJV schema validation (additionalProperties: false)
**Applies to**: NFR-12-SEC-01
**Implementation**:
- All 3 fixed schemas (`product_card`, `dashboard_digest`, `confirmation_prompt`) set `"additionalProperties": false` at root and all nested objects
- AJV compiled validator rejects any extra properties before the widget renders
- Existing `WidgetRenderer` AJV pipeline unchanged — schemas are the only thing updated

### Pattern P-SEC-02: Intent pass-through without mutation
**Applies to**: NFR-12-SEC-02, NFR-12-SEC-03, NFR-12-SEC-04
**Implementation**:
- `ConfirmationPrompt`: `onConfirm` calls `onIntent(data.confirmIntent)` — object passed by reference, not reconstructed
- `ProductCard`: intent object `{ intent: 'cart.add', variantId: data.variantId }` constructed inline at click time — no external data injected
- `ProductCarousel`: intent object `{ intent: 'product.view', productId: item.productId }` constructed inline at click time

### Pattern P-SEC-03: Input validation at JSON schema boundary
**Applies to**: NFR-12-SEC-01
**Implementation**:
- Existing AJV validator in `WidgetRenderer` already validates all widget data against schema before rendering
- Updated schemas are the enforcement mechanism — no additional runtime checks in widget components
- `additionalProperties: false` blocks any unexpected fields injected by future schema drift

---

## Accessibility (Level A)

### Pattern P-A11Y-01: aria-live regions
**Applies to**: NFR-A11Y-03, NFR-A11Y-04
**Implementation**:
- `ConfirmationPrompt` root div: `aria-live="assertive"` (already in stub — preserved)
- Streaming/updating widget content regions: `aria-live="polite"` on outer wrapper — audit all 21 widgets; add where missing
- No `aria-atomic` required for Level A

### Pattern P-A11Y-02: Meaningful alt text on images
**Applies to**: NFR-A11Y-05
**Implementation**:
- `ProductCard`: `alt={data.title}` on product image
- `ProductCarousel` item: `alt={item.title}` on item thumbnail
- Full audit of all 21 widget files: any `<Image>` with `alt=""` or missing `alt` gets replaced with meaningful description

### Pattern P-A11Y-03: Focus ring via Tailwind
**Applies to**: NFR-A11Y-06
**Implementation**:
- All `<button>` elements receive `focus:ring-2 focus:ring-offset-2 focus:outline-none` class
- Global Tailwind config already has `focus-visible:ring` — add explicit `focus:ring-2` to button class strings where missing

### Pattern P-A11Y-04: aria-label on icon-only buttons
**Applies to**: NFR-A11Y-02
**Implementation**:
- CartSummary qty stepper `+` button: `aria-label="Increase quantity"`
- CartSummary qty stepper `−` button: `aria-label="Remove item"` (at qty=1) or `aria-label="Decrease quantity"` (qty>1)
- Any other icon-only button found in the audit: add `aria-label` describing the action

### Pattern P-A11Y-05: Text label alongside color indicators
**Applies to**: NFR-A11Y-08
**Implementation**:
- `ProductCard` stock badge: show text "In Stock" (green) / "Low Stock" (amber) / "Out of Stock" (red) — color used for visual reinforcement only
- No other color-sole-indicator pattern found in remaining widgets; full audit confirms

---

## Maintainability

### Pattern P-MAINT-01: Widget test structure (4 tests per concern)
**Applies to**: NFR-12-MAINT-01, NFR-12-MAINT-02
**Implementation**:
- Each widget test file structure:
  1. Happy-path render (all required fields present)
  2. Optional fields absent (no crash)
  3. Button click → correct intent emitted
  4. Accessibility attribute presence (aria-label, alt, aria-live)
  5. Edge case (empty list, zero values, null variantId)
  6. data-testid presence check
- Test runner: Vitest + React Testing Library (established pattern)

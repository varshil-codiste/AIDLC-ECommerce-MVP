# Accessibility (WCAG 2.2 AA) — team-specific

**Extension**: Accessibility — WCAG 2.2 AA covering Web (Frontend) and Mobile (Flutter)
**Loaded by**: Requirements Analysis when user opts in
**Enforced at**: Functional Design (Stage 8), Code Generation (Stage 12), Code Review (Stage 13), Build & Test (Stage 14 — axe / Flutter a11y), Production Readiness (Stage 18 Section J)

WCAG 2.2 AA is what most public-facing production deliverables target. The rules below are organized by WCAG's four principles: Perceivable, Operable, Understandable, Robust.

---

## Web vs Mobile

| WCAG concept | Web (Frontend) | Mobile (Flutter) |
|--------------|----------------|------------------|
| Semantic landmarks | `<header> <nav> <main> <footer>` | `Semantics(container: true, ...)` |
| Roles | `role=...` attribute | `Semantics(button: true, ...)` |
| Names / labels | `aria-label`, `<label htmlFor>` | `Semantics(label: 'Submit')` |
| Live regions | `aria-live=polite\|assertive` | `Semantics(liveRegion: true)` |
| Focus | `:focus-visible` outline | `Focus`, `FocusNode` |
| Tap targets | min 24×24 px (AA) | min 48×48 dp (Material) |

Both stacks are tooled to verify a11y in CI.

---

## The 12 Rules (organized by WCAG principle)

### Principle 1 — Perceivable

#### A11Y-01 — Text alternatives (1.1.1 — Level A)
- Every image, icon, video has a meaningful alt text or is marked decorative
- Web: `<img alt="...">`; for decorative, `alt=""` AND `role="presentation"`
- Flutter: `Image(... semanticLabel: 'description')`; decorative → `ExcludeSemantics`
- AI-generated alt text is acceptable as a starting point but the pod reviews

#### A11Y-02 — Captions and audio descriptions (1.2.x — Level A/AA)
- Pre-recorded video has captions (1.2.2 — A)
- Pre-recorded video has audio description (1.2.5 — AA)
- Live audio-only content can have transcripts (1.2.1 — A)
- N/A if the project has no audio/video

#### A11Y-03 — Adaptable & distinguishable content (1.3.x, 1.4.x)
- Heading hierarchy correct (h1 → h2 → h3, no skips)
- Form fields have associated `<label>` (web) or label semantics (mobile)
- Color contrast meets WCAG AA: 4.5:1 normal text, 3:1 large text, 3:1 UI components and graphic objects (1.4.3 / 1.4.11 — AA)
- Don't convey info by color alone (1.4.1 — A)
- Text can be resized to 200% without loss of content (1.4.4 — AA)
- Reflow: content does not require horizontal scrolling at 320 CSS px / mobile-portrait (1.4.10 — AA)
- Text spacing: line height ≥ 1.5, paragraph spacing ≥ 2× font size, letter-spacing ≥ 0.12em, word-spacing ≥ 0.16em achievable without breaking layout (1.4.12 — AA)

### Principle 2 — Operable

#### A11Y-04 — Keyboard accessible (2.1.x — Level A)
- All interactive elements operable by keyboard (web)
- No keyboard traps
- Tab order matches visual order
- Logical focus order on dynamic content (modals, drawers)
- Skip-to-content link present at top of page

#### A11Y-05 — Enough time (2.2.x — Level A)
- Time limits adjustable / extendable (or none)
- Auto-updating content (carousels, polling) can be paused

#### A11Y-06 — Seizures avoided (2.3.x — Level A)
- No flashing content > 3 flashes per second
- Particularly relevant for animations / loading screens

#### A11Y-07 — Navigable (2.4.x — Level A/AA)
- Page titles meaningful (2.4.2 — A)
- Multiple ways to navigate to a page (2.4.5 — AA — sitemap, search, nav, etc.)
- Headings and labels descriptive (2.4.6 — AA)
- Visible focus indicator (2.4.7 — AA) — Team rule: focus ring contrast ≥ 3:1 against adjacent colors
- Focus appearance robust (2.4.13 — WCAG 2.2 AA new) — focus indicator at least 2 CSS px

#### A11Y-08 — Input modalities (2.5.x — WCAG 2.1+/2.2)
- Pointer gestures: complex gestures have alternate single-pointer alternative (2.5.1 — A)
- Pointer cancellation: actions completed on up-event, not down (2.5.2 — A)
- Label in name: visible label is part of the accessible name (2.5.3 — A)
- Target size minimum: 24×24 CSS px (2.5.8 — WCAG 2.2 AA new)
- Dragging movements alternative (2.5.7 — WCAG 2.2 AA new)

### Principle 3 — Understandable

#### A11Y-09 — Readable (3.1.x — Level A/AA)
- Page language declared: `<html lang="en">` (3.1.1 — A)
- Language of parts declared when different (3.1.2 — AA)

#### A11Y-10 — Predictable (3.2.x — Level A/AA)
- No context change on focus (3.2.1 — A)
- No context change on input without warning (3.2.2 — A)
- Consistent navigation across pages (3.2.3 — AA)
- Consistent identification of components (3.2.4 — AA)
- Consistent help (e.g., contact info in same place) (3.2.6 — WCAG 2.2 AA new)

#### A11Y-11 — Input assistance (3.3.x — Level A/AA)
- Error identification: errors identified in text (3.3.1 — A)
- Labels or instructions for inputs (3.3.2 — A)
- Error suggestions: when known (3.3.3 — AA)
- Error prevention: confirmation / undo / verification for legal / financial / data-deletion actions (3.3.4 — AA)
- Redundant entry: don't ask the user to re-enter info already given (3.3.7 — WCAG 2.2 AA new)
- Accessible authentication: don't require cognitive function tests / hard puzzles (3.3.8 — WCAG 2.2 AA new)

### Principle 4 — Robust

#### A11Y-12 — Compatible (4.1.x — Level A/AA)
- Name, role, value programmatically determinable for every UI control (4.1.2 — A)
- Status messages: announced without focus shift (4.1.3 — AA — `aria-live` for toasts, etc.)
- Web: valid HTML; no duplicate IDs; all `aria-*` attributes valid
- Mobile: every interactive widget has a `Semantics` wrapper or built-in semantic equivalent

---

## Tooling per Stack

### Frontend (Web)

| Tool | Purpose | Where it runs |
|------|---------|---------------|
| `eslint-plugin-jsx-a11y` (React) | Catches a11y issues at lint | Code Review (Stage 13) |
| `eslint-plugin-vue` a11y rules (Vue) | Same | Code Review |
| `axe-core` via Playwright (`@axe-core/playwright`) | Automated checks at e2e | Build & Test (Stage 14) |
| `pa11y` (alternative axe) | Same | Build & Test |
| `@storybook/addon-a11y` | Per-component during dev | local dev |
| Lighthouse | Page-level audit | CI optional |

Required at Code Review (Stage 13): zero ESLint a11y errors; axe runs in component tests for critical components.

Required at Build & Test (Stage 14): axe runs against every Tier-1 page from `screen-flow-map.md`; zero violations (warnings allowed but tracked).

### Mobile (Flutter)

| Tool | Purpose |
|------|---------|
| Flutter `accessibility-checker` | Built-in checks during widget tests |
| `flutter test --enable-experiment=accessibility-checker` | CI run |
| Manual VoiceOver / TalkBack pass | Per release on critical flows |

---

## Team Conventions

- **`data-testid` and accessible name overlap**: `data-testid` is for tests; `aria-label` is for users / assistive tech — both required where applicable
- **Color tokens**: `inception/design/design-tokens.md` should include AA-passing color pairs; design tokens checked at Code Review for contrast compliance
- **Form components**: every form field has `<label>` + error message + `aria-invalid` when invalid + `aria-describedby` for help text
- **Modals**: focus trapped inside; ESC closes; focus returns to trigger on close
- **Toasts**: `role="status"` (polite) for info; `role="alert"` (assertive) for errors

---

## Partial Mode (Question B in opt-in)

If user chose `B) Partial` (Level A only — internal tools), then AA-only rules become N/A:

- A11Y-02 (1.2.5 audio description AA)
- A11Y-03 partial (1.4.4, 1.4.10, 1.4.11, 1.4.12 are AA — N/A in Partial)
- A11Y-07 partial (2.4.5, 2.4.6, 2.4.7, 2.4.13 are AA — N/A in Partial)
- A11Y-08 partial (2.5.8, 2.5.7 are AA — N/A in Partial)
- A11Y-09 partial (3.1.2 is AA — N/A in Partial)
- A11Y-10 partial (3.2.3, 3.2.4, 3.2.6 are AA — N/A in Partial)
- A11Y-11 partial (3.3.3, 3.3.4, 3.3.7, 3.3.8 are AA — N/A in Partial)
- A11Y-12 partial (4.1.3 is AA — N/A in Partial)

Level A rules remain blocking even in Partial mode.

---

## Stage-by-Stage Application

| Stage | What this extension does |
|-------|--------------------------|
| 8 Functional Design | A11Y rules referenced when describing FE components / Mobile screens — every interactive element has accessible name + role planned |
| 12 Code Generation | Apply ESLint jsx-a11y and Flutter Semantics conventions while writing code; do NOT post-hoc fix |
| 13 Code Review | ESLint a11y errors = 0; component-level axe (web) / accessibility-checker (Flutter) runs |
| 14 Build & Test | Page-level axe runs against every Tier-1 screen; reported in `accessibility-test-instructions.md` |
| 18 Production Readiness | Section J — zero violations + manual screen-reader pass on at least one critical flow per stack |

---

## Manual Verification

Automated tools catch ~30-40% of a11y issues. The pod MUST do at least one manual pass per release:

- Web: keyboard-only navigation through Tier-1 flows; VoiceOver (macOS) or NVDA (Windows) pass
- Mobile: TalkBack (Android) / VoiceOver (iOS) pass on Tier-1 flows; verify reading order

Document the manual pass in `operations/production-readiness/accessibility-manual-pass.md`.

---

## Anti-patterns

- ❌ `<div onClick>` for buttons — use `<button>`
- ❌ Color-only error indicators (red border without label / icon)
- ❌ Placeholders used as labels
- ❌ `tabindex` > 0 (breaks natural tab order)
- ❌ Skipping heading levels (h1 → h3)
- ❌ Modal that doesn't trap focus / doesn't return focus on close
- ❌ Toast that disappears too fast for a screen reader to announce
- ❌ Mobile: missing `Semantics` wrappers on custom widgets
- ❌ Treating manual a11y testing as optional — automated tools are necessary but insufficient

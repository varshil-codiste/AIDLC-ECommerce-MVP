# Stack Selection — UoW-12 (Confirmation Widgets + Accessibility Level A)

**Stage**: 11 — Stack Selection
**Tier**: Greenfield (Comprehensive)
**Profile**: codiste preset (locked at Stage 11/UoW-01)
**Generated at**: 2026-05-06T12:30:00Z
**Mode**: **Brownfield inheritance — zero new packages**

---

## Confirmation Pass

UoW-12 is a pure-frontend UoW: 4 widget implementations, 3 schema fixes, and an accessibility sweep across all 21 widgets. No new backend agents, no DB migrations, no new runtime dependencies.

### Inherited (no change)

| Layer | Choice | Source UoW |
|-------|--------|-----------|
| API framework | NestJS 11 | UoW-01 |
| ORM | Prisma 6 (multiSchema) | UoW-01/03 |
| Database | PostgreSQL 16 (app schema) | UoW-01 |
| Auth | JWT via `@nestjs/passport` | UoW-02 |
| LLM provider | OpenAI via `openai` 6.36 | UoW-04 |
| Redis | ioredis 5.4 | UoW-03 |
| FE framework | Next.js 15 + React 19 | UoW-05 |
| Schema validation | AJV 8 | UoW-05 |
| Image component | `next/image` | UoW-05 |
| Styling | Tailwind CSS | UoW-05 |
| Testing (BE) | Vitest + fast-check 3.22 | UoW-01/07 |
| Testing (FE) | Vitest + @testing-library/react + fast-check 3.22 | UoW-05 |

---

## Block A — Confirmed Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Widget implementation pattern | Pure React display components (data via prop) | Established pattern for all 17 prior widgets |
| Image rendering | `next/image` `<Image>` component | ESLint-enforced (no raw `<img>`); established in CartSummary |
| Currency formatting | `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` | Consistent with CartSummary, PaymentWidget, PR-10 |
| Focus ring pattern | Tailwind `focus:ring-2 focus:ring-offset-2 focus:outline-none` | Accessibility Level A; consistent across all existing buttons |
| aria-live on ConfirmationPrompt | `aria-live="assertive"` | BR-12-06; carried from stub; preserved in new implementation |
| aria-live on widget content regions | `aria-live="polite"` | BR-12-07; added where missing in 21-widget audit |
| schema additionalProperties | `false` at root + nested objects | NFR-12-SEC-01; Q1=A decision |
| PBT test targets | 3 schema round-trip PBT suites (product_card, dashboard_digest, confirmation_prompt) | NFR-12-PBT-01..03; fast-check already in dev deps |
| data-testid pattern | kebab-case string constants | Consistent with all prior widgets |

---

## Block B — New packages

**None.** `Intl.NumberFormat` is native browser/Node API. All other libraries already present.

---

## Block C — New env vars

**None.** UoW-12 introduces no new environment variables.

---

## Block D — DB migrations

**None.** UoW-12 modifies only FE widget files and JSON schema files. No DB model changes.

---

## Block E — Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Schema fix breaks existing widget data that matched old field names | Schemas are only validated against newly emitted data; no existing persisted widget data is re-validated at load time. Old sessions that reload may emit fresh data from agents that already use correct shapes. |
| a11y audit introduces regressions in widget render tests | Widget tests use data-testid selectors which are stable; aria attributes are additive. Existing tests unaffected. New tests verify aria attributes explicitly. |
| ProductCarousel item click vs scroll conflict on touch devices | Out of scope for Level A — touch event handling is not an ARIA Level A requirement. CTA uses `onClick` which fires on tap. |

---

## Verdict

✅ **Brownfield zero-package** — UoW-12 requires no new packages, no new migrations, no new env vars. All decisions confirmed from existing infrastructure. Final UoW in the construction phase.

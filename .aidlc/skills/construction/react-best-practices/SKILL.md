---
name: react-best-practices
description: |
  Use when generating React or Next.js code at AI-DLC Stage 12 (Code Generation) for any UoW where the Frontend stack was chosen. Enforces App Router conventions for Next.js, server components vs client components, caching strategy, server-state library usage (TanStack Query / RTK Query / SWR per Stack Selection Block A.3), design tokens from inception/design/design-tokens.md, and the mandatory data-testid attribute on every interactive element. Skips when Frontend isn't in scope for the UoW.
aidlc:
  sensitive: false
---

# React Best Practices

## When to Use (AI-DLC context)

This skill fires at **Stage 12 — Code Generation** (`../../aidlc-rule-details/construction/code-generation.md`) Step 6 (Frontend code generation), only when:
- The UoW has Frontend in `unit-of-work.md § Stacks involved`
- Stack Selection (Stage 11) Block A picked React or Next.js

The skill consumes the per-UoW Functional Design output (component tree from `frontend-components.md`) and the chosen design tokens, and generates idiomatic React code that passes `frontend-conventions.md` rules.

## What It Does

For each FE component listed in `frontend-components.md`:

1. Picks the right component type (Server Component / Client Component for Next.js App Router; functional component otherwise)
2. Wires server state to the chosen library (TanStack Query / RTK Query / SWR / direct fetch — per Block A.3)
3. Imports tokens from `inception/design/design-tokens.md` rather than hardcoding values
4. Adds the **mandatory `data-testid="<component-kebab>-<role>"` attribute** to every interactive element (team convention — Code Review Gate #4 enforces)
5. Uses the chosen UI library (shadcn/ui, MUI, etc. — per Block A.2) primitives instead of bare HTML
6. Authors a colocated `.test.tsx` per component using the chosen test framework

## Inputs

- `aidlc-docs/construction/{unit}/functional-design/frontend-components.md`
- `aidlc-docs/inception/design/design-tokens.md` (if Design Intake produced one)
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (Block A choices)
- `aidlc-docs/construction/{unit}/nfr-design/nfr-design-patterns.md` (caching / resilience patterns to apply)

## Outputs

Source code under the workspace root (NEVER under `aidlc-docs/`):
- `app/` or `src/` per the chosen framework's layout (see `../../aidlc-rule-details/construction/stacks/frontend-conventions.md`)
- Colocated `<Component>.test.tsx` files
- Storybook stories if Storybook is configured

Plus a code-summary entry in `aidlc-docs/construction/{unit}/code/<unit>-code-summary.md` listing every FE file created/modified.

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature; rare on Bugfix (used only when the bug is in FE behavior)

## Team Conventions Applied

- **Stack-conventions guardrails**: all rules from `frontend-conventions.md` are enforced — strict TypeScript (`strict: true`, `noUncheckedIndexedAccess`), 2-space indent, single quotes, trailing commas, ESLint or Biome (per Block A.4) clean
- **`data-testid` everywhere interactive**: `<Button>`, `<Input>`, every clickable / focusable element. Naming: `<component-kebab>-<role>` (e.g., `signup-form-email`, `signup-form-submit`, `signup-form-error-email`)
- **No hardcoded design values**: every color / font / spacing / radius is `var(--token-name)` (Tailwind) or `theme.<token>` (MUI/Mantine) — Code Review Gate #4 fails on hex codes in component code
- **Co-located component tests**: `<Component>/<Component>.test.tsx` next to `<Component>/<Component>.tsx`
- **No barrel files for app code** (only for package public APIs)
- **Server state via the chosen library** — direct `useEffect(fetch)` patterns rejected for new code
- **Accessibility hooks** — when Accessibility extension is enabled, components use semantic HTML, ARIA only when semantic HTML is insufficient, label association mandatory on all form fields

## Tier-Specific Behavior

- **Greenfield**: full component tree, full test coverage, full a11y/perf optimizations
- **Feature**: scope to the new components and the existing components touched; preserve unrelated patterns even if they predate team conventions
- **Bugfix**: surgical change to the affected component only; preserve every line not strictly required to fix the bug

## See Also

- Upstream skill: `./upstream/README.md` (vercel-labs/react-best-practices and vercel-labs/next-best-practices)
- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-generation.md`
- Stack convention: `../../aidlc-rule-details/construction/stacks/frontend-conventions.md`
- Stack Selection: `../../aidlc-rule-details/construction/stack-selection.md` Block A
- Compliance hooks: extensions/accessibility/wcag22-aa (when enabled), extensions/security/baseline (SECURITY-04 CSP / SRI on third-party scripts)

## Trigger-test prompts

1. "Using AI-DLC, generate the FE for the auth UoW with Next.js App Router." (should trigger Stage 12 FE)
2. "Build the React component tree for the dashboard UoW." (should trigger)
3. "Implement the contact form FE per frontend-components.md." (should trigger)
4. "Generate the FastAPI handler for /auth/login." (should NOT trigger — wrong stack)
5. "Run lint on the FE." (should NOT trigger — that's lint-aggregator)

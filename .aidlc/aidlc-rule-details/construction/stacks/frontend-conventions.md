# Frontend Conventions

**Loaded by**: `construction/stack-selection.md` when Frontend is in scope for a UoW.
**Applies to**: React / Next.js / Vue / Astro projects (per Block A.1 of Stack Selection).

---

## Project Layout

The exact layout depends on framework, but AI-DLC enforces the following invariants:

### React + Vite (or CRA)
```
<workspace-root>/
├── app/                       # OR src/, depending on framework
│   ├── components/            # Reusable UI components
│   │   └── <ComponentName>/
│   │       ├── <ComponentName>.tsx
│   │       ├── <ComponentName>.test.tsx
│   │       └── index.ts
│   ├── pages/                 # Route-level components (or routes/)
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Pure helpers, API clients
│   ├── stores/                # State stores (Zustand / Redux slices)
│   └── styles/                # Global styles, Tailwind base
├── public/
├── tests/                     # Cross-component / integration tests
├── e2e/                       # Playwright / Cypress
├── package.json
├── tsconfig.json
├── vite.config.ts (or similar)
├── tailwind.config.ts (if Tailwind chosen)
└── .env.example
```

### Next.js (App Router)
```
<workspace-root>/
├── app/
│   ├── (marketing)/           # Route groups
│   ├── (auth)/
│   ├── api/                   # Route handlers
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
├── hooks/
├── stores/
├── public/
├── tests/
├── e2e/
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

### Vue (Nuxt)
```
<workspace-root>/
├── app.vue
├── pages/
├── components/
├── composables/
├── stores/                    # Pinia
├── server/                    # Nuxt server routes
├── public/
├── tests/
├── e2e/
└── nuxt.config.ts
```

---

## Lint / Format / Type-check

| Tool | Config | Team rule |
|------|--------|-----------|
| ESLint | `.eslintrc.cjs` or `eslint.config.js` (flat) | Extend the team's shared config (e.g., `@<org>/eslint-config-frontend`) or a vendor equivalent; errors must be 0 in CI |
| Prettier | `.prettierrc` | 2-space indent; single quotes; trailing commas; semicolons |
| Biome (alt to ESLint+Prettier) | `biome.json` | Choose Biome OR ESLint+Prettier — never both |
| TypeScript | `tsconfig.json` | `"strict": true`; `"noUncheckedIndexedAccess": true`; explicit return types on exported functions |

**`tsc --noEmit` MUST pass with 0 errors.**

---

## Test Conventions

| Concern | Convention |
|---------|------------|
| Unit / component tests | Co-located: `<Component>.test.tsx` next to `<Component>.tsx` |
| Integration / cross-component | `tests/` |
| e2e | `e2e/` (Playwright preferred) |
| Test framework | Vitest (Recommended) or Jest (per Block A.4) |
| Component testing | React Testing Library / Vue Testing Library — query by role, label, testid |
| Mocking | MSW for HTTP; `vi.mock` / `jest.mock` for modules |

### Mandatory `data-testid`

Every interactive element gets `data-testid="<component-kebab>-<role>"`:
- `signup-form-email` (input)
- `signup-form-submit` (button)
- `signup-form-error-email` (error message)

This convention is enforced at Code Review (Stage 13) — missing testids are a finding.

---

## Styling

| If chosen UI lib | Convention |
|------------------|-----------|
| Tailwind + shadcn/ui | Use shadcn primitives + Tailwind utility classes; minimize custom CSS |
| Tailwind only | Group utility classes by concern (layout / spacing / color); use Tailwind variables |
| MUI / Mantine / Chakra | Theme-driven; do not bypass theme tokens |
| CSS Modules / vanilla-extract | One CSS file per component; no global selectors except in `app/styles/` |

**Design tokens** (from `inception/design/design-tokens.md`) MUST be the source of truth — do not hardcode hex codes or font sizes; reference token names.

---

## State Management

| Server state | Use the chosen library (TanStack Query / RTK Query / SWR) — do NOT write ad-hoc fetch loops |
| Client state | useState / useReducer for component-local; Zustand / Redux Toolkit for cross-component |
| URL state | Use the framework's router (Next App Router / React Router / Nuxt) |
| Form state | React Hook Form / VeeValidate / Formik — do not roll your own |

---

## Imports & Module Layout

- **Absolute imports** preferred: `@/components/Button` not `../../components/Button`
- One default export per file when the file has a single primary export; named exports otherwise
- No barrel files for app code (only for the public API of a package); prefer direct imports for tree-shaking

---

## Accessibility (when extension on)

- Every form field has an associated `<label>` (htmlFor or wrapping)
- Every interactive non-button-non-link element has an explicit `role` and keyboard handler
- Color contrast meets WCAG 2.2 AA — verified by axe in Code Review
- No keyboard traps; visible focus indicator
- Tab order matches visual order

---

## Performance

- Code-split route bundles (default in Next/Nuxt)
- Lazy-load heavy components below the fold
- Image optimization via framework primitive (`<Image>`)
- Memoize expensive components (`React.memo`, `computed`); avoid premature memoization

---

## Anti-patterns

- ❌ Inline styles with hardcoded values (use design tokens)
- ❌ Fetching server data in `useEffect` for new code (use the chosen server-state library)
- ❌ `any` types
- ❌ Missing `data-testid` on interactive elements
- ❌ Querying DOM by class name in tests (use role / label / testid)

# Stack Selection — UoW-05-chat-shell

**Generated at**: 2026-05-05T15:00:00Z  
**UoW scope**: Frontend only — `web/` (Next.js App Router)

---

## Existing Stack (Locked from Codiste Preset + Prior UoWs)

| Layer | Choice | Version | Status |
|-------|--------|---------|--------|
| Framework | Next.js (App Router) | 15.5.15 | Locked — already installed |
| UI library | React | 19.0.0 | Locked |
| Styling | Tailwind CSS | 3.4.13 | Locked |
| Error monitoring | @sentry/nextjs | ^10.51.0 | Locked — already wired |
| Test runner | Vitest | 2.1.9 | Locked |
| Component testing | @testing-library/react | 16.1.0 | Locked |
| TypeScript | 5.6.2 | Locked |

---

## New Packages for UoW-05

| Package | Version | Purpose | Justification |
|---------|---------|---------|---------------|
| `ajv` | ^8.17.1 | JSON schema validation for widget payloads | BR-UI-004; AJV is the standard for JSON Schema Draft-07; small and fast |
| `ajv-formats` | ^3.0.1 | Additional AJV format validators (date-time, uri) | Widget schemas may use `date-time` format |
| `clsx` | ^2.1.1 | Class name conditional utility | Used by chat components; standard React utility |
| `tailwind-merge` | ^2.5.4 | Deduplicate Tailwind class conflicts | Needed for component composition without class conflicts |

**Explicitly NOT added in UoW-05**:
- `shadcn/ui` — The component library requires initialisation with CLI. UoW-05 builds the chat shell with raw Tailwind + minimal HTML semantics. shadcn/ui components (Button, Textarea) will be scaffolded when the project structure is ready (can be added in a later UoW or via a setup step).
- Any WebSocket library — SSE via native `EventSource` is sufficient per BR-TEL-007 + ADR-005.
- Any state management library (Redux, Zustand) — `useReducer` is sufficient per Pattern 1.

---

## Code-Split Strategy

| Route | Bundling |
|-------|---------|
| `/login` | Already exists (UoW-02) |
| `/chat` | Dynamic import for all 12 widget stubs (React.lazy + Suspense) — prevents unused widget code from loading on first render |

```typescript
// WidgetRenderer.tsx code-split pattern
const ProductCard = dynamic(() => import('./ProductCard'), { ssr: false });
// ...
```

---

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest + @testing-library/react | `chatReducer` pure function; `SseClient` class; `computeWidgetValidity()` |
| Component | @testing-library/react + jsdom | `MessageList`, `Composer`, `WidgetRenderer` with mock widget data |
| Integration | None in this UoW — SSE requires running BE (UoW-06) |
| Accessibility | `jest-axe` OR `@testing-library/jest-dom` aria assertions | aria-live, keyboard nav |

**Coverage target**: ≥ 80% line coverage for `web/` UoW-05 files (NFR-UI-MAINT-001).

---

## Decisions Locked

- `EventSource` for SSE (not `fetch` streaming or WebSocket) — per ADR-005
- `useReducer` for chat state (not Zustand/Redux) — per Pattern 1 + NFR-UI-MAINT-003
- AJV for schema validation (not zod) — zod is BE-oriented; AJV is schema-first and works with JSON Schema files
- `clsx` + `tailwind-merge` (not `cn` from shadcn) — same utility, explicit package ownership

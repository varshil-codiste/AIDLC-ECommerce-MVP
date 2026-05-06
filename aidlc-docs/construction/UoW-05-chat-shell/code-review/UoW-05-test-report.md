# Test Report — UoW-05 (Chat UI Shell + SSE Client + Widget Renderer)

**Date**: 2026-05-05T15:25:00Z  
**Verdict**: PASS

---

## Check 3 — `pnpm test`

### Test Results

```
Test Files  7 passed (7)
Tests       38 passed (38)
Start at    15:24:15
Duration    3.11s
```

**All 38 tests pass. 0 failures. 0 skips.**

### Test Files

| File | Tests | Status | Focus |
|------|-------|--------|-------|
| `tests/chat-reducer.spec.ts` | 11 | ✅ Pass | Pure reducer; all action types; sessionStorage persistence |
| `tests/sse-client.spec.ts` | 7 | ✅ Pass | Event routing; exponential backoff; reconnect sequence; disconnect |
| `tests/widget-renderer.spec.tsx` | 4 | ✅ Pass | Valid widget; invalid schema; unknown type; registry dispatch |
| `tests/message-list.spec.tsx` | 5 | ✅ Pass | Message render; aria-live; aria-busy; TypingIndicator show/hide |
| `tests/composer.spec.tsx` | 6 | ✅ Pass | Enter submits; Shift+Enter no submit; disabled state |
| `tests/login.spec.tsx` (prior UoW) | 3 | ✅ Pass | No regression |
| `tests/widget-renderer.spec.tsx` (overlap) | 2 | ✅ Pass | No regression |

### Bugs Found and Fixed During Test Authoring

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `@/widget-schemas` import unresolved | Missing `resolve.alias` in `vitest.config.ts` | Added `@` alias |
| `toBeDisabled` invalid matcher | `@testing-library/jest-dom` not imported | Created `tests/setup.ts` |
| `scrollIntoView is not a function` | jsdom doesn't implement it | Added stub to `setup.ts` |
| SSE reconnect test wrong mock | Same instance called in loop | Fixed to advance per-instance after timer |
| `WidgetRenderer` wrong error for unknown type | Schema check ran before registry check | Reordered: registry → schema |
| `getByText` found multiple elements | `StreamingTokens` renders in visible + sr-only span | Changed to `getAllByText(...).length > 0` |

---

## Check 3 — Coverage (`pnpm test -- --coverage`)

### Configuration

Coverage scoped to `lib/**`, `components/**`, `widget-schemas/**` (excludes: `app/**`, network-bound utilities, type declarations, widget stubs — per NFR-UI-MAINT-001).

```
Coverage provider: v8
Include: lib/**/*.{ts,tsx}, components/**/*.{ts,tsx}, widget-schemas/**/*.ts
```

### Results

```
All files          |   80.23 |    78.35 |   90.9  |   80.23
 components/auth   |   94.17 |    73.33 |  88.88  |   94.17
 components/chat   |   92.30 |    75.86 | 100.00  |   92.30
 components/widgets|  100.00 |    90.90 | 100.00  |  100.00
 lib               |   63.40 |    80.00 |  81.81  |   63.40
 widget-schemas    |  100.00 |    50.00 | 100.00  |  100.00
```

### Key File Breakdown

| File | Line Coverage | Status |
|------|--------------|--------|
| `lib/sse-client.ts` | 94.93% | ✅ |
| `lib/chat-reducer.ts` | 86.20% | ✅ |
| `widget-schemas/index.ts` | 100% | ✅ |
| `components/widgets/WidgetRenderer.tsx` | 100% | ✅ |
| `components/widgets/UnknownWidget.tsx` | 100% | ✅ |
| `components/chat/Composer.tsx` | 100% | ✅ |
| `components/chat/MessageList.tsx` | 87.5% | ✅ |
| `components/chat/MessageBubble.tsx` | 90.9% | ✅ |
| `components/chat/StreamingTokens.tsx` | 79.16% | ✅ |
| `lib/auth-service.ts` | 0% | N/A — prior UoW-02 code; covered by UoW-02 review |

### NFR Compliance

| NFR | Threshold | Actual | Status |
|-----|-----------|--------|--------|
| NFR-UI-MAINT-001 (line coverage) | ≥ 80% | 80.23% | ✅ PASS |

---

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| Tests pass | ✅ PASS | 38/38 tests; 0 failures |
| Coverage | ✅ PASS | 80.23% ≥ 80% NFR threshold |
| No regressions | ✅ PASS | All prior UoW tests still green |

**Overall Check 3 verdict: PASS**

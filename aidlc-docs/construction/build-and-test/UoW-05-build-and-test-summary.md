# Build & Test Summary — UoW-05 (Chat UI Shell + SSE Client + Widget Renderer)

**Date**: 2026-05-05T15:30:00Z  
**Stage**: 14 — Build & Test

---

## Build — `pnpm build`

**Result**: ✅ PASS

### Route Manifest

| Route | Type | Size | First Load JS |
|-------|------|------|---------------|
| `/` | Static | 307 B | 171 kB |
| `/chat` | Static | 41.3 kB | 212 kB |
| `/login` | Static | 1.87 kB | 172 kB |
| `/api/auth/set-cookie` | Dynamic | 308 B | 171 kB |
| `/_not-found` | Static | 1.15 kB | 172 kB |
| Middleware | — | 41.1 kB | — |

- All routes compiled without errors or warnings
- `/chat` page at 212 kB first load JS (includes `ajv`, `ajv-formats`, chat components, widget registry)
- Shared chunks: 170 kB (Next.js runtime + React)

---

## Tests — `pnpm test`

**Result**: ✅ PASS

```
Test Files  7 passed (7)
Tests       38 passed (38)
Start at    15:30:16
Duration    2.32s
```

| File | Tests | Status |
|------|-------|--------|
| `tests/chat-reducer.spec.ts` | 11 | ✅ |
| `tests/sse-client.spec.ts` | 7 | ✅ |
| `tests/widget-renderer.spec.tsx` | 4 | ✅ |
| `tests/message-list.spec.tsx` | 5 | ✅ |
| `tests/composer.spec.tsx` | 6 | ✅ |
| `tests/login.spec.tsx` | 3 | ✅ |
| (widget-renderer overlap) | 2 | ✅ |

**0 regressions.** All prior UoW tests remain green.

---

## Coverage

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Line coverage (UoW-05 FE scope) | 80.23% | ≥ 80% | ✅ PASS |

---

## Summary

| Check | Status |
|-------|--------|
| `pnpm build` | ✅ All routes compiled; 0 errors |
| `pnpm test` | ✅ 38/38 passing |
| Coverage | ✅ 80.23% |
| Regressions | ✅ None |

**Stage 14 verdict: COMPLETE**

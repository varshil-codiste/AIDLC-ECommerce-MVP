# Build & Test — UoW-09 (Notifications)

**Stage**: 14 — Build & Test
**Generated at**: 2026-05-05T21:15:00Z

---

## Build Results

| Target | Command | Result |
|--------|---------|--------|
| API TypeScript compile | `npx tsc --noEmit` (api/) | ✅ 0 errors |
| API NestJS build | `npm run build` → `nest build` (api/) | ✅ Success |
| Web TypeScript compile | `npx tsc --noEmit` (web/) | ✅ 0 errors |
| Web Next.js build | `npm run build` → `next build` (web/) | ✅ Success |

### Web bundle output

| Route | Type | Size | First Load JS |
|-------|------|------|---------------|
| `/` | Static | 307 B | 171 kB |
| `/_not-found` | Static | 1.15 kB | 172 kB |
| `/api/auth/set-cookie` | Dynamic | 308 B | 171 kB |
| `/chat` | Static | 45.3 kB | 216 kB |
| `/login` | Static | 1.87 kB | 172 kB |

Shared JS: 170 kB · Middleware: 41.1 kB

**Note**: `/chat` First Load JS is 216 kB — within the same band as UoW-08 baseline; NotificationInbox component added negligible weight (small text + buttons; no new vendor deps).

---

## Test Results

| Suite | Files | Tests | Result |
|-------|-------|-------|--------|
| API (vitest) | 33 | 209/209 | ✅ Pass |
| Web (vitest) | 18 | 133/133 | ✅ Pass |
| **Total** | **51** | **342/342** | ✅ **Pass** |

### Δ vs UoW-08 baseline (173 API + 113 web = 286 total)

- API: +36 tests (173 → 209) — NotificationService 11, OrderEventListener 6, LowStockWatcher 7, NotificationAgent 5, label PBT 7
- Web: +20 tests (113 → 133) — NotificationInbox 12, schema PBT 8
- **Combined: +56 tests (286 → 342)**

---

## Coverage (UoW-09 source files)

| File / Directory | Line | Branch | NFR target | Status |
|------------------|------|--------|-----------|--------|
| `api/src/notifications/` (NotificationService, OrderEventListener, LowStockWatcher, Module) | 100% | 100% | NFR-09-MAINT-01 ≥75% (NotificationService) | ✅ Exceeds |
| `api/src/orchestrator/agents/notification/` (NotificationAgent + tools) | 86.06% | 74.19% | (no specific threshold) | ✅ |

---

## Regressions

**None.** All 286 prior tests continue to pass; +56 new tests pass on first run (after the in-flight type/lint fixes during code generation).

---

## NFR Compliance Summary

| NFR | Target | Actual | Status |
|-----|--------|--------|--------|
| NFR-09-MAINT-01 | NotificationService line coverage ≥ 75% | 100% | ✅ |
| NFR-09-MAINT-02 | LowStockWatcher ≥ 4 tests, OrderEventListener ≥ 4 tests | 7 + 6 | ✅ |
| NFR-09-MAINT-03 | NotificationAgent ≥ 4 tests | 5 | ✅ |
| NFR-09-PBT-01 | notification_inbox schema PBT round-trip | 8 PBT | ✅ |
| NFR-09-PBT-02 | buildLowStockLabel PBT invariants | 7 PBT | ✅ |

---

## Verdict

✅ **PASS** — All builds clean, all 342 tests pass, 0 regressions, all NFR thresholds met.

UoW-09 (Notifications) is ready for the next UoW or operations entry. No follow-up actions required for this unit.

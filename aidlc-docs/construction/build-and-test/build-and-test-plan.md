# Build & Test Plan — M1 Partial (UoW-01 + UoW-02)

**Generated at**: 2026-05-05T10:38:00Z
**Tier**: Greenfield
**Scope**: UoW-01 (Scaffolding) + UoW-02 (Auth + Role Gate) — M1 milestone subset
**Note**: Stage 14 will re-run after each subsequent milestone (M2, M3, M4, M5). This is the first pass covering the two shipped UoWs.

---

## UoWs in Scope

| UoW | Description | Gate #4 |
|-----|-------------|---------|
| UoW-01 | Project scaffolding, monorepo, CI, dev scripts | ✅ 2026-05-04 |
| UoW-02 | Auth + role gate (NestJS module + login/refresh API + FE login form) | ✅ 2026-05-05 |

---

## Step-by-Step Plan

| Step | Action | Tool | Pass Criterion |
|------|--------|------|---------------|
| 1 | Build API (NestJS) | `nest build` | 0 TypeScript errors; `dist/main.js` emitted |
| 2 | Build Web (Next.js) | `next build` | 0 errors; `.next/` emitted |
| 3 | Integration: BE ↔ DB + Redis auth flow | Vitest e2e suite (existing) | 6/6 pass against live containers |
| 4 | Integration: OpenAPI contract drift check | `redocly lint shared/openapi.yaml` | 0 errors |
| 5 | Integration: CI pipeline end-to-end dry run | `scripts/ci-api.sh` | exit 0 |
| 6 | Performance: argon2id p95 hash time | Derive from unit test timings | p95 ≤ 600ms (BR-AUTH-003) |
| 7 | Accessibility: Login page Level A | axe-core annotation review (static) | No WCAG 2.2 Level A violations in markup |
| 8 | PBT: RolesGuard decision matrix | fast-check (already ran in Stage 13) | All 100 samples pass |
| 9 | Generate build-and-test-summary.md | — | All steps recorded |
| 10 | Generate build-and-test-checklist.md | — | All items checked |

---

## Deferred to Later Milestones

| Item | Reason |
|------|--------|
| Playwright / Cypress UI e2e | No FE e2e harness set up yet; added when UoW-05 (Chat UI) ships |
| k6 load / stress tests | Single-user auth flow at MVP scale; load test meaningful from UoW-06+ |
| axe-core in-browser scan | Requires running browser; deferred to Playwright setup in UoW-05 |
| Service ↔ service integration | Only one BE service; meaningful from UoW-06 orchestrator |

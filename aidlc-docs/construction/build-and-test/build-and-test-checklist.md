# Build & Test Checklist — M1 Partial (UoW-01 + UoW-02)

**Generated at**: 2026-05-05T10:50:00Z

---

- [x] Every stack built successfully (API: `dist/main.js`; Web: `.next/`)
- [x] Integration suite ran and passed (6/6 e2e against live Postgres + Redis)
- [x] Contract tests pass — no producer/consumer drift (OpenAPI spec vs NestJS controllers verified)
- [x] e2e tests cover all Tier-1 auth stories (login → refresh → logout → replay → role gate)
- [x] Performance tests meet NFR-PERF-* targets (argon2id p95 ~450ms ≤ 600ms)
- [x] Accessibility extension: WCAG 2.2 Level A — no violations (static analysis, login page)
- [x] PBT extension: RolesGuard fast-check ran with seed logging, 0 counterexamples
- [x] build-and-test-summary.md generated
- [x] CI script (`scripts/ci-api.sh`) exits 0 end-to-end

---

**Deferred (noted in plan)**:
- [ ] In-browser axe-core scan — awaiting Playwright setup (UoW-05)
- [ ] k6 load / stress tests — meaningful from UoW-06+ (concurrent user base)
- [ ] Service ↔ service integration — meaningful from UoW-06 orchestrator

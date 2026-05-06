# Build & Test Checklist — UoW-03-persistence

- [x] Every stack built successfully — `pnpm build` exits 0; `dist/main.js` present
- [x] Integration suite ran and passed — 9/9 e2e tests (persistence + auth + app)
- [x] Contract tests — N/A (no HTTP endpoints in UoW-03; no FE/Mobile yet)
- [x] e2e tests cover Tier-1 stories — CC-03 (audit log) and outbox tested in persistence.e2e-spec.ts
- [x] Performance tests meet NFR-PERF targets — drain cycle 10ms/50 rows (< 500ms NFR) ✅
- [x] Accessibility — N/A (no UI in UoW-03)
- [x] PBT suites ran with seed logging — 4 PBT suites: sanitiseSnapshot, computeFingerprint, buildPayload, fingerprint collision
- [x] AI/ML eval — N/A (no AI/ML in UoW-03)
- [x] `UoW-03-build-and-test-summary.md` generated

# Test Report — UoW-01

**Generated**: 2026-05-04T00:32:00Z (re-review after fix patch)
**Tools**: Vitest 2.1.8 (web) + Vitest 2.1.2 (api unit + e2e via supertest + in-process Nest app)
**Supersedes**: first-review run at 2026-05-04T00:31:00Z (results identical — tests passed both times)

---

## Results

| Suite | Command | Files | Tests | Passed | Failed | Duration |
|-------|---------|-------|-------|--------|--------|----------|
| web unit | `pnpm --filter @ecommmer/web test` | 1 | 2 | 2 | 0 | 2.26 s |
| api unit | `pnpm --filter @ecommmer/api test` | 1 | 2 | 2 | 0 | 1.06 s |
| api e2e | `pnpm --filter @ecommmer/api test:e2e` | 1 | 1 | 1 | 0 | 0.90 s |

**Total**: 5 / 5 tests passed (100%).

### Test inventory

| File | What it asserts |
|------|-----------------|
| `web/tests/smoke.spec.tsx` | (1) `metadata.title` is non-empty (NFR-A11Y-08); (2) `<html lang="en-IN">` (NFR-A11Y-08) |
| `api/src/health/health.controller.spec.ts` | (1) `status === 'ok'`; (2) `ts` is a valid ISO 8601 string round-trip |
| `api/test/app.e2e-spec.ts` | (1) `GET /health` → HTTP 200, `body.status === 'ok'`, `body.ts` is a string |

---

## Coverage

Coverage gating not enforced for UoW-01 per `UoW-01-code-generation-plan.md` § Test plan summary ("not gated for UoW-01 — meaningful business code starts at UoW-02"). Coverage instrumentation is wired (Vitest's built-in `--coverage` flag works) but no threshold yet.

## Verdict for this check

✅ **Pass**.

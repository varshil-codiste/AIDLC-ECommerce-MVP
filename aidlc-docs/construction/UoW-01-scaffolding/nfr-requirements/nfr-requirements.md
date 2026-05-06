# NFR Requirements — UoW-01 Project Scaffolding

**Unit**: UoW-01 — Project scaffolding + monorepo + CI + dev scripts
**Generated**: 2026-05-04T00:26:00Z
**Source**: filtered subset of `requirements.md` § 2 NFRs that apply to a tooling-only UoW

UoW-01 has no runtime business logic; the NFRs that apply are about the **tooling pipeline** itself.

---

## 1. Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-UoW01-01 | CI pipeline (`scripts/ci.sh`) p95 wall-clock on a clean GitHub Actions runner cache | ≤ 3 minutes |
| NFR-PERF-UoW01-02 | `scripts/dev.sh` cold-start (clone → web + api up + Postgres + Redis healthy) | ≤ 90 seconds on a developer laptop |
| NFR-PERF-UoW01-03 | API `/health` endpoint p95 latency | ≤ 50 ms (no DB call) |

## 2. Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-UoW01-01 | Initial dependency tree (both `web/` and `api/`) | Zero high or critical CVEs at scaffold time (npm audit / pnpm audit) |
| NFR-SEC-UoW01-02 | License posture | All deps MIT / Apache 2.0 / BSD; **no AGPL or GPL** (NFR-MAINT-02 from `requirements.md`); CI fails the build if a copyleft dep appears |
| NFR-SEC-UoW01-03 | Secrets handling | `.env.example` in repo with placeholder values; `.env` git-ignored; CI uses GitHub Actions secrets only |
| NFR-SEC-UoW01-04 | GitHub Actions permissions | Workflows declare least-privilege `permissions:` block (default `contents: read`) |

## 3. Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-UoW01-01 | CI flakiness budget | ≤ 1% flake rate over 100 consecutive runs (zero re-runs needed for the smoke test in particular) |

## 4. Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MAINT-UoW01-01 | Lint enforcement | ESLint + Prettier configured for both stacks; CI fails on any lint error |
| NFR-MAINT-UoW01-02 | Type checking | TypeScript strict mode (`"strict": true`) enabled in both stacks |
| NFR-MAINT-UoW01-03 | Editor consistency | `.editorconfig` enforces 2-space indents, LF line endings, UTF-8 |
| NFR-MAINT-UoW01-04 | Lockfile discipline | Lockfiles committed; CI uses `--frozen-lockfile` to fail on drift |

## 5. Observability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-OBS-UoW01-01 | `/health` endpoint exists from UoW-01 onwards (Stage 17 monitors it) | Returns `{status:"ok",ts:"<ISO>"}` with HTTP 200 |
| NFR-OBS-UoW01-02 | Structured logging shim wired even if log volume is zero (placeholders for the 10 required log fields per codiste preset) | log lines emit JSON in dev + prod |

## 6. Compliance with opted-in extensions

| Extension | Applicable to UoW-01? | Status |
|-----------|----------------------|--------|
| Security Baseline (full) | Partially — license posture (NFR-SEC-UoW01-02), dep audit (NFR-SEC-UoW01-01), least-privilege CI (NFR-SEC-UoW01-04) | **Compliant** |
| AI/ML Lifecycle (full) | N/A — no LLM in UoW-01 | **N/A** |
| Property-Based Testing (partial) | N/A — no business logic in UoW-01 | **N/A** |
| Accessibility (Level A) | Partially — `<html lang="en-IN">` + meaningful `<title>` in the placeholder layout (NFR-A11Y-08) | **Compliant** |

# NFR Design — UoW-01 Project Scaffolding

**Unit**: UoW-01
**Generated**: 2026-05-04T00:26:30Z
**Inputs**: this UoW's `nfr-requirements.md` + `application-design.md` § 7 + ADR-006

How each NFR will actually be satisfied in this UoW. Patterns + concrete components.

---

## 1. CI design (NFR-PERF-UoW01-01, NFR-REL-UoW01-01, NFR-MAINT-UoW01-01..04)

**Pattern**: codiste-preset *one shell entry per stack invoked from a single workflow* — `scripts/ci.sh` is the single shell entry; per-stack scripts (`ci-web.sh`, `ci-api.sh`) keep the per-stack CI runtime small and parallelizable.

**Shape**:

```yaml
# .github/workflows/ci.yml — minimal
name: CI
on:
  pull_request: { branches: [main] }
  push: { branches: [main] }

permissions: { contents: read }   # NFR-SEC-UoW01-04

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web: 'web/**'
            api: 'api/**'
            shared: 'shared/**'

  ci-web:
    needs: changes
    if: needs.changes.outputs.web == 'true' || needs.changes.outputs.shared == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '<from Stage 11>', cache: '<from Stage 11>' }
      - run: bash scripts/ci-web.sh

  ci-api:
    needs: changes
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.shared == 'true'
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:15, ports: ['5432:5432'], env: { ... } }
      redis:    { image: redis:7,    ports: ['6379:6379'] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '<from Stage 11>', cache: '<from Stage 11>' }
      - run: bash scripts/ci-api.sh
```

**Per-stack ci-*.sh contract**:
1. Install deps with `--frozen-lockfile`
2. Lint (ESLint + Prettier check)
3. Typecheck (`tsc --noEmit`)
4. Run vitest (smoke + any stage-13-added tests)
5. License audit step: a one-liner that fails if any AGPL/GPL string appears in a flat `pnpm licenses ls` (or `npm fund`-equivalent) output

Concurrency caps + `cache:` on `setup-node` keep the 3-minute target reachable.

---

## 2. Local-dev design (NFR-PERF-UoW01-02)

**Pattern**: a single `scripts/dev.sh` that sequences:
1. `docker-compose up -d postgres redis` (uses `docker-compose.yml` shipped in `infra/`)
2. `pnpm install --frozen-lockfile` if node_modules missing
3. `pnpm --filter api dev` in background (NestJS hot-reload)
4. `pnpm --filter web dev` in foreground (Next.js dev server)

`docker-compose.yml` for local-only data tier:
- postgres:15 with pgvector image + a `dev` DB seeded with `prisma migrate deploy` (no data yet)
- redis:7 with AOF on

Cold-start ≤ 90 s budget achievable on dev laptops with cached Docker images.

---

## 3. Health endpoint design (NFR-OBS-UoW01-01)

**Pattern**: a tiny NestJS controller `health.controller.ts` in `api/src/`, registered in the otherwise-empty `app.module.ts`.

```ts
// shape (illustrative)
@Controller('health')
class HealthController {
  @Get()
  get() { return { status: 'ok', ts: new Date().toISOString() }; }
}
```

No DB / Redis dependency in UoW-01's `/health` — those checks are added incrementally as later UoWs introduce dependencies.

---

## 4. Structured logging shim (NFR-OBS-UoW01-02)

**Pattern**: `pino` (codiste preset for Node BE) configured in `api/src/main.ts` with the 10 required fields. Stub:

```ts
const logger = pino({
  base: { service: 'api', version: process.env.GIT_SHA ?? 'dev', environment: process.env.NODE_ENV ?? 'dev' },
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

Request-scoped fields (`request_id`, `user_id`, `trace_id`, `span_id`) come in via UoW-04 (Telemetry). UoW-01 just wires the base.

FE has a thin `lib/log.ts` placeholder that emits JSON to `console.*` in browser; it'll be wired to OTel browser-SDK in UoW-04.

---

## 5. Secrets handling (NFR-SEC-UoW01-03)

- `.env.example` with placeholders only — `DATABASE_URL`, `REDIS_URL`, `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY`, `LLM_PROVIDER_API_KEY`
- `.env` is `.gitignore`d
- CI reads from `${{ secrets.* }}` only; never echoes their values
- Local dev reads `.env` via `dotenv-cli` invoked by `scripts/dev.sh`

---

## 6. License audit (NFR-SEC-UoW01-02)

CI step at the end of `ci-{web,api}.sh`:

```sh
# Fails the build on any AGPL / GPL transitive dep
if pnpm licenses ls --json | jq -e '.. | .license? | strings | select(test("AGPL|GPL"; "i"))' >/dev/null 2>&1; then
  echo "::error::Copyleft license detected. Per BR § 3.3, MIT/Apache only."
  exit 1
fi
```

(Exact one-liner finalized in Stage 12; the command shape depends on the package-manager pick from Stage 11.)

---

## 7. Components touched (vs `application-design/components.md`)

| Component | Created in UoW-01? | Notes |
|-----------|-------------------|-------|
| `web/app/layout.tsx`, `web/app/page.tsx` | YES — placeholder | Carries `<html lang="en-IN">` + meaningful `<title>` |
| All other FE components | NO | Deferred (UoW-05 onwards) |
| `api/src/main.ts`, `api/src/app.module.ts` | YES — minimal bootstrap | |
| `api/src/health/` | YES (small) | New, not in components.md catalog because it's purely operational; auto-added to catalog after this UoW |
| All BE business modules | NO | Deferred (UoW-02 onwards) |
| `shared/openapi.yaml` | YES (only `/health` endpoint defined) | |
| `infra/docker-compose.yml` | YES — local-dev only | Cloud target deferred to Stage 16 IaC |

---

## 8. Compliance map

| NFR | Design satisfies via |
|-----|----------------------|
| NFR-PERF-UoW01-01 | CI design § 1 + path-filter parallelism |
| NFR-PERF-UoW01-02 | Local-dev design § 2 |
| NFR-PERF-UoW01-03 | Health endpoint § 3 (no I/O) |
| NFR-SEC-UoW01-01 | License audit § 6 + `pnpm audit` step in `ci-*.sh` |
| NFR-SEC-UoW01-02 | License audit § 6 |
| NFR-SEC-UoW01-03 | Secrets handling § 5 |
| NFR-SEC-UoW01-04 | CI § 1 `permissions:` block |
| NFR-REL-UoW01-01 | CI § 1 — deterministic, hermetic, no network beyond pkg registry |
| NFR-MAINT-UoW01-01..04 | CI § 1 + tsconfig strict + .editorconfig + frozen-lockfile |
| NFR-OBS-UoW01-01 | Health § 3 |
| NFR-OBS-UoW01-02 | Logging shim § 4 |

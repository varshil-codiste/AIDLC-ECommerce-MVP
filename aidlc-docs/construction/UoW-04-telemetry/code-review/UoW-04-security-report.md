# Security Report — UoW-04 (Telemetry + OTel + LLM Cost Meter)

**Generated at**: 2026-05-05T14:42:00Z  
**SAST tools run**: ESLint (security plugin via existing config), TypeScript strict mode  
**Dependency scan**: pnpm audit

---

## SAST Findings

| Severity | Count | Tool | Notes |
|----------|-------|------|-------|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 0 | — | — |
| Low | 0 | — | — |

No SAST findings in UoW-04 source files.

---

## Dependency Vulnerabilities

`pnpm audit` found 11 vulnerabilities (3 low, 5 moderate, 3 high). All 3 high-severity findings are in dev/CLI tooling — NOT in the production runtime bundle:

| Severity | Package | Path | Disposition |
|----------|---------|------|-------------|
| High | `redoc@2.1.5` | `. > @redocly/cli > redoc` | `[~] N/A — @redocly/cli is a doc-generation dev tool, never installed in production image. Prototype pollution only reachable via untrusted Redoc `mergeObjects()` call, not present in API runtime.` |
| High | `glob@11.0.3` | `. > @nestjs/cli > glob` | `[~] N/A — @nestjs/cli is a build/scaffold tool, excluded from production Docker image (not in `dependencies`, only in `devDependencies`). CLI's `-c/--cmd` injection vector requires local shell access.` |
| High | `picomatch@4.0.2` | `. > @nestjs/cli > @angular-devkit/core > picomatch` | `[~] N/A — Transitive dev dependency of @nestjs/cli. ReDoS requires untrusted extglob patterns passed to picomatch; not reachable in production.` |
| Moderate (5) | Various | Various dev tool paths | `[~] N/A — All moderate findings trace to dev tooling (@nestjs/cli, @redocly/cli, @angular-devkit/*).` |
| Low (3) | Various | Various | `[~] N/A — Low findings; dev tooling paths.` |

**Production runtime dependencies** (`@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-grpc`, `@opentelemetry/api`, `prom-client`): 0 vulnerabilities found.

---

## Extension Rule Compliance (Security Baseline)

| Rule | Status | Notes |
|------|--------|-------|
| SECURITY-01 (Encryption at rest/transit) | ✅ Compliant | OTLP export uses gRPC (TLS configurable via env); cost records stored in PG (encrypted at rest in production per deployment config) |
| SECURITY-02 (Auth / access control) | N/A | UoW-04 adds no new endpoints or routes |
| SECURITY-03 (Input validation) | ✅ Compliant | `LlmCallInput` fields are all typed; token counts are numbers; no user-supplied values written to DB without sanitization |
| SECURITY-04 (Secrets management) | ✅ Compliant | `OTLP_AUTH_HEADER`, `LLM_BUDGET_WEEKLY_USD` read from env vars, never hardcoded |
| SECURITY-05 (SQL injection) | ✅ Compliant | `getLast7DaysCost()` uses Prisma `$queryRaw` with tagged template literals (parameterized); no string concatenation |
| SECURITY-06 (Logging sensitivity) | ✅ Compliant | No PII logged; cost records contain model name + token counts only; `err` logged via structured logger |
| SECURITY-07 (Dependency management) | ✅ Compliant | All high vulns are in dev tooling not included in production image |
| SECURITY-08–15 | N/A | UoW-04 adds no authentication flows, file uploads, or new public endpoints |

---

## Verdict

- **✅ Pass** — 0 Critical AND 0 High in production runtime; all Security extension rules Compliant or N/A

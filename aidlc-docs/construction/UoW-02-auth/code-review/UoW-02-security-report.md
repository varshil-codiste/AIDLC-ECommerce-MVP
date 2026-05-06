# Security Report — UoW-02 Auth + Role Gate

**Generated at**: 2026-05-05T10:26:00Z
**SAST tools run**: `@typescript-eslint` (no-unsafe rules), TypeScript strict mode, manual code review of auth-critical paths
**Dependency scans run**: `pnpm audit` (workspace-wide)

---

## SAST Findings

| Severity | Count | Tool | Top examples |
|----------|-------|------|--------------|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 0 | — | — |
| Low | 0 | — | — |

No SAST findings. All inputs validated via class-validator; no raw SQL; no eval/exec; no dangerouslySetInnerHTML.

---

## Dependency Vulnerabilities

**Production dependencies**: 0 Critical, 0 High, 0 Medium.

**Dev-only dependencies (not deployed)**:

| Severity | Count | Package | Path | Disposition |
|----------|-------|---------|------|-------------|
| Critical | 0 | — | — | — |
| High | 1 | redoc@2.1.5 | `@redocly/cli` (OpenAPI lint, CI only) | `[~] N/A: dev-only, not deployed` |
| High | 1 | glob@11.0.3 | `@nestjs/cli` (build tool, not runtime) | `[~] N/A: dev-only, not deployed` |
| High | 1 | picomatch@4.0.2 | `@nestjs/cli` → `@angular-devkit/core` (build tool) | `[~] N/A: dev-only, not deployed` |
| Moderate | 4 | various | dev toolchain only | `[~] N/A: dev-only, not deployed` |
| Low | 3 | various | dev toolchain only | `[~] N/A: dev-only, not deployed` |

Note: **vitest@2.1.2** (Critical RCE via API server) was upgraded to **2.1.9** during this review cycle in both `api/` and `web/` to eliminate the vulnerability. The API server attack vector only applies when `vitest --api` is explicitly started (not in `vitest run` CI mode).

---

## Extension Rule Compliance — Security Baseline (15 rules)

| Rule | Applicable | Status | Evidence |
|------|-----------|--------|---------|
| SECURITY-01 (Encryption at rest/transit) | Partial | ✅ Compliant | argon2id for password storage; PII columns documented as requiring KMS encryption at Stage 16 (IaC); TLS for Redis/Postgres deferred to Stage 16 per Gate #3 accepted risk. Dev-only connections are LAN-only. |
| SECURITY-02 (Access logging — LB/gateway) | N/A | — | No LB/gateway deployed in UoW-02; UoW-02 is application code only. Addressed at Stage 16 IaC. |
| SECURITY-03 (Structured logging) | ✅ Yes | ✅ Compliant | pino JSON logger; all auth events logged with `event`, `userId`, `role` fields: `auth.login`, `auth.logout`, `auth.refresh`, `auth.refresh.reuse_detected`, `authz.denied`. `redact: ['email','password','passwordHash']` prevents secret leakage. |
| SECURITY-04 (HTTP security headers) | ✅ Yes | ✅ Compliant | `web/next.config.mjs` headers: CSP with `default-src 'self'`, `frame-ancestors 'none'`; `X-Frame-Options: DENY`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` denying camera/microphone/geolocation. Missing `Strict-Transport-Security` (HSTS) — acceptable in dev; must be added at Stage 16 (CDN/LB layer). Noted as caveat. |
| SECURITY-05 (Input validation) | ✅ Yes | ✅ Compliant | All DTOs use `class-validator` decorators: `@IsEmail()`, `@MinLength(12)`, `@IsUUID()`, `@IsString()`. `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` rejects unknown fields. Prisma uses parameterized queries — no string concatenation into SQL. |
| SECURITY-06 (Least-privilege access) | Partial | ✅ Compliant | DB user (`app` / `ecomm`) has no DDL grants in production. Prisma migrations user is separate (Stage 16 concern). No `*:*` IAM in UoW-02 code. |
| SECURITY-07 (Restrictive network config) | N/A | — | Network configuration is IaC concern (Stage 16). Dev docker-compose binds only to localhost ports. |
| SECURITY-08 (App-level access control) | ✅ Yes | ✅ Compliant | `JwtAuthGuard` + `RolesGuard` registered as global `APP_GUARD` providers — deny-by-default. All non-auth endpoints require Bearer token unless decorated `@Public()`. `HealthController` and auth endpoints explicitly marked `@Public()`. CORS allow-list (`WEB_ORIGIN` env var, not `*`). JWT signature, expiry all verified by `passport-jwt` RS256 strategy. |
| SECURITY-09 (Security hardening) | ✅ Yes | ✅ Compliant | `poweredByHeader: false` in `next.config.mjs`. Generic `UnauthorizedException` messages to clients (no stack traces, no account-existence leakage). `main.ts` doesn't expose NestJS fingerprinting headers. |
| SECURITY-10 (Supply chain) | ✅ Yes | ✅ Compliant | `pnpm-lock.yaml` committed. vitest upgraded from 2.1.2 → 2.1.9 to patch Critical RCE. 0 Critical / 0 High in production runtime dependencies. Dev toolchain vulns marked N/A (not deployed). MIT/Apache-only license check via `ci-api.sh`. |
| SECURITY-11 (Secure design / rate limiting) | ✅ Yes | ✅ Compliant | Rate limiting at auth login: 5 failures / 1 min → 15-min lockout (BR-AUTH-007). Redis-backed counter. Reuse detection triggers all-token revocation. Defense-in-depth: validation at DTO layer + service layer. |
| SECURITY-12 (Auth + credential management) | ✅ Yes | ✅ Compliant | argon2id (OWASP recommended). MinLength(12) password policy. HttpOnly + SameSite=lax cookie for refresh token. 15-min access token TTL. 30-day sliding refresh TTL. Token rotation on every refresh. Reuse detection + family-wide revocation on theft signal. |
| SECURITY-13 (Software/data integrity) | ✅ Yes | ✅ Compliant | No `pickle.load` equivalents. Prisma parameterized queries. No class-instance hydration from untrusted input. pnpm-lock.yaml committed (artifact pinning). Audit log for all writes planned in UoW-03. |
| SECURITY-14 (Alerting and monitoring) | Partial | ✅ Compliant | Auth events logged with structured pino: failed logins, lockouts, reuse-detected. Alert infrastructure (Grafana/OTel) set up at Stage 17 Observability. Dashboards deferred — accepted per roadmap. |
| SECURITY-15 (Exception handling / fail-safe) | ✅ Yes | ✅ Compliant | `UnauthorizedException` / `HttpException` on all failure paths — deny access on error. Redis/Prisma failures propagate as 500 (fail closed). Generic messages to client; full detail in pino logs. |

---

## Verdict

✅ **Pass** — 0 Critical AND 0 High in production runtime. All 15 Security extension rules Compliant or N/A with justification.

**Caveats (non-blocking)**:
- `Strict-Transport-Security` (HSTS) not set in application code — must be enforced at CDN/LB in Stage 16
- Database and Redis TLS deferred to Stage 16 (IaC), per Gate #3 accepted risk #6

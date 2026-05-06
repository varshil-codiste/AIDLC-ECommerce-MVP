# Tech Stack Decisions (Constraints) — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:34:00Z
**Stage**: 9 — NFR Requirements
**UoW**: UoW-02

These constraints are derived from UoW-02 NFRs and will inform Stage 11 Stack Selection.

---

## Constraints implied by NFRs

| Constraint | Implied by | Impact |
|------------|-----------|--------|
| argon2id must run async (non-blocking) | NFR-RELI-UoW02-04 | Must use `@node-rs/argon2` or `argon2` npm package (both expose async API via native binding); NOT the sync `crypto.pbkdf2Sync` |
| JWT library must support RS256 + key-pair rotation | NFR-SEC-UoW02-02 | `@nestjs/jwt` wraps `jsonwebtoken` — supports RS256 natively; key passed as PEM string from env |
| Redis client must support GET/SET/DEL/EXPIRE with error handling | NFR-RELI-UoW02-01/02 | `ioredis` (already in scope from UoW-01 infra); graceful degradation on disconnect |
| pino redact config must cover auth-sensitive fields | NFR-SEC-UoW02-09 | `pino({ redact: ['req.headers.authorization', 'body.password', 'body.refreshToken'] })` |
| Next.js Route Handler (app router) required for BFF cookie-set | NFR-SEC-UoW02-04 | `app/api/auth/set-cookie/route.ts` — sets HttpOnly cookie; requires `cookies()` from `next/headers` (server-only) |
| CORS configuration at NestJS level | NFR-SEC-UoW02-10 | `app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true })` |
| Content-Security-Policy header on Next.js | NFR-SEC-UoW02-11 | `next.config.ts` headers config or `middleware.ts` |
| PBT library for role-gate property tests | NFR-MAINT-UoW02-03/04 | `fast-check` — already used in codiste preset; no new dependency |

---

## Open choices (resolved at Stage 11 Stack Selection)

All stack choices for UoW-02 are already locked from the codiste preset + UoW-01 baseline:

| Choice | Locked value | Source |
|--------|-------------|--------|
| BE framework | NestJS 11.1.19 | UoW-01 baseline |
| FE framework | Next.js 15.5.15 | UoW-01 baseline |
| JWT library | `@nestjs/jwt` | codiste preset |
| Password hashing | `argon2` npm package | FR-AUTH-01 + codiste preset |
| Redis client | `ioredis` | UoW-01 infra |
| Validation | `class-validator` + `class-transformer` (NestJS ecosystem) | codiste preset |
| PBT | `fast-check` | Stage 4 Q3 = B |
| Test runner | Vitest 2.x | UoW-01 baseline |

**No new tech-stack choices required for UoW-02.** Stage 11 Stack Selection will be brief (confirm the above list + record exact package versions).

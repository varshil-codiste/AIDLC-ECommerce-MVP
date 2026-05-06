# NFR Requirements — UoW-02 Auth + Role Gate

**UoW**: UoW-02 — Auth + role gate
**Tier**: Greenfield (Comprehensive)
**Generated at**: 2026-05-04T00:34:00Z
**Sources**: `requirements.md` § 2 NFRs (baseline), plus UoW-02-specific derivations from Functional Design
**Extensions active**: Security Baseline (full), PBT (partial), Accessibility (Level A); AI/ML = N/A for this UoW

---

## 1. Performance

| ID | Requirement | Target | Measurement | Derivation |
|----|-------------|--------|-------------|------------|
| NFR-PERF-UoW02-01 | `POST /api/v1/auth/login` p95 latency (including argon2id verify + Redis rate-limit check) | ≤ 500 ms | Measured at BE entry point; excludes network | argon2id with params (mem=64 MiB, iter=3, par=2) takes ~150–250 ms on typical server hardware — login is not on the hot LLM path; 500 ms is acceptable |
| NFR-PERF-UoW02-02 | `POST /api/v1/auth/refresh` p95 latency | ≤ 80 ms | Measured at BE entry point | Redis GET + DEL + SET + JWT sign; no DB read; should be fast |
| NFR-PERF-UoW02-03 | JWT validation latency (RS256 verify per request, in-process) | ≤ 5 ms | Profiled via pino timer | Public key held in memory; pure crypto; no I/O |
| NFR-PERF-UoW02-04 | `POST /api/v1/auth/logout` p95 latency | ≤ 50 ms | Measured at BE entry point | Redis DEL only |

**Rationale for 500 ms login ceiling**: argon2id is intentionally slow (defense against offline cracking). The 500 ms ceiling allows for the full hash work on a 2-vCPU container. For the 5–10 pilot users this is imperceptible in practice; re-tune at scale if contention emerges.

---

## 2. Scalability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-SCAL-UoW02-01 | Peak simultaneous login attempts | 10 (MVP pilot) | No autoscaling needed for UoW-02 |
| NFR-SCAL-UoW02-02 | Refresh token entries in Redis | ≤ 100 (10 users × up to 10 device families) | Trivial at MVP scale |
| NFR-SCAL-UoW02-03 | JWT validation throughput | Stateless; scales horizontally without shared state | RS256 verify uses only in-memory public key — no Redis or DB call per request |

---

## 3. Availability & Reliability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-AVAIL-UoW02-01 | Auth endpoint availability | 99.5% monthly (inherits NFR-AVAIL-01) | Single-instance acceptable for internal pilot |
| NFR-RELI-UoW02-01 | Redis unavailability during rate-limit check | Fail-open with logged warning (do not block login) | At pilot scale (5–10 users), brute-force risk is negligible; a Redis outage should not prevent team members from logging in. Log `redis.unavailable` + alert. |
| NFR-RELI-UoW02-02 | Redis unavailability during token refresh | Return `503 Service Unavailable` | Without Redis the refresh token cannot be validated or rotated — returning 503 is safer than 401 (user retries; access token may still be valid for up to 15 min) |
| NFR-RELI-UoW02-03 | Postgres unavailability during login | Return `503 Service Unavailable` | Cannot verify credentials without the users table |
| NFR-RELI-UoW02-04 | Argon2id verify MUST be run in a worker thread or libuv thread pool | Required | Blocks the event loop if run synchronously; NestJS: use `argon2.verify()` which is async via native binding |

---

## 4. Security

*The Security Baseline extension is fully enabled. All 15 SECURITY-* rules are evaluated. Those applicable to UoW-02 are marked Applicable; others are N/A.*

| ID | Requirement | Target | SECURITY rule | Notes |
|----|-------------|--------|---------------|-------|
| NFR-SEC-UoW02-01 | Passwords hashed with argon2id; never stored in plaintext; never logged | Required (blocking) | SECURITY-05 | argon2id params: mem=65536 KiB, iter=3, par=2, out=32 B, salt=16 B (per BR-AUTH-003) |
| NFR-SEC-UoW02-02 | JWT signed with RS256; 15-min TTL; required claims: sub, role, email, jti, iat, exp | Required (blocking) | SECURITY-05 | Private key in env `JWT_PRIVATE_KEY`; public key in env `JWT_PUBLIC_KEY`; both base64-encoded PEM |
| NFR-SEC-UoW02-03 | Refresh tokens stored as SHA-256 digest only; raw token never persisted | Required (blocking) | SECURITY-05 | Raw token returned to client once; SHA-256 hex stored in Redis |
| NFR-SEC-UoW02-04 | Refresh tokens stored in HttpOnly + Secure + SameSite=Strict cookie | Required (blocking) | SECURITY-08 | Cookie set by Next.js BFF Route Handler; inaccessible to JavaScript |
| NFR-SEC-UoW02-05 | Login rate limiting: 5 failures / 1-min window → 15-min lockout | Required (blocking) | SECURITY-07 | Redis-backed; email normalized to lowercase before key construction |
| NFR-SEC-UoW02-06 | Login response is intentionally generic (no email/password distinction) | Required (blocking) | SECURITY-07 | Prevents user enumeration (BR-AUTH-001) |
| NFR-SEC-UoW02-07 | Refresh token reuse → full family revocation for that userId | Required (blocking) | SECURITY-05 | Token theft response; logs `auth.refresh_reuse` event |
| NFR-SEC-UoW02-08 | All auth events emitted as structured pino log entries with required fields | Required (blocking) | SECURITY-03 | Fields: event_type, user_id, ip, outcome, timestamp, service, version |
| NFR-SEC-UoW02-09 | No raw password, no raw refresh token, no JWT private key in logs | Required (blocking) | SECURITY-03 | Pino redact config: `['req.headers.authorization', 'body.password', 'body.refreshToken']` |
| NFR-SEC-UoW02-10 | CORS policy: `POST /api/v1/auth/*` accepts requests only from the web origin | Required | SECURITY-05 | NestJS CORS module: `origin: process.env.WEB_ORIGIN`; no wildcard |
| NFR-SEC-UoW02-11 | `Content-Security-Policy` header served by Next.js on `/login` page | Required | SECURITY-05 | Blocks XSS vector against login form; `script-src 'self'`, no `unsafe-inline` |
| NFR-SEC-UoW02-12 | No CSRF token required on NestJS auth endpoints | N/A — justified | SECURITY-05 | Auth API is stateless REST (not cookie-session); CSRF attacks require state to exploit. The refresh-token cookie is SameSite=Strict which is the primary CSRF defense. |

---

## 5. Observability

| Concern | Requirement | Notes |
|---------|-------------|-------|
| Structured auth events | Every login, login_failed, logout, refresh, refresh_reuse, authz.denied emits pino JSON with `event_type` | SECURITY-03; also satisfies CC-03 (audit log for writes) partially — full audit table integration in UoW-03 |
| Required pino fields per event | `timestamp`, `level`, `service`, `version`, `event_type`, `user_id` (or null), `ip`, `outcome` | Subset of the 10-field codiste baseline |
| No OTel spans yet | OTel instrumentation deferred to UoW-04 | Auth events will be back-tagged with trace IDs at UoW-04 |
| Redis connectivity alert | Log `redis.unavailable` at WARN level on connection failure; Sentry alert configured at UoW-04 | |

---

## 6. Maintainability / Test Coverage

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-MAINT-UoW02-01 | Unit test coverage for `AuthService` | ≥ 80% line coverage | Vitest; covers login happy-path, wrong password, rate-limit increment, lockout, account disabled, refresh rotation, reuse detection, logout |
| NFR-MAINT-UoW02-02 | E2E test covers full login → access token → refresh → logout cycle | Required | Vitest e2e via supertest against in-process NestJS app + test Redis instance |
| NFR-MAINT-UoW02-03 | PBT test: RoleGuard cross-product (role × route-role-requirement) | Required | PBT-04 (NFR-PBT-04): `fast-check` property covering all 3×3 = 9 (role, required_role) combinations; shopper→merchant = reject; admin→any = pass |
| NFR-MAINT-UoW02-04 | Password hash property test: `hash(p) !== p` for any p; `verify(hash(p), p) === true` always | Required | PBT-02; pure function property test |

---

## 7. Usability / Accessibility

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-A11Y-UoW02-01 | Login form keyboard operable | Required (Level A) | Inherits NFR-A11Y-01; tab order: email → password → show-toggle → submit |
| NFR-A11Y-UoW02-02 | Labels associated with inputs | Required (Level A) | `htmlFor`/`id` pairs; no placeholder-only labeling (NFR-A11Y-05) |
| NFR-A11Y-UoW02-03 | Error announcements via `role="alert"` | Required (Level A) | Screen reader reads error immediately on submission failure (NFR-A11Y-03) |
| NFR-A11Y-UoW02-04 | Meaningful page title | Required (Level A) | `title: 'Sign in — Chat-Native E-Commerce'` (NFR-A11Y-08) |
| NFR-A11Y-UoW02-05 | Rate-limit cooldown message includes time remaining | Required | Accessible countdown: text-based `Retry in X minutes`; no animation-only indicator |

---

## 8. AI/ML Quality

**N/A for UoW-02** — No LLM calls in the auth flow. First LLM appearance is UoW-06 (Orchestrator). All AIML-* rules are deferred and will be enforced from UoW-06 onward.

---

## Summary counts

| Category | NFR count |
|----------|-----------|
| Performance | 4 |
| Scalability | 3 |
| Availability & Reliability | 4 |
| Security | 12 (all blocking per Security Baseline extension) |
| Observability | 4 (table rows) |
| Maintainability / Testing | 4 |
| Accessibility | 5 |
| AI/ML | 0 (N/A) |
| **Total** | **36** |

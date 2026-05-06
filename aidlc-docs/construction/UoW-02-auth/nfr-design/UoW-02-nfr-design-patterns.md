# NFR Design Patterns — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:34:30Z
**Stage**: 10 — NFR Design
**UoW**: UoW-02

---

## Resilience

### P-RES-001: Redis fail-open for rate limiting
**Applies to**: NFR-RELI-UoW02-01 (Redis unavailability during rate-limit check)
**Implementation**:
- Wrap every Redis call in the rate-limit check with a `try/catch`
- On `RedisConnectionError` or timeout: log `{ level: 'warn', event_type: 'redis.unavailable', context: 'rate_limit' }` and continue with login (fail-open)
- No library needed beyond `ioredis` built-in error events
- Circuit breaker NOT needed at MVP scale (5–10 users); re-evaluate at scale

### P-RES-002: Redis fail-closed for token refresh
**Applies to**: NFR-RELI-UoW02-02 (Redis unavailability during token refresh)
**Implementation**:
- If `ioredis` throws on `GET rtoken:...`, catch and return HTTP 503 with `{ problem: 'service.unavailable', detail: 'Token store unavailable. Your current session remains valid for up to 15 minutes.' }`
- Log `{ level: 'error', event_type: 'redis.unavailable', context: 'token_refresh' }`
- Rationale: refresh is the security-critical path; we cannot issue new tokens without validating the old one

### P-RES-003: argon2id in async thread pool
**Applies to**: NFR-RELI-UoW02-04 (event loop blocking)
**Implementation**:
- Use `argon2.verify()` and `argon2.hash()` from the `argon2` npm package — both return Promises backed by libuv thread pool (native C++ binding)
- Never call synchronous password-check alternatives (`bcrypt.compareSync`, etc.)
- If the thread pool is saturated (stress test scenario), requests queue naturally in Node.js

---

## Performance

### P-PERF-001: JWT public key in-process cache
**Applies to**: NFR-PERF-UoW02-03 (JWT validation ≤ 5 ms)
**Implementation**:
- `@nestjs/jwt` + `passport-jwt` JwtStrategy loads the RS256 public key once at module init from `process.env.JWT_PUBLIC_KEY` (base64-decoded PEM)
- Key stored as module-level singleton in `JwtStrategy.constructor()`; no Redis or filesystem read per request
- TTL: lives for the lifetime of the process; key rotation requires a rolling restart (acceptable for MVP)

### P-PERF-002: Minimal DB surface during token refresh
**Applies to**: NFR-PERF-UoW02-02 (refresh ≤ 80 ms)
**Implementation**:
- `POST /api/v1/auth/refresh` does NOT hit Postgres at all — only Redis (GET + DEL + SET)
- The `role` and `email` claims for the new access token are re-read from the current (valid) access token's payload, not from the DB
- This means a role change by an admin does NOT take effect until both the access token AND refresh token expire; acceptable for 15-min access token TTL at MVP

---

## Security

### P-SEC-001: Layered request validation
**Applies to**: NFR-SEC-UoW02-01..12
**Implementation**:
```
Request arrives
    │
    ▼
[1] NestJS global ValidationPipe (class-validator DTOs)
    │  — rejects malformed bodies before reaching handler
    ▼
[2] pino request logger (logs ip, user-agent, route)
    │  — BEFORE any auth check (so failed attempts are logged)
    ▼
[3] JwtGuard (passport-jwt) — validates RS256 signature + expiry
    │  — returns 401 on invalid/expired; 200 on public routes
    ▼
[4] RolesGuard — checks @Roles() decorator vs JWT role claim
    │  — returns 403 on insufficient role; logs authz.denied
    ▼
[5] Rate limit check (Redis) — for /auth/login only
    │  — returns 429 + Retry-After on lockout
    ▼
[6] Handler executes
```

### P-SEC-002: pino redact for sensitive fields
**Applies to**: NFR-SEC-UoW02-09 (no secrets in logs)
**Implementation**:
- NestJS pino instance configured at bootstrap with `redact` array: `['req.headers.authorization', 'req.body.password', 'req.body.refreshToken', 'res.headers["set-cookie"]']`
- `pino-http` middleware serializes request; redact runs before log line emitted
- Test: unit test asserts that the pino instance never logs a string matching argon2id encoding pattern `$argon2id$`

### P-SEC-003: CORS + CSP headers
**Applies to**: NFR-SEC-UoW02-10, -11
**Implementation**:
- NestJS: `app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true, methods: ['GET','POST'], allowedHeaders: ['Content-Type','Authorization'] })`
- Next.js `next.config.ts` security headers:
  ```js
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
  ```

### P-SEC-004: Token rotation atomic swap (Redis MULTI/EXEC)
**Applies to**: NFR-SEC-UoW02-07 (refresh rotation + reuse detection)
**Implementation**:
- The delete-old + write-new operation during token refresh is wrapped in a Redis `MULTI/EXEC` transaction to prevent race conditions on concurrent refresh calls with the same token:
  ```
  MULTI
    DEL  rtoken:{userId}:{tokenFamily}
    SET  rtoken:{userId}:{tokenFamily} {newHash,...} EX 2592000
  EXEC
  ```
- If `EXEC` fails (watched key changed), retry once; on second failure return 503

---

## Observability

### P-OBS-001: Structured auth event logging
**Applies to**: NFR-SEC-UoW02-08, CC-03
**Implementation**:
- `AuthService` injects `Logger` (pino-backed NestJS logger); each auth operation calls `this.logger.log({ event_type, user_id, ip, outcome, ... })`
- `ip` extracted from `request.ip` (NestJS sets this from `X-Forwarded-For` if behind a proxy; configure `app.set('trust proxy', 1)` on the underlying Express instance)
- Events: `auth.login`, `auth.login_failed`, `auth.logout`, `auth.refresh`, `auth.refresh_reuse`, `authz.denied`

---

## Maintainability / Testing

### P-TEST-001: Unit test boundary for AuthService
**Applies to**: NFR-MAINT-UoW02-01
**Implementation**:
- Mock `ioredis` client with `vi.fn()` to test rate-limit increment paths without a real Redis
- Mock `PrismaClient` (or use `@prisma/client` mock) for user lookup
- Test cases: login success, wrong password, account disabled, lockout threshold, lockout in-effect, refresh valid, refresh expired, refresh reuse, logout success

### P-TEST-002: E2E auth cycle test
**Applies to**: NFR-MAINT-UoW02-02
**Implementation**:
- `api/test/auth.e2e-spec.ts` spins up in-process NestJS app + real test Redis (from `infra/docker-compose.yml` `redis` service during CI)
- Test flow: seed user → login → extract tokens → call protected route → refresh → call protected route again → logout → confirm refresh no longer works

### P-TEST-003: PBT for RoleGuard
**Applies to**: NFR-MAINT-UoW02-03
**Implementation**:
- `fast-check` arbitraries: `fc.constantFrom('shopper', 'merchant', 'admin')` for user role + required role
- Property: `hasRole(userRole, requiredRole)` returns true iff `userRole === requiredRole || userRole === 'admin'`
- Generates all 9 combinations automatically; asserts no false negatives or false positives

### P-TEST-004: PBT for password hash pure function
**Applies to**: NFR-MAINT-UoW02-04
**Implementation**:
- Property 1: for any string `p`, `hash(p) !== p` (output differs from input)
- Property 2: for any string `p`, `verify(hash(p), p) === true` (round-trip)
- `fast-check` arbitrary: `fc.string({ minLength: 12, maxLength: 72 })` (72-char bcrypt limit irrelevant for argon2 but good boundary test)
- Note: argon2 is async; test uses `async` property runner (`fc.asyncProperty`)

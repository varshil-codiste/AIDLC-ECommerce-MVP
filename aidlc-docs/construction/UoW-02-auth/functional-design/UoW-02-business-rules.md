# Business Rules — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:33:00Z
**Stage**: 8 — Functional Design
**UoW**: UoW-02 — Auth + role gate

---

## BR-AUTH-001: Email uniqueness + format

**Applies to**: Login, (future) signup
**Statement**: "An email address must be unique across all non-anonymized users, must conform to RFC 5321 (≤ 254 chars), and is treated as case-insensitive (CITEXT)."
**Enforcement**:
- DB: UNIQUE index on `app.users (email)` (CITEXT handles case folding at column level)
- API: login returns `401` on bad credentials (no distinction between wrong email vs wrong password to prevent user enumeration)
**Error code**: `auth.email.invalid` (format fail) | login just returns generic `auth.credentials.invalid`
**User-facing copy**: "Invalid email or password." (intentionally generic — enumeration prevention)

---

## BR-AUTH-002: Password strength

**Applies to**: (future) signup
**Statement**: "Passwords must be ≥ 12 characters. No maximum enforced (passwords are hashed, not stored)."
**Enforcement**:
- API: Joi/Zod schema validation at request boundary
- No regex strength rules (length is the primary predictor; complexity rules cause worse user choices)
**Error code**: `auth.password.too_short`
**User-facing copy**: "Password must be at least 12 characters."
**Note**: UoW-02 does not implement signup — seed data or admin tooling creates users. The rule is defined here so the signup UoW (post-MVP) inherits it.

---

## BR-AUTH-003: argon2id hashing parameters

**Applies to**: Password hash storage and verification
**Statement**: "Passwords must be hashed with argon2id using parameters: memory=65536 KiB (64 MiB), iterations=3, parallelism=2, output length=32 bytes, salt=16 random bytes per hash."
**Enforcement**:
- BE: `@node-rs/argon2` (native binding) or `argon2` npm package configured with the above params
- DB: `password_hash` column stores the full argon2id encoded string (contains algo + params + salt + digest)
- No BCrypt, no PBKDF2, no SHA-* for password storage
**Error code**: (internal only — not user-visible)
**Rationale**: OWASP Authentication Cheat Sheet 2025 recommended parameters for argon2id.

---

## BR-AUTH-004: JWT access token

**Applies to**: All authenticated API requests
**Statement**: "Access tokens are signed JWT (RS256) with TTL of 15 minutes. Required claims: `sub` (userId UUID), `role` (shopper|merchant|admin), `email`, `jti` (UUID4 unique per token), `iat`, `exp`."
**Enforcement**:
- BE: `@nestjs/jwt` with `algorithm: 'RS256'`; private key from env `JWT_PRIVATE_KEY`; public key from env `JWT_PUBLIC_KEY`
- Key pair: RSA-2048 minimum (prefer RSA-4096 or ES256 at Stage 16)
- JwtStrategy validates `exp` + `jti` blacklist NOT required for 15-min window (acceptable at MVP scale)
- `role` claim drives RoleGuard — never read from DB on each request (stateless)
**Error code**: `auth.token.invalid` | `auth.token.expired`
**User-facing copy**: "Your session has expired. Please sign in again."

---

## BR-AUTH-005: Refresh token storage + TTL

**Applies to**: Token refresh flow
**Statement**: "Refresh tokens are opaque UUID v4 strings. The raw token is never stored; only the SHA-256 hex digest is stored in Redis. TTL is 30 days sliding (reset on each successful rotation). Key pattern: `rtoken:{userId}:{tokenFamily}`."
**Enforcement**:
- BE: `crypto.randomUUID()` generates raw token; `createHash('sha256').update(raw).digest('hex')` stored in Redis
- Redis key per token family — a user can have multiple concurrent families (multiple devices)
- TTL: `EXPIRE rtoken:{userId}:{tokenFamily} 2592000` (30 × 86400 s)
**Error code**: `auth.refresh.invalid`
**User-facing copy**: "Your session has expired. Please sign in again."

---

## BR-AUTH-006: Refresh token rotation + reuse detection

**Applies to**: `POST /api/v1/auth/refresh`
**Statement**: "Each call to the refresh endpoint must invalidate the presented token and issue a new one (rotation). If a token from an already-rotated family is presented (reuse), ALL tokens for that userId must be immediately revoked (theft response)."
**Enforcement**:
- BE refresh handler:
  1. Hash incoming raw token → SHA-256
  2. Look up Redis key `rtoken:{userId}:{tokenFamily}` — if NOT FOUND → token invalid or expired → 401
  3. Compare stored hash with computed hash — if MISMATCH → token tampered → 401
  4. Check `rotationCount` — if presented token's family still exists but hash doesn't match → potential reuse; revoke ALL `rtoken:{userId}:*` → 401 with `auth.refresh.reuse_detected`
  5. On valid match: delete old key, write new key with incremented `rotationCount`, issue new access + refresh token pair
**Error code**: `auth.refresh.invalid` | `auth.refresh.reuse_detected`
**User-facing copy**: "Security alert — your session was revoked because a refresh token was reused. Please sign in again." (for reuse case — shown on next login attempt)

---

## BR-AUTH-007: Login rate limiting

**Applies to**: `POST /api/v1/auth/login`
**Statement**: "After 5 consecutive failed login attempts for a given email within any rolling 1-minute window, the account is rate-limited for 15 minutes. During the lockout, the login endpoint returns 429 with `Retry-After` header (seconds until unlock)."
**Enforcement**:
- BE: Redis counter `ratelimit:login:{email}` with TTL of 1 minute; on hit ≥ 5 within window, set lockout key `lockout:login:{email}` with TTL 900 s (15 min)
- Check lockout key FIRST before password verification (prevents timing attacks during lockout)
- Counter is reset on successful login
- Rate limiter uses `@nestjs/throttler` with a custom Redis storage adapter OR a manual Redis implementation
**Error code**: `auth.rate_limit.exceeded`
**User-facing copy**: "Too many failed attempts. Please try again in {X} minutes."
**Security note**: The email in the rate-limit key must be lowercased and normalized (same as CITEXT storage) to prevent bypass via case variation.

---

## BR-AUTH-008: Account status gate

**Applies to**: Login + every authenticated request
**Statement**: "Users with `status = 'disabled'` or `status = 'anonymized'` must be rejected at login with 401. Active JWTs for a disabled user are NOT immediately invalidated (stateless JWT) — invalidation happens at next token expiry (15-min window is acceptable for MVP; can add JTI blacklist post-MVP if needed)."
**Enforcement**:
- BE login handler: check `user.status` after password verification; reject if not 'active'
- Short access-token TTL (15 min) bounds the blast radius of a disabled-but-still-JWT-valid user
**Error code**: `auth.account.disabled`
**User-facing copy**: "This account is not active. Please contact support."

---

## BR-AUTH-009: Role gate (RoleGuard)

**Applies to**: All API routes that carry a `@Roles()` decorator
**Statement**: "A request may only reach a handler if the authenticated user's `role` claim (from JWT) satisfies the route's required role set. Admin role passes all role checks."
**Enforcement**:
- BE: `RolesGuard` reads `role` from `JwtStrategy`-populated `request.user.role`; compares against `@Roles('merchant')` decorator metadata
- Role escalation is not possible — users cannot change their own role
- Routes with NO `@Roles()` decorator are public (e.g., `/api/v1/auth/login`)
- Routes with `@Roles('merchant')` reject shoppers with 403 `authz.role.insufficient`
**Error code**: `authz.role.insufficient`
**User-facing copy**: "You don't have permission to perform this action."

---

## BR-AUTH-010: Logout (refresh token revocation)

**Applies to**: `POST /api/v1/auth/logout`
**Statement**: "Logout must delete the specific refresh token family presented in the request body. The access token cannot be revoked (stateless); it will expire naturally within 15 minutes."
**Enforcement**:
- BE: Requires a valid access token (Authorization: Bearer) AND the `refreshToken` in the request body
- Extract `tokenFamily` from the refresh payload, delete `rtoken:{userId}:{tokenFamily}` from Redis
- Return 204 No Content
- Clients MUST discard the access token from memory on logout (documented in API contract)
**Error code**: N/A (logout always succeeds even if token not found — idempotent)
**User-facing copy**: (none — UI navigates to login page on 204)

---

## BR-AUTH-011: Audit log on auth events

**Applies to**: login, logout, failed login, token refresh, role-denied
**Statement**: "Every authentication event must emit a structured audit entry via the application logger with `event_type` set to the auth event name. Audit log entries for user writes are forwarded to `audit.audit_log` at UoW-03; for UoW-02, logging is to pino structured output only."
**Enforcement**:
- BE: pino logger emits `event_type: 'auth.login'` | `'auth.login_failed'` | `'auth.logout'` | `'auth.refresh'` | `'auth.refresh_reuse'` | `'authz.denied'`
- Required fields: `event_type`, `user_id` (or null for anonymous), `ip` (from `X-Forwarded-For` or socket), `outcome` ('success'|'failure'), `timestamp`, `service`, `version`
**Error code**: N/A (observability, not a user-facing error)
**Traces**: CC-03, SECURITY-03

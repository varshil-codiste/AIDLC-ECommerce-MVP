# Logical Components — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:34:30Z
**Stage**: 10 — NFR Design
**UoW**: UoW-02

---

## LC-001: Refresh Token Store (Redis)

**Purpose**: Persist refresh token metadata for rotation, revocation, and reuse detection
**Type**: Key-value store with TTL
**Tech**: `ioredis` client connecting to the Redis 7 instance from `infra/docker-compose.yml` (local) or managed Redis (production, Stage 16)
**Key pattern**: `rtoken:{userId}:{tokenFamily}` → JSON `{ hashedToken, issuedAt, expiresAt, rotationCount }`
**TTL**: 2592000 s (30 days), sliding — reset on each successful rotation
**Eviction**: TTL-based; no additional LRU needed (keyspace is small at MVP scale)
**Failure mode**: Fail-open for rate limiting (P-RES-001); fail-closed for token refresh (P-RES-002)

---

## LC-002: Login Rate-Limit Store (Redis)

**Purpose**: Count failed login attempts per email; enforce 15-min lockout after 5 failures
**Type**: Counter + TTL flag in same Redis instance as LC-001
**Tech**: `ioredis`; two key types:
- Counter: `ratelimit:login:{email}` → INTEGER, TTL 60 s (1-min rolling window)
- Lockout flag: `lockout:login:{email}` → `"1"`, TTL 900 s (15 min)
**Operations**: INCR (counter), SET EX (lockout), GET (check lockout), DEL (reset on successful login)
**Failure mode**: Fail-open (P-RES-001) — Redis connection error skips rate-limit enforcement

---

## LC-003: JWT Signing / Verification (in-process)

**Purpose**: Issue RS256-signed access tokens and verify them on every authenticated request
**Type**: In-process crypto (no external service)
**Tech**: `@nestjs/jwt` + `jsonwebtoken` underneath; public/private key pair as base64-encoded PEM in environment variables
**Private key env**: `JWT_PRIVATE_KEY` (RSA-2048 PEM, base64-encoded)
**Public key env**: `JWT_PUBLIC_KEY` (matching public key PEM, base64-encoded)
**Token TTL**: 900 s (15 min)
**Key rotation**: Zero-downtime rotation requires running old + new public keys simultaneously — pattern: `JWT_PUBLIC_KEY_v2` + JwtStrategy accepts both during rotation window; deferred to post-MVP ops

---

## LC-004: User Repository (Postgres app.users)

**Purpose**: Persist user identity, role, argon2id password hash, and status
**Type**: Relational table in `app` schema
**Tech**: Prisma 5 ORM (PrismaClient singleton, shared across UoWs); managed by `prisma migrate deploy`
**Migration**: `UoW-02-001-create-users-table` (first production migration; creates `app.users` with all 9 columns + 2 indexes)
**Connection pool**: Prisma default (10 connections); sufficient for 5–10 pilot users

---

## LC-005: BFF Cookie Handler (Next.js Route Handler)

**Purpose**: Set / clear the HttpOnly refresh-token cookie on behalf of the browser; keeps token out of JavaScript scope
**Type**: Next.js App Router Route Handler (`app/api/auth/set-cookie/route.ts`)
**Tech**: `cookies()` from `next/headers` (server-only); no additional library
**Cookie attributes**: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000`
**Clear on logout**: Sets `Max-Age=0` to expire the cookie immediately

---

## LC-006: Route Protection Middleware (Next.js)

**Purpose**: Block unauthenticated access to protected routes at the edge before SSR runs
**Type**: Next.js `middleware.ts` (runs in the Edge runtime)
**Logic**: Checks presence of the HttpOnly cookie; redirects to `/login?returnTo=<path>` if absent
**Protected paths**: `/chat/**`, `/api/v1/**` (except `/api/v1/auth/*` — login/refresh/logout are public)
**Note**: Middleware does NOT validate the JWT (Edge crypto constraints + latency); JWT validation happens at NestJS. Middleware is a UX layer only.

---

## Component summary

| LC | Name | Tech | Role |
|----|------|------|------|
| LC-001 | Refresh Token Store | Redis (ioredis) | Token rotation + revocation |
| LC-002 | Login Rate-Limit Store | Redis (ioredis) | Brute-force protection |
| LC-003 | JWT Signing / Verification | @nestjs/jwt (in-process) | Access token issuance + validation |
| LC-004 | User Repository | Prisma + Postgres | Credential + role storage |
| LC-005 | BFF Cookie Handler | Next.js Route Handler | HttpOnly cookie management |
| LC-006 | Route Protection Middleware | Next.js middleware.ts | Edge-level auth guard |

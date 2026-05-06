# Business Logic Model — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:33:00Z
**Stage**: 8 — Functional Design
**UoW**: UoW-02 — Auth + role gate

---

## Workflow 1: Login (`POST /api/v1/auth/login`)

```mermaid
sequenceDiagram
    participant FE as FE (LoginForm)
    participant BE as BE (AuthController)
    participant RD as Redis
    participant DB as Postgres (app.users)

    FE->>BE: POST /api/v1/auth/login {email, password}
    BE->>BE: Validate request body (Zod schema)
    alt validation fails
        BE-->>FE: 400 Bad Request {problem: auth.request.invalid}
    end
    BE->>RD: GET lockout:login:{email}
    alt lockout exists
        BE-->>FE: 429 Too Many Requests {Retry-After: N, problem: auth.rate_limit.exceeded}
    end
    BE->>DB: SELECT * FROM app.users WHERE email = $1 AND status = 'active'
    alt user not found or status != active
        BE->>RD: INCR ratelimit:login:{email} (+ EXPIRE if new key)
        BE-->>FE: 401 Unauthorized {problem: auth.credentials.invalid}
    end
    BE->>BE: argon2id.verify(user.password_hash, password)
    alt hash mismatch
        BE->>RD: INCR ratelimit:login:{email}
        alt counter >= 5
            BE->>RD: SET lockout:login:{email} EX 900
        end
        BE-->>FE: 401 Unauthorized {problem: auth.credentials.invalid}
    end
    BE->>RD: DEL ratelimit:login:{email} (reset on success)
    BE->>BE: Generate accessToken (JWT RS256, 15 min TTL)
    BE->>BE: Generate refreshToken = crypto.randomUUID()
    BE->>BE: Compute hashedToken = SHA256(refreshToken)
    BE->>BE: Generate tokenFamily = crypto.randomUUID()
    BE->>RD: SET rtoken:{userId}:{tokenFamily} {hashedToken, rotationCount:0, ...} EX 2592000
    BE->>DB: UPDATE app.users SET last_active_at = now() WHERE id = $1
    BE->>BE: PINO log {event_type: auth.login, user_id, outcome: success}
    BE-->>FE: 200 OK {accessToken, refreshToken, tokenFamily, user: {id, role, name}}
```

**Text alternative**: The FE posts email + password. The BE first checks for a lockout in Redis. If locked out, it returns 429. Otherwise it loads the user from Postgres, verifies the argon2id hash, and on mismatch increments a Redis rate-limit counter (locking after 5 failures). On success it generates a JWT access token and an opaque refresh token (stored as SHA-256 in Redis), resets the rate-limit counter, updates `last_active_at` in Postgres, emits a pino auth.login log, and returns both tokens to the FE.

---

## Workflow 2: Token Refresh (`POST /api/v1/auth/refresh`)

```mermaid
sequenceDiagram
    participant FE as FE (token storage)
    participant BE as BE (AuthController)
    participant RD as Redis

    FE->>BE: POST /api/v1/auth/refresh {refreshToken, tokenFamily, userId}
    BE->>BE: Compute incoming hash = SHA256(refreshToken)
    BE->>RD: GET rtoken:{userId}:{tokenFamily}
    alt key not found (expired or already rotated)
        BE-->>FE: 401 Unauthorized {problem: auth.refresh.invalid}
    end
    alt stored hash != incoming hash
        BE->>RD: DEL rtoken:{userId}:* (family-wide revocation — potential theft)
        BE->>BE: PINO log {event_type: auth.refresh_reuse, user_id}
        BE-->>FE: 401 Unauthorized {problem: auth.refresh.reuse_detected}
    end
    BE->>RD: DEL rtoken:{userId}:{tokenFamily}
    BE->>BE: Generate new accessToken (JWT RS256, 15 min TTL)
    BE->>BE: Generate new refreshToken = crypto.randomUUID()
    BE->>BE: Compute new hashedToken = SHA256(newRefreshToken)
    BE->>RD: SET rtoken:{userId}:{tokenFamily} {newHashedToken, rotationCount+1, ...} EX 2592000
    BE->>BE: PINO log {event_type: auth.refresh, user_id, outcome: success}
    BE-->>FE: 200 OK {accessToken, refreshToken}
```

**Text alternative**: The FE sends the refresh token, token family, and userId. The BE hashes the incoming refresh token and looks up the Redis entry. If not found (expired), returns 401. If hashes don't match (replayed old token), revokes all token families for the user (theft response) and returns 401. On valid match, deletes the old entry, issues new access + refresh tokens into the same family with incremented rotation count, and returns them.

---

## Workflow 3: Logout (`POST /api/v1/auth/logout`)

```mermaid
sequenceDiagram
    participant FE as FE
    participant BE as BE (AuthController)
    participant RD as Redis

    FE->>BE: POST /api/v1/auth/logout {refreshToken, tokenFamily}<br/>Authorization: Bearer {accessToken}
    BE->>BE: JwtGuard validates accessToken
    alt access token invalid/expired
        BE-->>FE: 401 Unauthorized
    end
    BE->>RD: DEL rtoken:{userId}:{tokenFamily}
    BE->>BE: PINO log {event_type: auth.logout, user_id, outcome: success}
    BE-->>FE: 204 No Content
    FE->>FE: Discard accessToken + refreshToken from memory / cookie
    FE->>FE: Navigate to /login
```

**Text alternative**: The FE sends the access token (for auth) and the refresh token + family to revoke. The BE validates the access token, deletes the refresh token family from Redis, logs the event, and returns 204. The FE is responsible for discarding both tokens and navigating to the login page.

---

## Workflow 4: Authenticated request with RoleGuard

```mermaid
sequenceDiagram
    participant FE as FE
    participant BE as BE (any protected route)
    participant JWT as JwtStrategy
    participant RG as RolesGuard

    FE->>BE: GET /api/v1/merchant/... Authorization: Bearer {accessToken}
    BE->>JWT: Validate JWT signature + expiry
    alt invalid/expired
        JWT-->>FE: 401 {problem: auth.token.invalid|expired}
    end
    JWT->>JWT: Decode claims {sub, role, email, jti, exp}
    JWT->>BE: Attach request.user = {userId, role, email}
    BE->>RG: Check @Roles('merchant') against request.user.role
    alt role insufficient (e.g., shopper hitting merchant route)
        RG-->>FE: 403 {problem: authz.role.insufficient}
        RG->>RG: PINO log {event_type: authz.denied, user_id, role, route}
    end
    BE->>BE: Execute handler
    BE-->>FE: 200 (or handler-specific response)
```

**Text alternative**: Every protected route passes through JwtStrategy (validates the RS256 signature and expiry), which attaches the decoded user claims to the request. RolesGuard then checks if the user's role satisfies the decorator-declared required roles. If not, a 403 is returned and the denial is logged. Admin role bypasses all role checks.

---

## State Machine: User.status transitions

```
         ┌─────────────────────────────────────────┐
         │                                         │
         ▼                                         │
    [active] ──── admin disables ────► [disabled] ─┤
         │                                         │
         │                                 admin re-enables
         │                                         │
         └──── retention sweep (12 mo) ──► [anonymized]
                  (PII scrubbed; irreversible)
```

**Text alternative**: A user starts as `active`. An admin can move them to `disabled` (reversible via re-enable). After 12 months of inactivity, a retention sweep moves them to `anonymized` (irreversible — PII fields nulled/scrubbed). Both `disabled` and `anonymized` users are rejected at login.

---

## API Contract (UoW-02 endpoints — added to `shared/openapi.yaml`)

### POST /api/v1/auth/login
- **Request**: `{ email: string, password: string }`
- **Responses**:
  - `200`: `{ accessToken: string, refreshToken: string, tokenFamily: string, user: { id: string, role: 'shopper'|'merchant'|'admin', name: string|null } }`
  - `400`: Problem (auth.request.invalid)
  - `401`: Problem (auth.credentials.invalid | auth.account.disabled)
  - `429`: Problem (auth.rate_limit.exceeded) + `Retry-After` header

### POST /api/v1/auth/refresh
- **Request**: `{ refreshToken: string, tokenFamily: string, userId: string }`
- **Responses**:
  - `200`: `{ accessToken: string, refreshToken: string }`
  - `401`: Problem (auth.refresh.invalid | auth.refresh.reuse_detected)

### POST /api/v1/auth/logout
- **Security**: BearerAuth (JWT)
- **Request**: `{ refreshToken: string, tokenFamily: string }`
- **Responses**:
  - `204`: (no body)
  - `401`: Problem (auth.token.invalid | auth.token.expired)

---

## Seeding (UoW-02 dev tooling)

Since UoW-02 does not implement a signup endpoint, three seed users are created by `scripts/seed.ts` (dev-only):

| Email | Password | Role |
|-------|----------|------|
| shopper@example.com | TestShopper12345 | shopper |
| merchant@example.com | TestMerchant12345 | merchant |
| admin@example.com | TestAdmin12345 | admin |

Seed passwords meet BR-AUTH-002 (≥ 12 chars). Seed script: hashes via argon2id (same BR-AUTH-003 params), inserts into `app.users`. Only runs when `NODE_ENV=development`.

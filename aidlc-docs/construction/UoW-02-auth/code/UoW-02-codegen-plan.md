# Code Generation Plan — UoW-02 Auth + Role Gate

**Tier**: Greenfield (Comprehensive)
**Stacks in scope**: Backend Node.js (NestJS), Frontend (Next.js), Database (Postgres via Prisma), Cache (Redis via ioredis)
**Stories implemented**: SH-01 (auth parts), MR-01 (auth parts), CC-03 (auth-event audit logging)
**Generated at**: 2026-05-04T00:35:00Z

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC`
- **Layout**: Greenfield monorepo — `api/src/`, `web/`, `shared/` (same structure as UoW-01)
- **NEVER write code under**: `aidlc-docs/`

---

## New dependencies to install (before writing code)

Run in `api/`:
```
argon2 @nestjs/passport passport passport-jwt @nestjs/jwt jsonwebtoken
@types/passport-jwt @types/jsonwebtoken ioredis class-validator class-transformer
@nestjs/config fast-check cookie @types/cookie
```

---

## Steps

### Step 1: Install new dependencies

- [x] Add production deps to `api/package.json`: `argon2`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `jsonwebtoken`, `ioredis`, `class-validator`, `class-transformer`, `@nestjs/config`, `cookie`
- [x] Add dev deps to `api/package.json`: `@types/passport-jwt`, `@types/jsonwebtoken`, `@types/cookie`, `fast-check`, `@swc/core`, `unplugin-swc`
- [x] Update `web/package.json` — no new packages needed (auth-service uses native `fetch`)
- [x] Run `pnpm install` from workspace root to update `pnpm-lock.yaml`

---

### Step 2: Prisma schema + migration

- [x] Create/update `api/prisma/schema.prisma` — added `User` model with `multiSchema` + `postgresqlExtensions` preview features; `citext` extension added
- [x] Migration SQL file created at `api/prisma/migrations/20260504000000_UoW-02-001-create-users-table/migration.sql` (non-interactive env; used `db push` + manual SQL file)
- [x] Verified migration creates `app.users` with 9 columns, CHECK constraints, `users_email_idx` (UNIQUE), `users_last_active_at_idx`

---

### Step 3: NestJS AuthModule — directory scaffold

Files to create under `api/src/auth/`:

```
api/src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.service.spec.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── roles.decorator.ts
│   └── public.decorator.ts
├── dto/
│   ├── login.dto.ts
│   ├── refresh.dto.ts
│   └── logout.dto.ts
└── types/
    └── jwt-payload.type.ts
```

---

### Step 4: NestJS AuthModule — implementation files

- [x] `auth/types/jwt-payload.type.ts` — `JwtPayload` interface + `UserRole` type
- [x] `auth/dto/login.dto.ts` — `LoginDto` with class-validator decorators
- [x] `auth/dto/refresh.dto.ts` — `RefreshDto`
- [x] `auth/dto/logout.dto.ts` — `LogoutDto`
- [x] `auth/decorators/roles.decorator.ts` — `@Roles()` via `SetMetadata`
- [x] `auth/decorators/public.decorator.ts` — `@Public()` marker
- [x] `auth/strategies/jwt.strategy.ts` — RS256 JWT strategy; reads `JWT_PUBLIC_KEY_B64` from ConfigService
- [x] `auth/guards/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`; respects `@Public()`
- [x] `auth/guards/roles.guard.ts` — `CanActivate`; admin bypass; `authz.denied` log
- [x] `auth/auth.service.ts` — all methods implemented; rate-limit + lockout; reuse detection
- [x] `auth/auth.controller.ts` — login/refresh/logout endpoints at `/api/v1/auth/*`
- [x] `auth/auth.module.ts` — `JwtModule.registerAsync` RS256; exports guards
- [x] `health/health.controller.ts` — marked `@Public()` (added in this UoW; required by global guard)

---

### Step 5: Shared infrastructure modules

- [x] `api/src/prisma/prisma.module.ts` + `prisma.service.ts` — global `@Module` PrismaClient singleton
- [x] `api/src/redis/redis.module.ts` + `redis.service.ts` — global `@Module` ioredis service exposing get/setex/del/incr/expire/keys
- [x] `AppModule` registers `JwtAuthGuard` + `RolesGuard` as `APP_GUARD` providers (global guards)

---

### Step 6: AppModule updates

- [x] `api/src/app.module.ts` — `ConfigModule.forRoot({ isGlobal: true })`, `PrismaModule`, `RedisModule`, `AuthModule`; `APP_GUARD` for both guards
- [x] `api/src/main.ts` — global prefix `api/v1`, `ValidationPipe`, CORS with `WEB_ORIGIN`

---

### Step 7: OpenAPI contract update (`shared/openapi.yaml`)

- [x] `securitySchemes.BearerAuth` added
- [x] `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` paths added
- [x] All request/response schemas added

---

### Step 8: Environment variables update

- [x] `api/.env.example` — already had `JWT_PRIVATE_KEY_B64`, `JWT_PUBLIC_KEY_B64`, `REDIS_URL`, `WEB_ORIGIN` from UoW-01 planning; added `WEB_ORIGIN` to CI env
- [x] `scripts/generate-jwt-keys.sh` — created; generates RS256 keypair and prints base64 PEM values

---

### Step 9: Prisma seed file

- [x] `api/prisma/seed.ts` — creates 3 dev users (shopper, merchant, admin) with argon2id hashes; production guard
- [x] `api/package.json` `prisma.seed` field set to `"ts-node prisma/seed.ts"`
- [x] `scripts/seed-pilot-users.ts` stub replaced with delegation to `api/prisma/seed.ts`

---

### Step 10: Frontend — login page + auth service

- [x] `web/lib/auth-service.ts` — `login()`, `logout()`, `refreshToken()`, `getAccessToken()`, `getUser()`; in-memory + BFF cookie pattern
- [x] `web/app/api/auth/set-cookie/route.ts` — GET/POST/DELETE handlers for `rt_session` HttpOnly cookie
- [x] `web/app/login/page.tsx` — Server Component; `metadata.title` set; renders `<LoginPage />`
- [x] `web/components/auth/LoginPage.tsx` — Client Component; owns `serverError` state
- [x] `web/components/auth/BrandHeader.tsx` — static header
- [x] `web/components/auth/LoginForm.tsx` — controlled form; 401/429 error display; `router.push('/chat')`
- [x] `web/components/auth/EmailField.tsx` — `data-testid="login-form-email"`
- [x] `web/components/auth/PasswordField.tsx` — password toggle; `data-testid="login-form-password"`
- [x] `web/components/auth/ErrorBanner.tsx` — `role="alert"`; `data-testid="login-form-error-banner"`
- [x] `web/components/auth/SubmitButton.tsx` — `aria-busy`; `data-testid="login-form-submit"`
- [x] `web/middleware.ts` — protects `/chat/**`; redirects to `/login?returnTo=...`
- [x] `web/next.config.mjs` — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers

---

### Step 11: Tests

- [x] `api/src/auth/auth.service.spec.ts` — 12 unit tests, 1 PBT (fast-check); all pass ✅
- [x] `api/test/auth.e2e-spec.ts` — 5 e2e scenarios (login → refresh → logout → replay → 401); all pass ✅
- [x] `api/test/app.e2e-spec.ts` — updated with JWT keypair setup; health check passes ✅
- [x] `web/tests/login.spec.tsx` — 3 component tests; all pass ✅
- [x] Vitest configs updated with `unplugin-swc` to enable `emitDecoratorMetadata` for NestJS DI in tests

---

### Step 12: CI update

- [x] `.github/workflows/ci.yml` — Redis + Postgres services confirmed; added `WEB_ORIGIN` env var
- [x] `scripts/ci-api.sh` — added `prisma migrate deploy` step before tests
- [x] JWT keypairs generated in-process via `generateKeyPairSync()` in both e2e test files (no CI secrets required)

---

## Test Plan Summary

| Suite | File | Tests | Coverage target |
|-------|------|-------|-----------------|
| AuthService unit | `auth.service.spec.ts` | ~12 test cases | ≥ 80% line |
| RolesGuard PBT | `auth.service.spec.ts` | 1 fast-check property (9 combinations) | 100% decision table |
| Password hash PBT | `auth.service.spec.ts` | 2 fast-check properties | pure function coverage |
| Auth e2e | `auth.e2e-spec.ts` | 5 scenario flow | login→refresh→logout cycle |
| LoginForm unit | `login.spec.tsx` | 3 test cases | component rendering |

**Coverage gate**: ≥ 80% line coverage on `api/src/auth/` enforced at Gate #4.

---

## File count estimate

| Location | Files | Type |
|----------|-------|------|
| `api/src/auth/` | 13 | Source |
| `api/src/prisma/` | 2 | Infrastructure |
| `api/src/redis/` | 2 | Infrastructure |
| `api/prisma/` | 1 schema + 1 migration + 1 seed | Config |
| `shared/openapi.yaml` | 1 (updated) | Contract |
| `api/.env.example` | 1 (updated) | Config |
| `scripts/generate-jwt-keys.sh` | 1 | Tooling |
| `web/lib/` | 1 | FE service |
| `web/app/api/auth/set-cookie/` | 1 | FE route handler |
| `web/app/login/` | 1 | FE page |
| `web/components/auth/` | 6 | FE components |
| `web/middleware.ts` | 1 | FE middleware |
| `web/next.config.ts` | 1 (updated) | FE config |
| `api/src/auth/*.spec.ts` + `api/test/auth.e2e-spec.ts` + `web/tests/login.spec.tsx` | 3 | Tests |
| **Total new/modified** | **~37** | |

---

## Security compliance summary (Gate #3 preview)

| SECURITY rule | Status at plan stage |
|---------------|---------------------|
| SECURITY-01 (encryption at rest/transit) | Planned — argon2id for passwords; HTTPS-only constraint documented; Redis/DB TLS at Stage 16 |
| SECURITY-03 (structured auth logging) | Planned — P-OBS-001; pino redact config |
| SECURITY-05 (auth standards) | Planned — JWT RS256 15-min + refresh rotation + reuse detection |
| SECURITY-07 (brute-force protection) | Planned — BR-AUTH-007; Redis rate-limit + 15-min lockout |
| SECURITY-08 (token storage) | Planned — BFF HttpOnly cookie + in-memory access token |
| All other SECURITY rules | N/A for UoW-02 (no LB/CDN, no SQL injection surface in auth-only UoW, etc.) |

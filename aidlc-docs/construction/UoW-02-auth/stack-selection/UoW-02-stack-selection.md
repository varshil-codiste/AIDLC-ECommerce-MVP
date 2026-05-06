# Stack Selection — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:34:45Z
**Stage**: 11 — Stack Selection
**UoW**: UoW-02
**Decision type**: Confirmation pass — all choices inherited from UoW-01 baseline + codiste preset

---

## Stacks in scope for UoW-02

| Stack | In scope | Notes |
|-------|----------|-------|
| Frontend (Web) | ✅ Yes | Login page |
| Backend Node.js | ✅ Yes | NestJS AuthModule, endpoints, guards |
| Backend Python | No | Not in project |
| Backend Go | No | Not in project |
| Mobile Flutter | No | Not in project |
| Database (Postgres) | ✅ Yes | `app.users` table via Prisma migration |
| Cache (Redis) | ✅ Yes | Refresh token store + rate-limit counters |

---

## Block A — Frontend (Web)

| Choice | Selected | Version |
|--------|----------|---------|
| Framework | **Next.js (App Router)** | 15.5.15 |
| State management | `useState` (form state); no global store needed for auth | — |
| Server state / data fetching | Direct `fetch` in `authService.ts` (no TanStack Query for UoW-02; introduced at UoW-05) | — |
| Styling | Tailwind CSS (already in `web/`) | 3.x |
| Form handling | Controlled React state (no react-hook-form at this stage) | — |
| Test runner | Vitest + `@testing-library/react` | 2.1.8 |

**Conventions file**: `.aidlc/aidlc-rule-details/construction/stacks/frontend-nextjs-conventions.md`

---

## Block B — Backend Node.js

| Choice | Selected | Version |
|--------|----------|---------|
| Framework | **NestJS** (modular monolith) | 11.1.19 |
| Auth | `@nestjs/passport` + `passport-jwt` + `@nestjs/jwt` | latest compatible |
| Password hashing | `argon2` (async native binding) | ^0.31 |
| Validation | `class-validator` + `class-transformer` (NestJS ValidationPipe) | ^0.14 / ^0.5 |
| Redis client | `ioredis` | ^5 |
| Logging | `pino` + `pino-http` (already bootstrapped in UoW-01) | ^9 |
| ORM | Prisma 5 (PrismaClient + Prisma Migrate) | 5.x |
| Test runner | Vitest + supertest | 2.1.2 |
| PBT | `fast-check` | ^3 |

**Conventions file**: `.aidlc/aidlc-rule-details/construction/stacks/backend-nestjs-conventions.md`

---

## Block C — Database (Postgres)

| Choice | Selected | Notes |
|--------|----------|-------|
| Engine | Postgres 15 + pgvector | Already in `infra/docker-compose.yml` |
| ORM / migration tool | Prisma Migrate | Named timestamped migrations; `UoW-02-001-create-users-table` |
| Schema | `app` schema (operational); `audit` schema (append-only) | Both initialized in `infra/postgres/init.sql` (UoW-01) |

---

## Block D — Cache (Redis)

| Choice | Selected | Notes |
|--------|----------|-------|
| Engine | Redis 7 Alpine | Already in `infra/docker-compose.yml` with AOF persistence |
| Client | `ioredis` | Supports MULTI/EXEC; async/await API |
| Persistence | AOF enabled in local dev | Production: managed Redis with persistence (Stage 16) |

---

## New dependencies to add (vs UoW-01 baseline)

| Package | Location | Version | Purpose |
|---------|----------|---------|---------|
| `@nestjs/passport` | api devDeps + deps | ^11 | Passport integration for NestJS |
| `passport` | api deps | ^0.7 | Passport core |
| `passport-jwt` | api deps | ^4 | JWT strategy for Passport |
| `@nestjs/jwt` | api deps | ^11 | JWT module for NestJS |
| `jsonwebtoken` | api deps | ^9 | JWT encode/decode (peer dep) |
| `@types/passport-jwt` | api devDeps | ^4 | TypeScript types |
| `@types/jsonwebtoken` | api devDeps | ^9 | TypeScript types |
| `argon2` | api deps | ^0.31 | argon2id password hashing (async native) |
| `ioredis` | api deps | ^5 | Redis client |
| `@types/ioredis` | N/A | — | Types built-in to ioredis v5+ |
| `class-validator` | api deps | ^0.14 | DTO validation decorators |
| `class-transformer` | api deps | ^0.5 | DTO transformation |
| `fast-check` | api devDeps | ^3 | PBT library |
| `@nestjs/config` | api deps | ^4 | Config module (for env vars) |
| `cookie` | api deps | ^0.7 | Cookie parsing (server-side) |
| `@types/cookie` | api devDeps | ^0.6 | Types |

---

## Stage 11 verdict

All choices confirmed from existing baseline. No new framework introductions. Stack is ready for Code Generation (Stage 12).

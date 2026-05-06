# Stack Selection — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**Generated**: 2026-05-05T12:35:00Z  
**Stage**: 11 — Stack Selection  
**UoW**: UoW-03  
**Decision type**: Confirmation pass — all choices inherited from UoW-01/02 baseline; one new package added (`@nestjs/schedule`)

---

## Stacks in Scope for UoW-03

| Stack | In scope | Notes |
|-------|----------|-------|
| Frontend (Web) | No | UoW-03 is BE+DB only |
| Backend Node.js | Yes | NestJS — AuditModule, IdempotencyModule, OutboxModule, PersistenceModule (Prisma schema) |
| Backend Python | No | Not in project |
| Backend Go | No | Not in project |
| Mobile Flutter | No | Not in project |
| Database (Postgres) | Yes | Full 15-table schema migration; audit schema; append-only trigger |
| Cache (Redis) | Yes | ioredis — outbox drain XADD (existing client) |

---

## Block B — Backend Node.js

All choices locked from UoW-01/02. Confirmation only.

| Choice | Selected | Version | Source |
|--------|----------|---------|--------|
| Framework | **NestJS** (modular monolith) | 11.x | UoW-01 |
| ORM / migration | **Prisma 5** (PrismaClient + Prisma Migrate) | 5.x | UoW-01 |
| Redis client | **ioredis** | ^5 | UoW-02 |
| Validation | `class-validator` + `class-transformer` | ^0.14 / ^0.5 | UoW-02 |
| Logging | `pino` + `pino-http` | ^9 | UoW-01 |
| Test runner | **Vitest** + supertest | 2.x | UoW-01 |
| PBT library | **fast-check** | ^3 | UoW-02 |
| Lint / format | ESLint + Prettier | — | UoW-01 |
| Scheduler | **`@nestjs/schedule`** | ^4 | **New — UoW-03** |
| Request context | Node.js `AsyncLocalStorage` (stdlib) | built-in | **New — UoW-03** |

---

## Block C — Database (Postgres)

| Choice | Selected | Notes |
|--------|----------|-------|
| Engine | Postgres 16 + pgvector | Already running in docker-compose |
| ORM / migration tool | Prisma Migrate | Migration naming: `<timestamp>_UoW-03-<seq>-<description>` |
| Schemas | `app` (operational, app_role) + `audit` (append-only, audit_writer_role) | Both declared in `schema.prisma` already |

**New migration plan**:
- `<ts>_UoW-03-001-full-schema` — all 14 remaining `app.*` tables + all indexes
- `<ts>_UoW-03-002-audit-schema` — `audit.audit_log` table + `tg_audit_log_no_update_delete` trigger + `audit.fn_audit_log_immutable()` function
- `<ts>_UoW-03-003-db-roles` — `CREATE ROLE audit_writer_role`; GRANT INSERT on `audit.audit_log`; REVOKE UPDATE/DELETE from all roles

---

## Block D — Cache (Redis)

| Choice | Selected | Notes |
|--------|----------|-------|
| Engine | Redis 7 Alpine | Existing |
| Client | ioredis | Existing; pipeline mode for outbox drain batch |
| Streams | Redis Streams (XADD / consumer groups) | New usage in UoW-03 — drain worker XADDs to `events:*` streams |

---

## New Dependencies (vs UoW-02 baseline)

| Package | Location | Version | Purpose |
|---------|----------|---------|---------|
| `@nestjs/schedule` | api deps | ^4 | `@Interval()` + `@Cron()` for OutboxDrainWorker + idempotency cleanup |

No other new packages. `AsyncLocalStorage` is Node.js 16+ stdlib.

---

## Conventions Files Loaded

- `.aidlc/aidlc-rule-details/construction/stacks/node-conventions.md` ✅ (Backend Node.js / NestJS)

Frontend and Mobile conventions not loaded — no FE/Mobile in this UoW.

---

## NFR Constraint Check

| NFR | Constraint | Stack choice honours it |
|-----|-----------|------------------------|
| NFR-RELI-UoW03-01 (audit atomicity) | Must use Prisma interactive transactions | ✅ Prisma `$transaction()` with timeout |
| NFR-SEC-UoW03-01 (audit_writer_role) | Two PrismaClient instances, two env vars | ✅ `AuditPrismaService` separate from `PrismaService` |
| NFR-PERF-UoW03-04 (drain ≤ 500 ms) | ioredis pipeline — batch XADD | ✅ ioredis `pipeline().exec()` |
| NFR-SCAL-UoW03-04 (parallel-safe drain) | `FOR UPDATE SKIP LOCKED` | ✅ `prisma.$queryRaw` |
| NFR-PBT-UoW03-01–04 (PBT pure functions) | Pure static methods for fingerprint/payload/sanitise | ✅ designed as pure statics |

---

## Stage 11 Verdict

All choices confirmed. One new package (`@nestjs/schedule`). Stack ready for Code Generation (Stage 12).

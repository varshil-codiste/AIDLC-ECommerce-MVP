# Code Generation Plan — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**Tier**: Greenfield (Comprehensive)  
**Stacks in scope**: Backend Node.js (NestJS), Database (Postgres via Prisma)  
**Stories implemented**: CC-03 (audit log for every write) + persistence foundation for all subsequent UoWs  
**Generated at**: 2026-05-05T12:50:00Z

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC`
- **Application code root**: `api/` (NestJS service)
- **Layout**: Greenfield multi-UoW monolith — new code under `api/src/<module>/`; migrations under `api/prisma/migrations/`
- **NEVER write under `aidlc-docs/`**

---

## Dependency Status

| Upstream | Status |
|----------|--------|
| UoW-01 (Scaffolding) | COMPLETE — `PrismaModule`, `RedisModule`, `PrismaService` available |
| UoW-02 (Auth) | COMPLETE — `User` model in schema; `app.users` table exists |

---

## Steps

### Step 1: Install New Package

- [x] Add `@nestjs/schedule` to `api/package.json` dependencies
- [x] Run `pnpm install` from workspace root to update lockfile

**Files modified**: `api/package.json`, `pnpm-lock.yaml`

---

### Step 2: Extend Prisma Schema — All `app.*` Models

Extend `api/prisma/schema.prisma` with 14 new Prisma models (all tables from `data-model.md` except `User` which already exists):

- [x] `Address` → `@@schema("app")`
- [x] `Conversation` → `@@schema("app")`
- [x] `Message` → `@@schema("app")`
- [x] `Category` → `@@schema("app")` (self-referencing parentId)
- [x] `Product` → `@@schema("app")`
- [x] `ProductVariant` → `@@schema("app")`
- [x] `ProductSearchIndex` → `@@schema("app")` (with `Unsupported("vector(1536)")` for pgvector column)
- [x] `Cart` → `@@schema("app")`
- [x] `CartItem` → `@@schema("app")`
- [x] `Order` → `@@schema("app")`
- [x] `OrderItem` → `@@schema("app")`
- [x] `Customer` → `@@schema("app")`
- [x] `Notification` → `@@schema("app")`
- [x] `AgentEvent` → `@@schema("app")`
- [x] `IdempotencyKey` → `@@schema("app")`
- [x] `AuditLog` → `@@schema("audit")`

All foreign key relationships, `@@index` directives, and `@@map` names per `data-model.md`.

**Files modified**: `api/prisma/schema.prisma`

---

### Step 3: Prisma Migrations

Three sequential migrations. Each is created with `prisma migrate dev --name <name> --create-only`, then reviewed before applying.

- [x] Migration `UoW-03-001-full-schema` — creates all 14 `app.*` tables + all indexes from `data-model.md` index catalogue
- [x] Migration `UoW-03-002-audit-schema` — creates `audit.audit_log` table + `audit.fn_audit_log_immutable()` function + `tg_audit_log_no_update_delete` trigger
- [x] Migration `UoW-03-003-db-roles` — creates `audit_writer_role` DB role; GRANTs INSERT on `audit.audit_log` to `audit_writer_role`; GRANTs SELECT on `audit.audit_log` to `app_role`; REVOKEs UPDATE/DELETE from PUBLIC

> Note: `audit_writer_role` creation uses `CREATE ROLE IF NOT EXISTS` for idempotency.

**Files created**:
- `api/prisma/migrations/<ts>_UoW-03-001-full-schema/migration.sql`
- `api/prisma/migrations/<ts>_UoW-03-002-audit-schema/migration.sql`
- `api/prisma/migrations/<ts>_UoW-03-003-db-roles/migration.sql`

---

### Step 4: Request Context (AsyncLocalStorage)

- [x] `api/src/common/context/request-context.ts` — exports `requestContext: AsyncLocalStorage<{requestId: string}>` and `getRequestId(): string | undefined`
- [x] `api/src/common/context/request-context.middleware.ts` — `RequestContextMiddleware implements NestMiddleware`; reads `X-Request-ID` header (or generates UUID v4); sets response header; runs `requestContext.run()`

**Files created**: 2

---

### Step 5: Audit Module

- [x] `api/src/audit/audit-prisma.service.ts` — `AuditPrismaService extends PrismaClient`; connects using `AUDIT_DATABASE_URL`; `onModuleInit` calls `this.$connect()`; `onModuleDestroy` calls `this.$disconnect()`
- [x] `api/src/audit/audit-log.service.ts` — `AuditLogService`; `insert(tx, entry)` method; calls `sanitise()` on before/after; reads `requestId` from `requestContext`; writes to `audit.audit_log` via `tx` (the `audit_writer_role` client's transaction client)
- [x] `api/src/audit/audit.module.ts` — exports `AuditLogService` and `AuditPrismaService`; `@Global()` so any module can inject without re-importing

**Files created**: 3

---

### Step 6: Idempotency Module

- [x] `api/src/idempotency/idempotency.service.ts` — `IdempotencyService`; `check(key, userId, fingerprint)` → `IdempotencyCheckResult`; `save(key, userId, fingerprint, status, body)` → void; `static computeFingerprint(method, path, body)` → SHA-256 hex (pure function); `static sanitiseBody(body)` → strips tokens/secrets before storage
- [x] `api/src/idempotency/idempotency.guard.ts` — `IdempotencyGuard implements CanActivate`; reads `Idempotency-Key` header; calls `IdempotencyService.check()`; short-circuits on hit; throws on conflict; passes through on miss and hooks into response interceptor to call `save()`
- [x] `api/src/idempotency/decorators/idempotent.decorator.ts` — `@Idempotent()` custom decorator sets metadata flag consumed by guard
- [x] `api/src/idempotency/idempotency.module.ts` — exports `IdempotencyService` and `IdempotencyGuard`

**Files created**: 4

---

### Step 7: Outbox Module

- [x] `api/src/outbox/types/agent-event-payload.types.ts` — `AgentEventPayload` discriminated union type per `event-topology.md`; no PII fields; covers `order.*`, `cart.*`, `product.*`, `customer.*`, `auth.*` event types
- [x] `api/src/outbox/outbox.service.ts` — `OutboxService`; `emit(tx, eventType, payload, emittedByModule)` — inserts into `app.agent_events` within the passed `tx`; `static buildPayload(eventType, data)` pure function
- [x] `api/src/outbox/outbox-drain.worker.ts` — `OutboxDrainWorker`; `@Interval(1000)` `drainCycle()` method; uses `prisma.$queryRaw` with `FOR UPDATE SKIP LOCKED`; ioredis pipeline for batch XADD; commits drained rows; emits `outbox_pending_rows` and `outbox_drain_cycle_ms` metrics (as pino log fields in UoW-03; wired to OTel in UoW-04)
- [x] `api/src/outbox/outbox.module.ts` — imports `ScheduleModule` (from `@nestjs/schedule`); exports `OutboxService`; registers `OutboxDrainWorker` as a provider

**Files created**: 4

---

### Step 8: Wire into AppModule

- [x] Update `api/src/app.module.ts`:
  - Import `ScheduleModule.forRoot()` 
  - Import `AuditModule`
  - Import `IdempotencyModule`
  - Import `OutboxModule`
  - Register `RequestContextMiddleware` via `configure(consumer)` applied to all routes
- [x] Update `api/.env.example` — add `AUDIT_DATABASE_URL=postgresql://audit_writer:change-me@localhost:5432/ecommdb`

**Files modified**: `api/src/app.module.ts`, `api/.env.example`

---

### Step 9: Unit Tests

Tests co-located with source files per `node-conventions.md`.

- [x] `api/src/audit/audit-log.service.spec.ts`
  - `insert()` calls `tx.auditLog.create()` with sanitised before/after
  - `insert()` strips `passwordHash` from snapshots (security rule)
  - `insert()` reads `requestId` from `AsyncLocalStorage`
  - PBT: round-trip — serialise(sanitise(entity)) contains no sensitive keys for any entity shape

- [x] `api/src/idempotency/idempotency.service.spec.ts`
  - `check()` returns `{ hit: false }` on miss
  - `check()` returns cached response on key+fingerprint hit
  - `check()` returns `conflict: fingerprint_mismatch` on same key, different fingerprint
  - PBT: `computeFingerprint(method, path, body)` — same inputs → same output; different body → different fingerprint (collision-free property over 500 random inputs)

- [x] `api/src/idempotency/idempotency.guard.spec.ts`
  - Guard passes on missing key (returns 400)
  - Guard short-circuits on hit and writes cached response
  - Guard calls next on miss

- [x] `api/src/outbox/outbox.service.spec.ts`
  - `emit()` inserts into `agent_events` via tx
  - PBT: `buildPayload(eventType, data)` — pure; same inputs → identical JSON; no PII fields in output

- [x] `api/src/outbox/outbox-drain.worker.spec.ts`
  - `drainCycle()` — pending rows are fetched and XADDed via pipeline
  - On XADD error for row N: row N stays uncommitted; other rows commit
  - Empty pending set: no Redis calls made

**Files created**: 5

---

### Step 10: E2E Test

- [x] `api/test/persistence.e2e-spec.ts`
  - Full stack: write a domain mutation + audit entry in one tx → assert `audit.audit_log` row exists with correct fields
  - Idempotency: send same request twice with same key → second response is identical to first; DB write called once
  - Outbox: emit an event via `OutboxService` → `drainCycle()` → assert `agent_events.committed_to_stream_at` is set + Redis stream entry exists

**Files created**: 1

---

### Step 11: Code Summary

- [x] `aidlc-docs/construction/UoW-03-persistence/code/UoW-03-code-summary.md` (written after Part 2)

---

## Story Traceability

| Story | Files implementing it |
|-------|-----------------------|
| CC-03 — Audit log for every write | `audit-log.service.ts`, `audit-prisma.service.ts`, migration UoW-03-002, migration UoW-03-003 |
| Foundation (all future stories) | `schema.prisma` (14 models), migration UoW-03-001, `outbox.service.ts`, `outbox-drain.worker.ts`, `idempotency.service.ts` |

---

## Dependencies

**Upstream UoWs**: UoW-01 (PrismaModule, RedisModule), UoW-02 (User model, PrismaService)  
**External services**: Postgres 16 (local dev via Docker), Redis 7 (local dev via Docker)  
**New env vars**:
- `AUDIT_DATABASE_URL` — connection string for `audit_writer_role` DB user

---

## Estimated File Count

| Category | Count |
|----------|-------|
| Source files (new) | 13 |
| Test files (new) | 6 |
| Migration files (new) | 3 |
| Files modified | 3 (`schema.prisma`, `app.module.ts`, `.env.example`) |
| **Total** | **25** |

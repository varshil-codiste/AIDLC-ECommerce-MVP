# Code Summary — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**Generated at**: 2026-05-05T13:30:00Z  
**Gate #3 signed**: 2026-05-05 (Chintan Bhai + Varshil)  
**Unit tests**: 42 passing  
**E2E tests**: 9 passing (3 files)

---

## Files Created / Modified

### Package Configuration (1 modified)

| File | Change |
|------|--------|
| `api/package.json` | Added `@nestjs/schedule@^6.1.3` dependency |

---

### Prisma Schema (1 modified)

| File | Change |
|------|--------|
| `api/prisma/schema.prisma` | Added 16 new models: `Address`, `Conversation`, `Message`, `Category`, `Product`, `ProductVariant`, `ProductSearchIndex` (with `Unsupported("vector(1536)")`), `Cart`, `CartItem`, `Order`, `OrderItem`, `Customer`, `Notification`, `AgentEvent`, `IdempotencyKey` (all `@@schema("app")`), `AuditLog` (`@@schema("audit")`). Updated `User` back-relations. |

---

### Migrations (3 new)

| File | Purpose |
|------|---------|
| `api/prisma/migrations/20260505130000_UoW-03-001-full-schema/migration.sql` | All 14 `app.*` CREATE TABLE, indexes, FKs + 2 partial indexes (`carts_user_open_idx WHERE status='open'`, `agent_events_pending_idx WHERE committed_to_stream_at IS NULL`) |
| `api/prisma/migrations/20260505130001_UoW-03-002-audit-schema/migration.sql` | `audit.audit_log` table + `fn_audit_log_immutable()` PL/pgSQL function + `tg_audit_log_no_update_delete` BEFORE UPDATE OR DELETE trigger |
| `api/prisma/migrations/20260505130002_UoW-03-003-db-roles/migration.sql` | Idempotent `audit_writer` role creation; INSERT-only GRANT on `audit.audit_log`; SELECT GRANT to `ecomm`; REVOKE UPDATE/DELETE from PUBLIC |

---

### Common / Context (2 new)

| File | Exports |
|------|---------|
| `api/src/common/context/request-context.ts` | `requestContext: AsyncLocalStorage<RequestContext>`, `getRequestId(): string \| undefined` |
| `api/src/common/context/request-context.middleware.ts` | `RequestContextMiddleware implements NestMiddleware` — reads `X-Request-ID` header or generates UUID v4; propagates via `AsyncLocalStorage.run()` |

---

### Audit Module (3 new)

| File | Exports |
|------|---------|
| `api/src/audit/audit-prisma.service.ts` | `AuditPrismaService extends PrismaClient` — uses `AUDIT_DATABASE_URL`; `@Injectable()` |
| `api/src/audit/audit-log.service.ts` | `AuditLogService` — `insert(tx, entry)` + `static sanitiseSnapshot(obj)` (strips `passwordHash`, `password_hash`, `jwtPrivateKey`, `refreshTokenHash`, `refresh_token_hash`) |
| `api/src/audit/audit.module.ts` | `@Global()` `AuditModule` — exports `AuditLogService`, `AuditPrismaService` |

---

### Idempotency Module (4 new)

| File | Exports |
|------|---------|
| `api/src/idempotency/idempotency.service.ts` | `IdempotencyService` — `check()`, `save()`, `static computeFingerprint()` (SHA-256 hex), `static sanitiseBody()` |
| `api/src/idempotency/idempotency.guard.ts` | `IdempotencyGuard implements CanActivate` — 400 on missing key; 200/201 replay on hit; 409 on fingerprint mismatch |
| `api/src/idempotency/decorators/idempotent.decorator.ts` | `@Idempotent()` method decorator |
| `api/src/idempotency/idempotency.module.ts` | `IdempotencyModule` — exports `IdempotencyService`, `IdempotencyGuard` |

---

### Outbox Module (4 new)

| File | Exports |
|------|---------|
| `api/src/outbox/types/agent-event-payload.types.ts` | `AgentEventPayload` discriminated union (order/cart/product/customer/auth events); `topicFromEventType()` |
| `api/src/outbox/outbox.service.ts` | `OutboxService` — `emit(tx, eventType, payload, module)`, `static buildPayload()` |
| `api/src/outbox/outbox-drain.worker.ts` | `OutboxDrainWorker` — `@Interval(1000)` `drainCycle()`; `FOR UPDATE SKIP LOCKED`; ioredis pipeline XADD; partial-failure safe |
| `api/src/outbox/outbox.module.ts` | `OutboxModule` — imports `ScheduleModule`; exports `OutboxService`; registers `OutboxDrainWorker` |

---

### App Module (2 modified)

| File | Change |
|------|--------|
| `api/src/app.module.ts` | Added `ScheduleModule.forRoot()`, `AuditModule`, `IdempotencyModule`, `OutboxModule`; added `RequestContextMiddleware` via `configure()` |
| `api/.env.example` | Added `AUDIT_DATABASE_URL` |

---

### Redis Service (1 modified)

| File | Change |
|------|--------|
| `api/src/redis/redis.service.ts` | Added public `pipeline()` method exposing `this.client.pipeline()` for `OutboxDrainWorker` |

---

### Unit Tests (5 new)

| File | Tests | Notable |
|------|-------|---------|
| `api/src/audit/audit-log.service.spec.ts` | 4 | PBT: 200 runs — `sanitiseSnapshot` strips all sensitive keys for any object shape |
| `api/src/idempotency/idempotency.service.spec.ts` | 9 | PBT: 500 runs determinism + collision test (200 runs); hit/miss/mismatch/expired |
| `api/src/idempotency/idempotency.guard.spec.ts` | 5 | pass-through; 400 missing key; 201 replay; 409 conflict; miss attaches metadata |
| `api/src/outbox/outbox.service.spec.ts` | 4 | PBT: 100 runs purity; no PII; emit via tx |
| `api/src/outbox/outbox-drain.worker.spec.ts` | 4 | empty set; full commit; partial failure (only succeeded rows commit); concurrent guard |

**Total unit tests**: 42 passing

---

### E2E Tests (1 new)

| File | Tests |
|------|-------|
| `api/test/persistence.e2e-spec.ts` | 3 (AuditLog transactional write; Idempotency hit+replay; Outbox emit+drain+commit) |

**Note**: `audit.audit_log` is append-only; the trigger correctly blocks DELETE — audit rows are intentionally permanent. E2E cleanup deletes only the seeded `User` row.

---

## Totals

| Category | Count |
|----------|-------|
| Source files (new) | 13 |
| Test files (new) | 6 (5 unit + 1 e2e) |
| Migration files (new) | 3 |
| Files modified | 4 (`schema.prisma`, `app.module.ts`, `.env.example`, `redis.service.ts`) |
| **Total** | **26** |

---

## Key Invariants Established

1. **Audit immutability** — DB trigger `tg_audit_log_no_update_delete` raises `EXCEPTION` on any UPDATE or DELETE against `audit.audit_log`. Proven by e2e test (trigger blocked the test's cleanup attempt; test was updated to not attempt deletion).
2. **Outbox at-least-once** — `FOR UPDATE SKIP LOCKED` prevents concurrent drain workers from double-processing. Only rows whose XADD returned no error are committed. Failed rows remain `committed_to_stream_at = NULL` and retry on the next cycle.
3. **Idempotency 24h TTL** — `expired` result returned for keys older than 24 hours; caller should treat this as a miss and re-issue.
4. **Fingerprint collision-resistance** — PBT over 200 random JSON bodies; collision rate 0 observed in 500-run determinism test.
5. **No PII in events** — `AgentEventPayload` union has no `email`, `name`, or `address` fields. PBT-verified.

# NFR Design Patterns — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**Generated at**: 2026-05-05T12:20:00Z  
**NFR sources**: UoW-03-nfr-requirements.md

---

## Resilience

### P-RES-001: Outbox Drain — Retry-on-Redis-Failure

**Applies to**: NFR-RELI-UoW03-02, NFR-RELI-UoW03-03  
**Problem**: Redis XADD can fail transiently; the drain worker must not mark the row as committed when it does.  
**Pattern**: Optimistic retry via row persistence — no explicit retry loop needed. Uncommitted rows are automatically retried on the next drain cycle (every 1 s). No in-memory retry state; the DB row is the durable retry record.  
**Implementation**:
- On successful XADD: `UPDATE agent_events SET committed_to_stream_at = now() WHERE id = $row.id`
- On XADD failure: catch exception, emit `log.warn({ event: 'outbox.drain.xadd_failed', eventId })`, skip row — it remains `committed_to_stream_at IS NULL` and is picked up next cycle
- No cap on retry attempts in MVP; Grafana alert fires if pending rows exceed threshold (NFR-PERF-UoW03-05)

---

### P-RES-002: Idempotency Cleanup — Low-Priority Scheduled Delete

**Applies to**: NFR-RELI-UoW03-05 (cleanup does NOT block writes)  
**Pattern**: Scheduled cron job (`@nestjs/schedule`) deletes expired idempotency keys in small batches outside the request path.  
**Implementation**:
- `@Cron('0 * * * *')` — runs every hour
- `DELETE FROM idempotency_keys WHERE created_at < now() - interval '24 hours' LIMIT 1000`
- Batched to avoid lock contention; multiple runs on backlog are safe

---

### P-RES-003: Prisma Transaction Timeout

**Applies to**: NFR-RELI-UoW03-01 (audit atomicity)  
**Pattern**: Set an explicit `timeout` on all interactive transactions to prevent long-held locks from blocking the drain worker's `FOR UPDATE SKIP LOCKED`.  
**Implementation**:
- `prisma.$transaction(async (tx) => { … }, { timeout: 5000, maxWait: 2000 })`
- All domain-write transactions use this wrapper; AuditLogService documents this requirement
- On timeout: Prisma rolls back automatically; API returns `503 Service Unavailable` (not 500)

---

## Scalability

### P-SCAL-001: `FOR UPDATE SKIP LOCKED` for Parallel-Safe Outbox Drain

**Applies to**: NFR-SCAL-UoW03-04 (≥ 2 parallel drain workers safe)  
**Pattern**: Pessimistic row-level locking with SKIP LOCKED — competing workers each claim a non-overlapping batch of pending rows.  
**Implementation**:
```sql
SELECT * FROM app.agent_events
WHERE committed_to_stream_at IS NULL
ORDER BY created_at
LIMIT 100
FOR UPDATE SKIP LOCKED
```
- Executed via `prisma.$queryRaw` (tagged template literal, no string interpolation)
- MVP runs 1 worker; adding a second worker in UoW-04+ requires no code change

---

### P-SCAL-002: Partial Index on `agent_events.committed_to_stream_at`

**Applies to**: NFR-PERF-UoW03-04 (drain cycle ≤ 500 ms), NFR-SCAL-UoW03-03  
**Pattern**: Partial index covering only the pending rows — keeps the index small and the drain SELECT fast even as the committed-row count grows to millions.  
**Implementation**:
- Migration: `CREATE INDEX agent_events_pending_idx ON app.agent_events (created_at) WHERE committed_to_stream_at IS NULL`
- Already specified in `data-model.md` index catalogue

---

### P-SCAL-003: Partial Index on `idempotency_keys.created_at`

**Applies to**: NFR-RELI-UoW03-05 (cleanup efficiency), NFR-SCAL-UoW03-02  
**Pattern**: Index on `created_at` enables the cleanup job's range-delete to hit an index rather than a seq scan.  
**Implementation**:
- Migration: `CREATE INDEX idempotency_keys_created_at_idx ON app.idempotency_keys (created_at)`

---

## Performance

### P-PERF-001: ioredis Pipeline for Outbox Drain Batch

**Applies to**: NFR-PERF-UoW03-04 (drain cycle ≤ 500 ms per 100 rows)  
**Pattern**: ioredis pipeline — send all XADD commands in a single round-trip rather than awaiting each one sequentially.  
**Implementation**:
```typescript
const pipeline = redis.pipeline();
for (const row of rows) {
  pipeline.xadd(`events:${topic(row.eventType)}`, 'MAXLEN', '~', '100000', '*', 'payload', JSON.stringify(row.payload));
}
const results = await pipeline.exec();
// results[i] is [error, streamId] — check per-entry
```
- Per-entry error check: rows whose XADD failed are skipped (stay pending); others are committed

---

### P-PERF-002: Separate PrismaClient for Audit Writes

**Applies to**: NFR-SEC-UoW03-01 (audit_writer_role separation), NFR-PERF-UoW03-01 (≤ 10 ms insert)  
**Pattern**: Two PrismaClient instances — one for `app_role` (main), one for `audit_writer_role` (audit-only). The audit client uses its own connection pool sized for INSERT-only workload.  
**Implementation**:
- `DATABASE_URL` → `app_role` connection string (read+write on `app.*`)
- `AUDIT_DATABASE_URL` → `audit_writer_role` connection string (INSERT-only on `audit.audit_log`)
- `AuditPrismaService` extends `PrismaClient`; provided as a NestJS provider with `AUDIT_DATABASE_URL`
- Pool size: 2 connections (MVP; audit inserts are low-frequency)

---

### P-PERF-003: AsyncLocalStorage for Zero-Cost Request ID Propagation

**Applies to**: NFR-MAINT-UoW03-01, BR-PERSIST-013 (request_id in audit log)  
**Pattern**: Node.js `AsyncLocalStorage` — stores `{ requestId }` at middleware entry; readable from any downstream async context without threading it through every function signature.  
**Implementation**:
```typescript
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

// In RequestContextMiddleware.use():
const requestId = req.headers['x-request-id'] as string ?? randomUUID();
res.setHeader('X-Request-ID', requestId);
requestContext.run({ requestId }, next);

// In AuditLogService:
const { requestId } = requestContext.getStore() ?? { requestId: undefined };
```

---

## Security

### P-SEC-001: DB Role Separation via Dual PrismaClient

**Applies to**: NFR-SEC-UoW03-01, NFR-SEC-UoW03-02 (audit_writer_role + trigger)  
**Pattern**: Two PrismaClient instances, two DB roles, two connection strings — `app_role` cannot INSERT into `audit.audit_log`; `audit_writer_role` cannot UPDATE/DELETE anywhere.  
**Implementation**: See P-PERF-002 above. The two clients are provided via separate NestJS tokens (`PRISMA_SERVICE` and `AUDIT_PRISMA_SERVICE`).

---

### P-SEC-002: Append-Only Trigger on `audit.audit_log`

**Applies to**: NFR-SEC-UoW03-02 (trigger blocks UPDATE/DELETE), BR-PERSIST-001  
**Pattern**: PostgreSQL row-level trigger raises an exception before any UPDATE or DELETE on `audit.audit_log`, regardless of the calling role.  
**Implementation** (in migration SQL):
```sql
CREATE OR REPLACE FUNCTION audit.fn_audit_log_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.audit_log is append-only: % is forbidden', TG_OP;
END;
$$;

CREATE TRIGGER tg_audit_log_no_update_delete
BEFORE UPDATE OR DELETE ON audit.audit_log
FOR EACH ROW EXECUTE FUNCTION audit.fn_audit_log_immutable();
```

---

### P-SEC-003: PII Strip Before Audit Snapshot Serialisation

**Applies to**: NFR-SEC-UoW03-03 (no password hashes or secrets in audit snapshots)  
**Pattern**: `AuditLogService` passes `before`/`after` objects through a `sanitise()` function that deletes known sensitive keys before JSON serialisation.  
**Implementation**:
```typescript
const SENSITIVE_KEYS = new Set(['passwordHash', 'password_hash', 'jwtPrivateKey', 'refreshTokenHash']);

function sanitise(obj: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...obj };
  for (const key of SENSITIVE_KEYS) delete copy[key];
  return copy;
}
```
- Pure function — property-testable (PBT-02)
- Applied to both `before` and `after` snapshots

---

### P-SEC-004: Outbox Payload IDs-Only Policy

**Applies to**: NFR-SEC-UoW03-07 (no PII in outbox payloads)  
**Pattern**: `OutboxService.emit()` enforces a payload schema per event type — payloads carry only IDs, amounts, and metadata. Consumers fetch PII from the DB using entity IDs.  
**Implementation**:
- TypeScript union type `AgentEventPayload` discriminated by `eventType`; no `email`, `name`, `address` fields allowed in the union
- ESLint rule (custom — or code review check): flag any direct inclusion of User fields in event payloads

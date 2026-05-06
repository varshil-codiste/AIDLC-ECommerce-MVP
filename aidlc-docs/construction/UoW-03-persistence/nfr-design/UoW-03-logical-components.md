# Logical Components — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**Generated at**: 2026-05-05T12:20:00Z

---

## LC-001: RequestContextMiddleware

**Purpose**: Propagate a per-request `requestId` (from `X-Request-ID` header or auto-generated) through the entire async call chain using `AsyncLocalStorage`. Enables log-to-audit correlation without threading the ID through every function signature.  
**Type**: NestJS `NestMiddleware` applied globally in `AppModule`  
**Tech**: Node.js built-in `AsyncLocalStorage` (no extra package)  
**NFR**: NFR-PERF-UoW03-03, BR-PERSIST-013  
**Interface**:
```typescript
class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void
}

const requestContext = new AsyncLocalStorage<{ requestId: string }>();
function getRequestId(): string | undefined
```

---

## LC-002: AuditPrismaService

**Purpose**: A dedicated `PrismaClient` instance connected as `audit_writer_role` — has INSERT-only access to `audit.audit_log`. Keeps audit writes strictly separated from the main `app_role` client.  
**Type**: NestJS provider (`@Injectable()`, provided with token `AUDIT_PRISMA_SERVICE`)  
**Tech**: Prisma Client (same version as main; separate connection string from `AUDIT_DATABASE_URL`)  
**Pool size**: 2 connections (MVP)  
**NFR**: NFR-SEC-UoW03-01, P-PERF-002, P-SEC-001

---

## LC-003: AuditLogService

**Purpose**: The single write-path into `audit.audit_log`. Called inside domain-write transactions to record actor, action, entity, before/after snapshots, and request ID. Enforces PII stripping before serialisation.  
**Type**: NestJS provider (`@Injectable()`, exported from `AuditModule`)  
**Tech**: Uses `AuditPrismaService` (LC-002); reads requestId from `requestContext` (LC-001)  
**NFR**: NFR-PERF-UoW03-01, NFR-RELI-UoW03-01, NFR-SEC-UoW03-03, BR-PERSIST-001, BR-PERSIST-002  
**Interface**:
```typescript
class AuditLogService {
  insert(
    tx: Prisma.TransactionClient,
    entry: {
      actorUserId?: string;
      actorRole?: string;
      action: string;        // e.g. 'product.create'
      entity: string;        // e.g. 'products'
      entityId: string;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    }
  ): Promise<void>
}
```
- `tx` is mandatory — prevents accidental out-of-transaction calls at the type level
- `before`/`after` are sanitised internally via `sanitise()` (P-SEC-003)
- `requestId` is read from `requestContext.getStore()` (LC-001) — not passed by caller

---

## LC-004: IdempotencyService

**Purpose**: Check incoming requests against stored idempotency keys and replay cached responses on duplicate. Save new key+response pairs after successful handler execution.  
**Type**: NestJS provider (`@Injectable()`, exported from `IdempotencyModule`)  
**Tech**: Main `PrismaService` (app_role; reads/writes `app.idempotency_keys`)  
**NFR**: NFR-PERF-UoW03-02, NFR-PERF-UoW03-03, NFR-RELI-UoW03-04, BR-PERSIST-003, BR-PERSIST-004, BR-PERSIST-005  
**Interface**:
```typescript
type IdempotencyCheckResult =
  | { hit: false }
  | { hit: true; responseStatus: number; responseBody: unknown }
  | { conflict: true; reason: 'fingerprint_mismatch' | 'expired' };

class IdempotencyService {
  check(key: string, userId: string, fingerprint: string): Promise<IdempotencyCheckResult>
  save(key: string, userId: string, fingerprint: string, status: number, body: unknown): Promise<void>
  static computeFingerprint(method: string, path: string, body: unknown): string  // pure — SHA-256
}
```

---

## LC-005: IdempotencyGuard

**Purpose**: NestJS `CanActivate` guard that intercepts requests on `@Idempotent()`-decorated handlers, invokes `IdempotencyService.check()`, and short-circuits with a cached response on cache-hit.  
**Type**: NestJS guard (`@Injectable()`, used via `@UseGuards(IdempotencyGuard)` or globally for POST/PUT)  
**NFR**: BR-PERSIST-005  
**Interface**:
```typescript
@Injectable()
class IdempotencyGuard implements CanActivate {
  canActivate(context: ExecutionContext): Promise<boolean>
  // Returns false (short-circuit) on hit; true on miss; throws HttpException on conflict
}
```

---

## LC-006: OutboxService

**Purpose**: Write `app.agent_events` rows within a domain-write transaction. Enforces the same-transaction requirement at the TypeScript type level by requiring a `tx` parameter.  
**Type**: NestJS provider (`@Injectable()`, exported from `OutboxModule`)  
**Tech**: Main `PrismaService` (app_role; writes `app.agent_events`)  
**NFR**: NFR-RELI-UoW03-02, BR-PERSIST-006, NFR-SEC-UoW03-07  
**Interface**:
```typescript
class OutboxService {
  emit(
    tx: Prisma.TransactionClient,
    eventType: string,         // e.g. 'order.created'
    payload: AgentEventPayload, // typed union — no PII fields
    emittedByModule: string
  ): Promise<void>

  static buildPayload(eventType: string, data: AgentEventPayload): AgentEventPayload  // pure
}
```

---

## LC-007: OutboxDrainWorker

**Purpose**: Background worker that continuously drains `app.agent_events` rows with `committed_to_stream_at IS NULL` to Redis Streams using ioredis pipeline. Runs inside the API process.  
**Type**: NestJS provider with `@nestjs/schedule` interval (`@Interval(1000)`)  
**Tech**: ioredis pipeline (P-PERF-001); raw SQL via `prisma.$queryRaw` (P-SCAL-001); `@nestjs/schedule`  
**NFR**: NFR-PERF-UoW03-04, NFR-PERF-UoW03-05, NFR-RELI-UoW03-02, NFR-RELI-UoW03-03, BR-PERSIST-007  
**Metrics emitted**: `outbox_pending_rows` (gauge), `outbox_drain_cycle_ms` (histogram)  
**Alert trigger**: `outbox_pending_rows > 500 for 2 min` → Grafana email alert  
**Interface**:
```typescript
class OutboxDrainWorker {
  @Interval(1000)
  async drainCycle(): Promise<void>
  // Internal: fetchPendingBatch() → pipelineXADD() → commitDrained()
}
```

---

## LC-008: PrismaModule (extended)

**Purpose**: Provides both `PrismaService` (app_role, existing from UoW-02) and `AuditPrismaService` (audit_writer_role, new). Exported globally so any module can inject either.  
**Type**: NestJS `@Global()` module  
**Tech**: Two `PrismaClient` instances, two env vars (`DATABASE_URL`, `AUDIT_DATABASE_URL`)  
**NFR**: NFR-SEC-UoW03-01, P-SEC-001

---

## Summary

| # | Component | Type | New in UoW-03 |
|---|-----------|------|---------------|
| LC-001 | RequestContextMiddleware | NestJS Middleware | Yes |
| LC-002 | AuditPrismaService | NestJS Provider | Yes |
| LC-003 | AuditLogService | NestJS Provider | Yes |
| LC-004 | IdempotencyService | NestJS Provider | Yes |
| LC-005 | IdempotencyGuard | NestJS Guard | Yes |
| LC-006 | OutboxService | NestJS Provider | Yes |
| LC-007 | OutboxDrainWorker | NestJS Scheduled Task | Yes |
| LC-008 | PrismaModule (extended) | NestJS Global Module | Extended (was in UoW-02) |

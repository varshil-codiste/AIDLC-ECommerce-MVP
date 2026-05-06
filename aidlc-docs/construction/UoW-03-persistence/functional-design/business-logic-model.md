# Business Logic Model — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

---

## Workflow 1: Domain Write with Audit Log

Every domain mutation that changes `app.*` data follows this pattern.

```
+--------+        +---------------+       +--------+       +-------------+
| Caller |        | DomainService |       | Prisma |       | AuditLogSvc |
+--------+        +---------------+       +--------+       +-------------+
    |                    |                    |                   |
    |-- doWrite(ctx) --->|                    |                   |
    |                    |-- tx = begin() --->|                   |
    |                    |                    |                   |
    |                    |-- read before  --->|                   |
    |                    |<-- beforeSnap -----|                   |
    |                    |                    |                   |
    |                    |-- mutation     --->|                   |
    |                    |<-- afterSnap ----  |                   |
    |                    |                    |                   |
    |                    |-- insert(tx, {actor, action,          |
    |                    |   entity, entityId, before, after,    |
    |                    |   requestId}) -------------------->   |
    |                    |                    |                   |
    |                    |-- tx.commit()  --->|                   |
    |                    |<-- ok -------------|                   |
    |<-- result ---------|                    |                   |
```

Text alternative: The domain service opens a Prisma interactive transaction. It reads the current row state (before-snapshot), applies the mutation, captures the after-snapshot, calls `AuditLogService.insert()` with both snapshots plus actor/action/requestId, then commits. If any step fails the transaction rolls back atomically — no partial audit entries.

---

## Workflow 2: Domain Write with Audit Log + Outbox Event

Used when a domain mutation must also produce an agent event (e.g., order placement, product stock change).

```
+--------+      +---------------+     +--------+    +-------------+   +------------+
| Caller |      | DomainService |     | Prisma |    | AuditLogSvc |   | OutboxSvc  |
+--------+      +---------------+     +--------+    +-------------+   +------------+
    |                  |                   |               |                |
    |-- doWrite() -->  |                   |               |                |
    |                  |-- tx = begin() -->|               |                |
    |                  |                   |               |                |
    |                  |-- mutation    --> |               |                |
    |                  |                   |               |                |
    |                  |-- auditLog.insert(tx, ...) ------>|                |
    |                  |                   |               |                |
    |                  |-- outbox.emit(tx, eventType,      |            --> |
    |                  |   payload, emittedBy)                              |
    |                  |                   |-- INSERT agent_events -------> |
    |                  |                   |               |                |
    |                  |-- tx.commit() --> |               |                |
    |<-- result ---    |                   |               |                |
```

Text alternative: Audit insert and outbox insert both execute inside the same transaction as the domain mutation. If the transaction rolls back, no audit row and no outbox row are written.

---

## Workflow 3: Outbox Drain Worker

Runs continuously in the API process; polls every 1 second.

```
loop every 1 s:

  rows = SELECT * FROM app.agent_events
         WHERE committed_to_stream_at IS NULL
         ORDER BY created_at
         LIMIT 100
         FOR UPDATE SKIP LOCKED

  if rows is empty:
    sleep(1s)
    continue

  for each row:
    stream = "events:" + topic(row.event_type)   // e.g. "events:order"

    ok = REDIS XADD stream MAXLEN ~ 100000 * row.payload

    if ok:
      UPDATE app.agent_events
      SET committed_to_stream_at = now()
      WHERE id = row.id

    else:
      log.warn("outbox drain failed for event", row.id)
      // row stays with committed_to_stream_at = NULL → retried next cycle
```

Text alternative: The drain worker selects pending outbox rows using `FOR UPDATE SKIP LOCKED` (safe for parallel workers). For each row it publishes to the matching Redis Stream using XADD with approximate MAXLEN trimming. On success it updates `committed_to_stream_at`. On Redis failure it logs and leaves the row pending for the next cycle. No dead-letter logic in MVP — ops team monitors pending-row count via Grafana alert.

---

## Workflow 4: Idempotency Guard

Applied via `@Idempotent()` decorator on any POST/PUT handler.

```
Client Request (with header Idempotency-Key: <uuid>)
        |
        v
  IdempotencyGuard.canActivate()
        |
        +-- key present? --No--> 400 Bad Request (idempotency.key.missing)
        |
        +-- Yes
        |
  IdempotencyService.check(key, userId, fingerprint)
        |
        +-- found, fingerprint match --> 200/201 replay (responseStatus + responseBody)
        |
        +-- found, fingerprint mismatch --> 409 Conflict (idempotency.key.fingerprint_mismatch)
        |
        +-- not found --> continue to handler
                |
                v
          Handler executes
                |
                v
  IdempotencyService.save(key, userId, fingerprint, responseStatus, responseBody)
                |
                v
        Return response to client
```

Text alternative: The guard intercepts before the handler. Missing key → 400. Existing key with matching fingerprint → replay the cached response (no handler execution). Existing key with different fingerprint → 409 (client bug). New key → execute handler, save result, return.

---

## Workflow 5: Request Context Propagation (requestId)

Ensures every audit log entry carries a `request_id` that correlates to pino logs.

```
Incoming HTTP request
        |
        v
  RequestContextMiddleware
        |
        +-- reads X-Request-ID header (or generates uuid-v4 if absent)
        +-- sets X-Request-ID on response header
        +-- stores requestId in AsyncLocalStorage
        |
        v
  NestJS handler chain
        |
        v
  AuditLogService.insert()
        |
        +-- reads requestId from AsyncLocalStorage
        +-- writes to audit_log.request_id
```

Text alternative: A middleware intercepts every request, reads or generates a request ID, stores it in `AsyncLocalStorage`, and sets it on the response header. Any code in the request lifecycle — including `AuditLogService` — can read the request ID from the store without it being passed explicitly through every call.

---

## State Machine: Order Status Transitions

```
placed
  ├── paid
  │    └── fulfilled
  │         └── shipped
  │              └── delivered
  ├── cancelled      (from: placed, paid, fulfilled)
  ├── refunded       (from: paid, fulfilled, shipped, delivered)
  └── returned       (from: delivered)
```

Text alternative: An order starts as `placed`. It progresses to `paid`, then `fulfilled`, then `shipped`, then `delivered`. It can be `cancelled` from `placed`, `paid`, or `fulfilled`. It can be `refunded` from `paid`, `fulfilled`, `shipped`, or `delivered`. It can be `returned` from `delivered` only.

---

## State Machine: Cart Status Transitions

```
open ──→ converted   (on checkout completion)
     ──→ abandoned   (on timeout / manual close)
```

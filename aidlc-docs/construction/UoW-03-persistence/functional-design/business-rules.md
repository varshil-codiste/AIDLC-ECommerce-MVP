# Business Rules — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

---

## BR-PERSIST-001: Audit Log Is Append-Only

**Applies to**: Every write to `audit.audit_log`  
**Statement**: "No UPDATE or DELETE operations are permitted on `audit.audit_log` at any time."  
**Enforcement**:
- DB: `audit_writer_role` has INSERT only; `app_role` has SELECT only — no UPDATE/DELETE grants exist
- DB: Row-level trigger `tg_audit_log_no_update_delete` raises EXCEPTION if UPDATE/DELETE is attempted via any role
- API: `AuditLogService` exposes only an `insert()` method — no update or delete methods exist in the service
**Error code**: `audit.write.forbidden`  
**User-facing copy**: N/A — internal integrity violation; logs as a critical alert

---

## BR-PERSIST-002: Audit Entry Required for Every Domain Write

**Applies to**: Any NestJS service method that performs a domain write (INSERT, UPDATE, DELETE on `app.*` tables)  
**Statement**: "Every domain mutation must produce an `audit.audit_log` row capturing `actor_user_id`, `actor_role`, `action`, `entity`, `entity_id`, `before`, `after`, and `request_id`."  
**Enforcement**:
- API: `AuditLogService.insert()` is called within the same Prisma interactive transaction as the domain write
- Code Review (Gate #4): AI reviewer checks that every service method with a write call also calls `AuditLogService.insert()` before transaction commits
**Error code**: N/A — an audit miss is a code defect, not a runtime error path  
**User-facing copy**: N/A

---

## BR-PERSIST-003: Idempotency Key Must Be Scoped Per User

**Applies to**: Any POST/PUT endpoint decorated with `@Idempotent()`  
**Statement**: "An idempotency key is valid only for the user who sent it. Two different users may send the same key value without collision."  
**Enforcement**:
- DB: PK on `(key, userId)` composite — key alone is not unique
- API: `IdempotencyService.check()` queries `WHERE key = $1 AND userId = $2`
**Error code**: `idempotency.key.user_mismatch`  
**User-facing copy**: N/A — scoping is internal; surface only if a key collision is detected across users

---

## BR-PERSIST-004: Idempotency Key TTL Is 24 Hours

**Applies to**: `app.idempotency_keys` table  
**Statement**: "Idempotency key records expire 24 hours after creation and may not be honoured after that window."  
**Enforcement**:
- DB: Index on `(createdAt)` allows efficient deletion of expired rows
- API: Cleanup cron job deletes rows where `created_at < now() - interval '24 hours'` (runs every hour)
- API: On lookup, `IdempotencyService` rejects keys older than 24 h with `409 Conflict` and error code `idempotency.key.expired` — the client must generate a new key
**Error code**: `idempotency.key.expired`  
**User-facing copy**: N/A — internal retry protocol; clients are expected to handle this programmatically

---

## BR-PERSIST-005: Idempotent Replay Must Return Identical Status and Body

**Applies to**: Any duplicate request received within the 24-hour TTL window  
**Statement**: "If the same idempotency key is received from the same user with the same request fingerprint, the stored `response_status` and `response_body` MUST be returned without re-executing the handler."  
**Enforcement**:
- API: `IdempotencyService.check()` returns `{ hit: true, responseStatus, responseBody }` if found; the guard short-circuits the handler and writes the cached response
- API: If the key exists but the `request_fingerprint` differs, return `409 Conflict` with `idempotency.key.fingerprint_mismatch` — the client is reusing a key for a different request, which is a client bug
**Error code**: `idempotency.key.fingerprint_mismatch`  
**User-facing copy**: N/A

---

## BR-PERSIST-006: Outbox Write Must Be in the Same Transaction as the Domain Mutation

**Applies to**: Any domain service that emits an agent event  
**Statement**: "The `app.agent_events` INSERT must commit in the same Prisma transaction as the triggering domain mutation. An event MUST NOT be inserted if the domain mutation rolls back."  
**Enforcement**:
- API: `OutboxService.emit()` accepts a `Prisma.TransactionClient` parameter — it cannot be called outside a transaction
- Code Review (Gate #4): AI reviewer flags any `OutboxService.emit()` call that does not pass a `tx` argument
**Error code**: N/A — a missing tx parameter is a compile-time or lint error  
**User-facing copy**: N/A

---

## BR-PERSIST-007: Outbox Drain Is At-Least-Once

**Applies to**: `OutboxDrainWorker`  
**Statement**: "Every `agent_events` row with `committed_to_stream_at IS NULL` must eventually be published to the corresponding Redis Stream. The worker must tolerate restart without duplicate-suppression — consumers use idempotency keys to handle re-delivery."  
**Enforcement**:
- DB: Worker uses `SELECT ... FOR UPDATE SKIP LOCKED` to prevent double-drain across parallel workers
- API: After successful `XADD`, the worker sets `committed_to_stream_at = now()` in the same DB transaction
- API: On Redis failure, the worker does NOT update `committed_to_stream_at` — the row stays pending and will be retried on the next drain cycle
**Error code**: N/A — operational failure; logged as warning; Grafana alert if pending rows > threshold

---

## BR-PERSIST-008: One Open Cart Per Shopper

**Applies to**: `app.carts`  
**Statement**: "A shopper may have at most one cart in `open` status at any time."  
**Enforcement**:
- DB: Partial unique index `UNIQUE (user_id) WHERE status = 'open'`
- API: Cart creation checks for an existing open cart and returns it rather than creating a duplicate
**Error code**: `cart.already_open`  
**User-facing copy**: N/A — agent silently returns the existing open cart

---

## BR-PERSIST-009: Order Price Is Frozen at Purchase Time

**Applies to**: `app.order_items.price_at_purchase_cents`  
**Statement**: "The price captured in `order_items` must reflect the variant's price at the moment of order creation. Subsequent product price changes must NOT retroactively alter `price_at_purchase_cents`."  
**Enforcement**:
- DB: `price_at_purchase_cents` column has no default; it is explicitly set by the order creation service from the current variant price at the time of the transaction
- DB: No trigger or FK update-cascade exists from `products.price_cents` to `order_items.price_at_purchase_cents`
**Error code**: N/A — data integrity concern; enforced by service logic

---

## BR-PERSIST-010: Stock Must Never Go Negative

**Applies to**: `app.product_variants.stock`  
**Statement**: "Stock cannot be decremented below 0. Any write that would result in negative stock must be rejected."  
**Enforcement**:
- DB: `CHECK (stock >= 0)` constraint on `product_variants.stock`
- API: Service pre-checks stock before decrement; returns `409 Conflict` if insufficient stock
**Error code**: `product.variant.out_of_stock`  
**User-facing copy**: "That item is out of stock."

---

## BR-PERSIST-011: Customer Record Is Created on First Order

**Applies to**: `app.customers`  
**Statement**: "A `customers` row must exist for every shopper who has placed at least one order. The row is created on first order placement if it does not already exist."  
**Enforcement**:
- API: Order creation service calls `CustomerService.upsert(userId)` within the same transaction
- DB: UNIQUE constraint on `customers.user_id` ensures one record per shopper
**Error code**: N/A — internal upsert

---

## BR-PERSIST-012: Audit Log Retention Is 1 Year (Archive, Not Delete)

**Applies to**: `audit.audit_log`  
**Statement**: "Audit log rows older than 1 year must be archived to cold storage, not permanently deleted."  
**Enforcement**:
- API: Retention job (future UoW) copies rows to cold storage before removing from hot table; MVP marks this as a NEEDS ACTION item
- DB: No DELETE grant exists on `audit.audit_log` for any application role, enforcing the archive-before-delete requirement at the DB level
**Error code**: N/A — operational constraint

---

## BR-PERSIST-013: Request ID Must Be Propagated to Audit Log

**Applies to**: Every `AuditLogService.insert()` call  
**Statement**: "The `request_id` field of `audit.audit_log` must be populated with the `X-Request-ID` header value (or a generated UUID if the header is absent) so that audit entries can be correlated with pino logs."  
**Enforcement**:
- API: `AsyncLocalStorage` (request context) carries `requestId` throughout the request lifecycle
- API: `AuditLogService.insert()` reads `requestId` from context if not explicitly passed
**Error code**: N/A — observability requirement; a missing `request_id` is logged as a warning, not an error

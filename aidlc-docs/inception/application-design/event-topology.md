# Event Topology — Redis Streams

**Generated**: 2026-05-04T00:22:00Z
**Decision**: Q6 = A (Redis Streams) + ADR-004

The system uses an **outbox pattern**: domain mutations + an `agent_events` row commit in the same Postgres transaction; a separate worker drains the outbox to Redis Streams. This guarantees at-least-once event delivery without a two-phase commit.

---

## Stream catalog

| Stream | Producer | Payload shape | Consumers |
|--------|----------|--------------|-----------|
| `events:order` | Order tools | `{event_type: 'order.created'\|'order.shipped'\|'order.cancelled'\|'order.refunded'\|'order.returned', order_id, user_id, customer_id, totals, timestamp}` | `customer-ltv-recalc`, `inventory-restock`, `notifications-merchant`, `notifications-shopper` |
| `events:cart` | Cart tools | `{event_type: 'cart.created'\|'cart.updated'\|'cart.cleared'\|'cart.converted', cart_id, user_id, item_count, subtotal_cents}` | (analytics future); MVP: none active |
| `events:product` | Product tools | `{event_type: 'product.created'\|'product.updated'\|'product.archived'\|'product.stock_changed', product_id, variant_id?, before, after}` | `embedding-rebuild`, `low-stock-watcher` |
| `events:customer` | Customer tools | `{event_type: 'customer.created'\|'customer.tagged'\|'customer.anonymized', customer_id, user_id, changes}` | `notifications-merchant` (when relevant), audit echo |
| `events:auth` | Auth module | `{event_type: 'login.success'\|'login.failure'\|'rate_limit.applied', user_id?, ip, ua, timestamp}` | (security monitoring future); MVP: counted but not consumed |

---

## Consumer groups

Each consumer reads its dedicated stream(s) via a Redis consumer group named `cg:<consumer_name>`. Pending entries are auto-claimed by another worker after 60 s of inactivity (idempotency keys protect against double-processing).

| Consumer | Streams | Purpose |
|----------|---------|---------|
| `customer-ltv-recalc` | `events:order` | On `order.paid` / `order.refunded`, recompute the customer's `ltv_cents` and `order_count` |
| `inventory-restock` | `events:order` | On `order.cancelled` / `order.returned`, atomically increment `product_variants.stock` |
| `low-stock-watcher` | `events:product` | When a `stock_changed` event drops a SKU below `low_stock_threshold`, create a `notifications` row (FR-NOTIF-02) |
| `notifications-merchant` | `events:order`, `events:customer` | Insert `notifications` rows for new-order events (FR-NOTIF-01) and selected customer events |
| `notifications-shopper` | `events:order` | On `order.shipped` / `order.delivered`, render an in-chat status update on the shopper's next session-open (or live if active) |
| `embedding-rebuild` | `events:product` | On `product.created` / `product.updated`, schedule re-embedding into `product_search_index` (idempotent) |

---

## Outbox drain

Worker `outbox-drain` runs continuously inside the `api` service:

```
loop {
  rows = SELECT * FROM agent_events
         WHERE committed_to_stream_at IS NULL
         ORDER BY created_at LIMIT 100
         FOR UPDATE SKIP LOCKED

  for each row:
    XADD events:<topic_from_event_type> ...
    UPDATE agent_events SET committed_to_stream_at = now() WHERE id = row.id
}
```

Why `FOR UPDATE SKIP LOCKED`: lets multiple drainers safely run in parallel (lean MVP runs 1, but the design allows scale-out without code changes).

---

## Delivery guarantees

| Guarantee | Mechanism |
|-----------|----------|
| At-least-once produce | Outbox + same-tx commit |
| At-least-once consume | Consumer-group ACK + auto-claim of pending entries after 60 s |
| Idempotency on consume | Each consumer that mutates state checks an idempotency key derived from `event.id` |
| Ordering | Per-stream FIFO is preserved; cross-stream ordering is NOT (consumers must tolerate this) |
| Replay | `agent_events` table is the source of truth; can be replayed by setting `committed_to_stream_at = NULL` for a window |

---

## Retention

Redis Streams retention is bounded to keep the cluster small:

| Stream | Approx max length |
|--------|-------------------|
| `events:order` | last 100K entries (~1 month at MVP scale) |
| `events:cart` | last 50K entries |
| `events:product` | last 100K entries |
| `events:customer` | last 50K entries |
| `events:auth` | last 200K entries |

Trimming via `XADD ... MAXLEN ~ <n>`. Postgres `agent_events` is the durable record and follows the audit-log retention rules (1 year, then archived).

---

## Coverage check

| Requirement | Stream / consumer |
|-------------|-------------------|
| FR-AGT-ORD-08 (order updates trigger reactions) | `events:order` + 4 consumers |
| FR-NOTIF-01 (new-order notification) | `notifications-merchant` consuming `events:order` |
| FR-NOTIF-02 (low-stock notification) | `low-stock-watcher` consuming `events:product` |
| Customer LTV recompute | `customer-ltv-recalc` |
| Inventory restock on cancel | `inventory-restock` |
| Embedding rebuild | `embedding-rebuild` consuming `events:product` |

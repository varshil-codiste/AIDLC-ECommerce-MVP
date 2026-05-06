# NFR Design Patterns — UoW-09 (Notifications)

**Stage**: 10 — NFR Design  
**Generated at**: 2026-05-05T17:37:00Z

---

## Pattern 1 — Redis Stream Consumer with Cursor

**Addresses**: NFR-09-RELI-01, NFR-09-PERF-01

`OrderEventListener` uses `XREAD COUNT 50 STREAMS events:order <cursor>` every 2 seconds. The cursor (last processed stream ID) is stored in Redis as `HSET notifications:stream_cursor events:order <id>`. On restart, cursor is loaded from Redis — events already processed are never re-delivered.

Initial cursor value: `0` (reads from stream beginning on first start).

```
Redis Key: notifications:stream_cursor (HASH)
Field:     events:order
Value:     <last-xread-id, e.g. "1746456000000-0">
```

## Pattern 2 — Low-Stock Deduplication via Redis SET

**Addresses**: NFR-09-RELI-02, NFR-09-PERF-03

`LowStockWatcher` uses `SISMEMBER notifications:low_stock_notified <variantId>` to skip variants already notified in the current window. On new notification, `SADD notifications:low_stock_notified <variantId...>` with per-key `EXPIRE 120`. Uses Redis pipeline for batch efficiency.

## Pattern 3 — Batch Notification Labelling (pure function)

**Addresses**: BR-NOTIF-07, BR-NOTIF-08, BR-NOTIF-09, NFR-09-PBT-02

`buildLowStockLabel(variants: LowStockVariant[]): string` is a pure function — testable in isolation and suitable for PBT. Returns:
- 1 variant: `"Blue Mug (SKU-001) — 3 left"`
- 2–10 variants: `"4 SKUs are running low"`
- >10 variants: `"${count} SKUs are running low"`

## Pattern 4 — Recipient Fan-Out

**Addresses**: BR-NOTIF-01, BR-NOTIF-10

After building the notification payload, `NotificationService.createForMerchants(type, payload)`:
1. Queries `User` WHERE `role = 'merchant'`
2. `prisma.notification.createMany({ data: merchants.map(u => ({ recipientUserId: u.id, type, payload })) })`

Single DB round-trip (createMany) regardless of merchant count.

## Pattern 5 — Read-ownership Guard

**Addresses**: NFR-09-SEC-01

`markRead` and `markAllRead` always include `recipientUserId: actorId` in the WHERE clause. A merchant cannot affect another merchant's read state even with a valid session.

## Pattern 6 — Indexed Notification Query

**Addresses**: NFR-09-PERF-02

`notifications_recipient_read_idx` on `(recipientUserId, readAt)` already provisioned in UoW-03 schema. `list` query:
```sql
SELECT * FROM app.notifications
WHERE recipient_user_id = $1
ORDER BY created_at DESC
LIMIT 50
```

The index covers the `WHERE` predicate; ordering uses `createdAt` which is naturally monotonic.

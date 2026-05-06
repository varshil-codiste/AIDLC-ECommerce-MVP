# Business Rules — UoW-09 (Notifications)

**Stage**: 8 — Functional Design  
**Generated at**: 2026-05-05T17:35:00Z

---

## Order Notification Rules

| ID | Rule |
|----|------|
| BR-NOTIF-01 | When `order.created` is consumed from Redis stream, a Notification record is created for every user with `role = 'merchant'`. |
| BR-NOTIF-02 | Notification type for new orders is `'order.created'`; payload includes `{ orderId, totalCents, currency }`. |
| BR-NOTIF-03 | The Redis stream consumer tracks its cursor per stream key in Redis (`notifications:stream_cursor:{stream}`); on restart, processing resumes from last cursor — no duplicate notifications. |
| BR-NOTIF-04 | If no merchant user exists in the database, the event is silently skipped (not an error). |

## Low-Stock Notification Rules

| ID | Rule |
|----|------|
| BR-NOTIF-05 | `LowStockWatcher` polls every 60 seconds for variants with `stock < 5` (LOW_STOCK_THRESHOLD from UoW-08). |
| BR-NOTIF-06 | Variants already notified within the last 120 seconds are excluded (Redis SET `notifications:low_stock_notified` with 120s TTL per variantId). |
| BR-NOTIF-07 | If only 1 variant is newly low-stock: notification label is `"${productTitle} (${sku}) — ${stock} left"`. |
| BR-NOTIF-08 | If 2–10 variants are newly low-stock: notification label is `"${count} SKUs are running low"` with variant list in payload. |
| BR-NOTIF-09 | If >10 variants are newly low-stock: notification label is `"${count} SKUs are running low"` capped at top 10 by urgency in payload. |
| BR-NOTIF-10 | Low-stock notifications are sent to all merchant users (same as BR-NOTIF-01). |

## Notification Retrieval Rules

| ID | Rule |
|----|------|
| BR-NOTIF-11 | `NotificationService.list` returns the most recent 50 notifications for a recipient, ordered `createdAt DESC`. |
| BR-NOTIF-12 | `unreadCount` is the count of Notification records where `readAt IS NULL` for the recipient. |
| BR-NOTIF-13 | `markRead` is idempotent — calling it on an already-read notification is a no-op (no error). |
| BR-NOTIF-14 | `markAllRead` sets `readAt = now()` on all unread notifications for the recipient in a single UPDATE. |
| BR-NOTIF-15 | Notifications are in-app only — no email, SMS, or push (FR-NOTIF-03). |

## Agent Rules

| ID | Rule |
|----|------|
| BR-NOTIF-16 | Only `merchant` role users may retrieve or mark notifications via the `NotificationAgent`. Shoppers receive a 403 error. |
| BR-NOTIF-17 | `NotificationAgent` is a read/mark-read agent — it does not create notifications directly (creation is event-driven). |

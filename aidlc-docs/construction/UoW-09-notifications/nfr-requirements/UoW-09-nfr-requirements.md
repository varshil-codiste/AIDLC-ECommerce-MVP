# NFR Requirements — UoW-09 (Notifications)

**Stage**: 9 — NFR Requirements  
**Generated at**: 2026-05-05T17:36:00Z

---

## Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-09-PERF-01 | Order event → notification created latency | < 3 s p95 (stream drain at 1s + listener at 2s) |
| NFR-09-PERF-02 | `notification_list` query latency | < 50 ms p95 (indexed on recipientUserId + readAt) |
| NFR-09-PERF-03 | Low-stock watcher single cycle duration | < 200 ms (Prisma query + Redis SET operations) |

## Reliability

| ID | Requirement |
|----|-------------|
| NFR-09-RELI-01 | Stream cursor persisted in Redis — OrderEventListener resumes from last position on restart, no event skipped or double-processed. |
| NFR-09-RELI-02 | Low-stock Redis SET uses per-variantId TTL (120s) — watcher is safe to restart; at-most-once per window. |
| NFR-09-RELI-03 | If no merchant users are found, `order.created` event is skipped silently (not retried — idempotent, next event will succeed once user is created). |

## Maintainability

| ID | Requirement |
|----|-------------|
| NFR-09-MAINT-01 | Unit test line coverage ≥ 75% for `NotificationService`. |
| NFR-09-MAINT-02 | `LowStockWatcher` and `OrderEventListener` must have at least 4 unit tests each. |
| NFR-09-MAINT-03 | `NotificationAgent` must have at least 4 unit tests (text output, widget, 403 for shopper, loop limit). |

## Security

| ID | Requirement |
|----|-------------|
| NFR-09-SEC-01 | `markRead` and `markAllRead` validate `recipientUserId = actorId` — a merchant cannot mark another merchant's notifications read. |
| NFR-09-SEC-02 | Notification payload MUST NOT contain PII (no email, no name — order ID and cents only). |
| NFR-09-SEC-03 | Only `merchant` role may call `notification_list` and `notification_mark_*` tools. |

## Observability

| ID | Requirement |
|----|-------------|
| NFR-09-OBS-01 | `OrderEventListener` logs `{ event: 'notification.order_created', orderId, recipientCount }` per cycle. |
| NFR-09-OBS-02 | `LowStockWatcher` logs `{ event: 'notification.low_stock', newCount, skippedCount }` per cycle. |

## AI/ML (extension: AI/ML Lifecycle)

| ID | Requirement |
|----|-------------|
| NFR-09-AIML-01 | `NotificationAgent` system prompt versioned as `notification-agent.v1.0.0.txt`. |
| NFR-09-AIML-02 | Eval suite: ≥ 4 cases (2 golden + 2 adversarial). |

## PBT (extension: Property-Based Testing — partial)

| ID | Requirement | Scope |
|----|-------------|-------|
| NFR-09-PBT-01 | `notification_inbox` schema PBT round-trip: arbitrary valid payloads always pass AJV validation. | FE |
| NFR-09-PBT-02 | Low-stock batch label property: for N variants (1 ≤ N ≤ 10), label always contains the count N. | BE pure function |

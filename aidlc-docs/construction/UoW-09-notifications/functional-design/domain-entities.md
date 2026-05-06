# Domain Entities — UoW-09 (Notifications)

**Stage**: 8 — Functional Design  
**Generated at**: 2026-05-05T17:35:00Z

---

## New DB Models

**None.** The `Notification` model was provisioned in UoW-03.

---

## Existing Models Used

### Notification (app.notifications)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| recipientUserId | UUID | FK → User.id |
| type | String | `'order.created'` \| `'low_stock'` |
| payload | JSON | type-specific data (orderId, variantIds, etc.) |
| readAt | DateTime? | null = unread |
| createdAt | DateTime | auto |

### User (app.users)

Read-only: `role` field used to identify merchant recipients.

### ProductVariant (app.product_variants)

Read-only: `stock`, `sku`, `productId` used by LowStockWatcher.

### AgentEvent (app.agent_events — Outbox)

Read-only: `event_type = 'order.created'` events consumed from Redis stream by OrderEventListener.

---

## Transient / Runtime State

| State | Storage | Purpose |
|-------|---------|---------|
| Redis stream cursor | `Redis HASH notifications:stream_cursor` key per stream | Tracks last processed stream ID for OrderEventListener; avoids re-processing on restart |
| Low-stock dedupe | `ProductVariant.lastLowStockNotifiedAt` (not in schema — use Redis SET) | `notifications:low_stock_notified` SET of variantIds notified in the last 60s; TTL 120s |

# Business Logic Model — UoW-09 (Notifications)

**Stage**: 8 — Functional Design  
**Generated at**: 2026-05-05T17:35:00Z

---

## Workflow 1 — Order Created Notification

```
Order placed (via future CartAgent)
        │
        ▼
  OutboxDrainWorker (UoW-03)
  writes AgentEvent{type:'order.created'} to Redis stream events:order
        │
        ▼
  OrderEventListener [@Interval 2000ms]
  XREAD events:order from cursor
        │
        ├── event_type != 'order.created' → skip
        │
        └── event_type == 'order.created'
                │
                ▼
          query User WHERE role='merchant'
                │
                ▼
          NotificationService.create(merchantUserId, 'order.created', payload)
          ──────────────────────────────────────
          INSERT INTO notifications (recipientUserId, type, payload)
                │
                ▼
          Update stream cursor in Redis
```

## Workflow 2 — Low-Stock Notification

```
LowStockWatcher [@Interval 60_000ms]
        │
        ▼
  prisma.productVariant.findMany(stock < 5, product.status='active')
        │
        ▼
  Filter: variantId NOT IN Redis SET notifications:low_stock_notified
        │
        ├── 0 new low-stock → noop
        │
        └── N new low-stock variants
                │
                ▼
          Build notification label (BR-NOTIF-07/08/09)
                │
                ▼
          Add variantIds to Redis SET notifications:low_stock_notified (TTL 120s)
                │
                ▼
          NotificationService.create per merchant (batch)
```

## Workflow 3 — Merchant Reads Notifications (Chat)

```
Merchant: "Show my notifications" / "Do I have new orders?"
        │
        ▼
  Orchestrator routes to NotificationAgent
        │
        ▼
  NotificationAgent → notification_list tool
        │
        ▼
  NotificationService.list(actorUserId, limit=20)
  SELECT * FROM notifications WHERE recipientUserId=? ORDER BY createdAt DESC LIMIT 20
        │
        ▼
  Count unreadCount
        │
        ▼
  Return notification_inbox widget
```

## Workflow 4 — Mark Read

```
Merchant: "Mark all as read" / clicks notification
        │
        ▼
  NotificationAgent → notification_mark_read or notification_mark_all_read
        │
        ▼
  NotificationService.markRead(id) or .markAllRead(userId)
        │
        ▼
  UPDATE notifications SET read_at = NOW() WHERE ...
```

---

## Agent Routing Extension

| Keyword / intent | Routed to | Tool |
|-----------------|-----------|------|
| "notifications", "new orders", "inbox" | NotificationAgent | `notification_list` |
| "mark read", "clear notifications" | NotificationAgent | `notification_mark_all_read` |

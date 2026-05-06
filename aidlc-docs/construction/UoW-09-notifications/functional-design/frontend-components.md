# Frontend Components — UoW-09 (Notifications)

**Stage**: 8 — Functional Design  
**Generated at**: 2026-05-05T17:35:00Z

---

## Components to Implement

### 1. NotificationInbox (REPLACE stub)

**File**: `web/components/widgets/NotificationInbox.tsx`  
**Widget type**: `notification_inbox`  
**Triggered by**: `NotificationAgent` → `notification_list` tool

**Data shape**:
```typescript
interface NotificationItem {
  id: string;
  type: 'order.created' | 'low_stock';
  message: string;
  read: boolean;
  createdAt: string;
  payload: Record<string, unknown>;
}

interface NotificationInboxData {
  notifications: NotificationItem[];
  unreadCount: number;
}
```

**Rendered elements**:
- `data-testid="notification-inbox-root"` — root container
- `data-testid="notification-inbox-count"` — unread count badge (hidden if 0)
- `data-testid="notification-item-{i}"` — each item row
- `data-testid="notification-item-{i}-type"` — category badge (`New Order` / `Low Stock`)
- `data-testid="notification-item-{i}-unread"` — unread indicator dot (present when `!item.read`)
- `data-testid="notification-inbox-empty"` — empty state when no notifications

**Intent actions**:
- `onIntent({ intent: 'notification.mark_all_read' })` — "Mark all read" button
- Each item may carry `intent: 'order.view'` with `orderId` in payload (tap to navigate)

---

## Schema Updates

### `notification_inbox.schema.json` — TIGHTEN (replace `additionalProperties: true`)

Current stub schema is loose. Replace with strict schema:

```json
{
  "required": ["notifications", "unreadCount"],
  "properties": {
    "notifications": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "required": ["id", "type", "message", "read", "createdAt"],
        "properties": {
          "id": { "type": "string" },
          "type": { "type": "string", "enum": ["order.created", "low_stock"] },
          "message": { "type": "string" },
          "read": { "type": "boolean" },
          "createdAt": { "type": "string" },
          "payload": { "type": "object" }
        },
        "additionalProperties": false
      }
    },
    "unreadCount": { "type": "integer", "minimum": 0 }
  },
  "additionalProperties": false
}
```

---

## Widget Registry

No new entries in `WidgetRenderer.tsx` — `notification_inbox` is already registered.

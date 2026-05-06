# Frontend Components — UoW-08 (Order + Customer Agents)

---

## Components to implement (replacing stubs)

### 1. `OrderCard` — `web/components/widgets/OrderCard.tsx`

**Status**: Replace stub (marked "full implementation in UoW-08")  
**Purpose**: Renders a single order with status badge, items summary, total, tracking info, and action buttons.

**Props**:
```typescript
interface OrderCardData {
  orderId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  totalCents: number;
  currency: string;
  placedAt: string; // ISO
  items: Array<{ title: string; quantity: number; priceAtPurchaseCents: number }>;
  trackingNumber?: string;
  trackingCarrier?: string;
  cancelAction?: { intent: string };
  refundAction?: { intent: string };
}
```

**Test IDs**: `order-card-root`, `order-card-status`, `order-card-total`, `order-card-cancel-btn`, `order-card-refund-btn`

---

### 2. `OrderList` — `web/components/widgets/OrderList.tsx`

**Status**: Replace stub (marked "full implementation in UoW-08")  
**Purpose**: Renders a paginated list of OrderCards with filter controls and bulk action buttons.

**Props**:
```typescript
interface OrderListData {
  orders: OrderCardData[];
  totalCount: number;
  filters?: { status?: string; dateFrom?: string; dateTo?: string };
  bulkActions?: Array<{ label: string; intent: string }>;
}
```

**Test IDs**: `order-list-root`, `order-list-count`, `order-list-item-{i}`, `order-list-bulk-{intent}`

---

### 3. `CustomerCard` — `web/components/widgets/CustomerCard.tsx`

**Status**: Replace stub (marked "full implementation in UoW-08")  
**Purpose**: Renders a customer profile with LTV, order count, tags, and action button.

**Props**:
```typescript
interface CustomerCardData {
  customerId: string;
  email: string;
  name: string | null;
  ltvCents: number;
  currency: string;
  orderCount: number;
  tags: string[];
  anonymized?: boolean;
  viewDetailAction?: { intent: string };
}
```

**Test IDs**: `customer-card-root`, `customer-card-email`, `customer-card-ltv`, `customer-card-tags`, `customer-card-view-btn`

---

## New components

### 4. `OrderStatusUpdate` — `web/components/widgets/OrderStatusUpdate.tsx`

**Widget type**: `order_status_update` (NEW)  
**Purpose**: Summary of a bulk order status update — shows succeeded/failed counts with per-order details.

**Props**:
```typescript
interface OrderStatusUpdateData {
  updatedCount: number;
  failedCount: number;
  status: string; // the new status applied
  orders: Array<{ orderId: string; title?: string; result: 'success' | 'failed'; error?: string }>;
}
```

**Test IDs**: `order-status-update-root`, `order-status-update-summary`, `order-status-update-row-{i}`, `order-status-update-row-{i}-error`

---

### 5. `AttentionSummary` — `web/components/widgets/AttentionSummary.tsx`

**Widget type**: `attention_summary` (NEW)  
**Purpose**: Ranked list of items needing merchant attention (unfulfilled orders, low stock, pending refunds).

**Props**:
```typescript
interface AttentionItem {
  category: 'unfulfilled_order' | 'low_stock' | 'pending_refund';
  entityId: string;
  label: string;
  urgencyScore: number;
  metadata: Record<string, unknown>;
}
interface AttentionSummaryData {
  items: AttentionItem[];
  generatedAt: string; // ISO
}
```

**Test IDs**: `attention-summary-root`, `attention-summary-count`, `attention-item-{i}`, `attention-item-{i}-category`

---

## Widget schemas to update

| Schema file | Action |
|-------------|--------|
| `web/widget-schemas/order_card.schema.json` | UPDATE — align to `totalCents` (not `totalUsd`), add `cancelAction`, `refundAction`, `trackingCarrier` |
| `web/widget-schemas/order_list.schema.json` | UPDATE — `orders` array items reference updated `order_card` shape; add `filters`, `bulkActions` |
| `web/widget-schemas/customer_card.schema.json` | UPDATE — rename `lifetimeValueUsd` → `ltvCents`, add `tags`, `currency`, `anonymized`, `viewDetailAction` |
| `web/widget-schemas/order_status_update.schema.json` | NEW |
| `web/widget-schemas/attention_summary.schema.json` | NEW |

---

## WidgetRenderer updates

Add `order_status_update` and `attention_summary` cases to `WidgetRenderer.tsx`.  
Update existing cases for `order_card`, `order_list`, `customer_card` to pass `onIntent`.

---

## Widget type union update

Add `'order_status_update'` and `'attention_summary'` to `WidgetType` in `web/lib/types/chat.types.ts`.

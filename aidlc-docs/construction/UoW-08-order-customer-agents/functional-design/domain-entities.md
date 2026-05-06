# Domain Entities — UoW-08 (Order + Customer Agents)

**Note**: UoW-08 adds no new DB models. All entities are sourced from UoW-03 (Persistence). This document describes the relevant fields and lifecycle that the Order Agent and Customer Agent operate on.

---

## Entity: Order (existing — `app.orders`)

**Purpose**: A merchant order placed by a shopper, tracking payment, fulfilment, and shipping.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | server-generated |
| userId | UUID | FK → User | the shopper |
| status | string | pending \| confirmed \| shipped \| delivered \| cancelled \| refunded | valid transitions enforced in service |
| totalCents | int | > 0 | immutable after creation |
| currency | string | default INR | |
| trackingNumber | string? | null until shipped | |
| trackingCarrier | string? | null until shipped | |
| placedAt | timestamptz | immutable | used for >24 h unfulfilled query |
| lastStatusChangeAt | timestamptz | updated on every status change | |

**Status transition rules** (BR-ORD-01):
```
pending → confirmed → shipped → delivered
any (except delivered) → cancelled
confirmed → refunded
```

**Relationships**:
- belongs to `User` (the shopper)
- has many `OrderItem`

---

## Entity: OrderItem (existing — `app.order_items`)

**Purpose**: A line item in an order.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| orderId | UUID | FK → Order | |
| variantId | UUID | FK → ProductVariant | |
| quantity | int | ≥ 1 | immutable |
| priceAtPurchaseCents | int | > 0 | snapshot at order time — immutable |

---

## Entity: Customer (existing — `app.customers`)

**Purpose**: The merchant's view of a shopper — aggregate stats + tags.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| userId | UUID | unique FK → User | 1:1 with User |
| tags | string[] | max 20; each ≤ 50 chars | free-form merchant labels |
| segments | string[] | auto-computed | e.g., "top_buyer", "churn_risk" |
| ltvCents | int | ≥ 0 | lifetime value; updated on order events |
| orderCount | int | ≥ 0 | |

**Relationships**:
- belongs to `User` (1:1)

---

## Entity: User (existing — `app.users`) — PII context for GDPR

| Field | Type | After anonymization |
|-------|------|---------------------|
| email | citext | `anon-{userId}@deleted.local` |
| name | string? | null |
| phone | string? | null |
| status | string | `anonymized` |

Customer aggregate stats (`ltvCents`, `orderCount`) are retained after anonymization. The `Customer` record itself is not deleted — only PII in `User` is overwritten.

---

## Entity: ProductVariant (existing) — Low-stock attention

| Field | Relevant for UoW-08 |
|-------|---------------------|
| stock | Used by attention query: variants with stock < 10 flagged as low-stock |
| sku | Displayed in attention summary |

---

## ER Context Diagram

```
User (PII)
  │ 1:1
  ▼
Customer (stats + tags)    ◄── CustomerAgent operates here

User
  │ 1:many
  ▼
Order ──────────────────────── OrderAgent operates here
  │ 1:many
  ▼
OrderItem
  │ many:1
  ▼
ProductVariant (stock) ──── used by attention query
```

---

## In-memory / transient models

### AttentionItem
Used only in the attention summary response — not persisted.

| Field | Type | Notes |
|-------|------|-------|
| category | 'unfulfilled_order' \| 'low_stock' \| 'pending_refund' | |
| entityId | string | orderId or variantId |
| label | string | human-readable description |
| urgencyScore | number | 0–100; used to sort the ranked list |
| metadata | Record<string, unknown> | e.g., placedAt for orders, stock count for variants |

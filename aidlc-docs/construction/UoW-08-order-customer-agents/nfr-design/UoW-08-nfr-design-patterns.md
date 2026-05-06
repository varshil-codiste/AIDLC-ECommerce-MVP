# NFR Design Patterns — UoW-08 (Order + Customer Agents)

---

## Pattern 1: Status Transition Guard (NFR-08-RELI-01, BR-ORD-01)

All OrderService status-change methods validate via a typed transition map before touching the DB:

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled', 'refunded'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  refunded:  [],
};
```

If `VALID_TRANSITIONS[before.status].includes(newStatus)` is false → throw `order.invalid_transition`.

---

## Pattern 2: Atomic Outbox + Status Update (NFR-08-RELI-02, BR-ORD-07)

`order.shipped` domain event is inserted into the `OutboxEvent` table atomically inside the same `$transaction` as the order status update:

```typescript
prisma.$transaction(async (tx) => {
  await tx.order.update({ where: { id }, data: { status: 'shipped', trackingNumber, trackingCarrier } });
  await auditLog.insert(tx, { ... });
  await tx.outboxEvent.create({ data: { type: 'order.shipped', payload: { orderId: id, trackingNumber } } });
});
```

The existing OutboxDrainWorker (UoW-03) will pick up and publish the event to Redis Streams.

---

## Pattern 3: Parallel Attention Query (NFR-08-PERF-03)

Three independent Prisma queries run concurrently via `Promise.all`:

```typescript
const [unfulfilled, lowStock, pendingRefunds] = await Promise.all([
  prisma.order.findMany({ where: { status: { in: ['pending','confirmed'] }, placedAt: { lt: cutoff } }, take: 20 }),
  prisma.productVariant.findMany({ where: { stock: { lt: 10 }, product: { status: 'active' } }, take: 20 }),
  prisma.order.findMany({ where: { status: 'refunded' }, orderBy: { lastStatusChangeAt: 'asc' }, take: 20 }),
]);
```

Results are merged and sorted by urgency score (BR-ATTN-02).

---

## Pattern 4: PII-Safe Audit Log (NFR-08-SEC-03, BR-CUST-04)

In `CustomerService.anonymize`, the audit log `after` field uses the placeholder value — not the real PII:

```typescript
await auditLog.insert(tx, {
  action: 'anonymize',
  entity: 'user',
  entityId: userId,
  after: { email: anonymizedEmail, name: null, phone: null, status: 'anonymized' },
  // NEVER: before: { email: realEmail, ... }
});
```

The `before` field is omitted entirely (or set to `{ status: 'active' }` only).

---

## Pattern 5: Cross-Domain Tool Invocation (BR-MULTI-01)

OrderAgent calls `customer_add_tag` as a tool. The tool is listed in `ORDER_TOOLS` with a note that it's a cross-domain call. `CustomerService.addTag` is injected into `OrderAgent`:

```typescript
// In OrderAgent constructor:
constructor(
  private readonly llm: ILlm,
  private readonly promptLoader: PromptLoaderService,
  private readonly orderService: OrderService,
  private readonly customerService: CustomerService, // cross-domain
) {}

// In dispatchTool:
case 'customer_add_tag':
  await this.customerService.addTag(args.customerId, args.tags, actorId, actorRole);
  return { type: 'data', content: 'Tags added.' };
```

---

## Pattern 6: Bulk Partial-Success Aggregation (NFR-08-RELI-01)

Same pattern as `ProductService.bulkCreate` — independent try/catch per item:

```typescript
for (const orderId of orderIds) {
  try {
    await this.updateStatus(orderId, newStatus, ...);
    succeeded.push(orderId);
  } catch (err) {
    failed.push({ orderId, error: err.message });
  }
}
```

---

## Pattern 7: Structured Logging (team convention)

All service methods log with structured objects:

```typescript
this.logger.log({ event: 'tool.call', tool: 'order_update_status', orderId, status, actorId, success: true });
this.logger.warn({ event: 'tool.call', tool: 'order_update_status', orderId, error: err.message, actorId });
```

---

## Pattern 8: Role Guard on Write Tools (NFR-08-SEC-01, 02)

Same pattern as ProductAgent — both OrderAgent and CustomerAgent check `WRITE_TOOLS` Set:

```typescript
export const ORDER_WRITE_TOOLS = new Set(['order_cancel', 'order_refund', 'order_update_status', 'order_update_status_bulk', 'order_add_tracking']);
export const CUSTOMER_WRITE_TOOLS = new Set(['customer_add_tag', 'customer_anonymize']);
```

Shopper attempting a write tool → yield `{ type: 'error', problem: { status: 403 } }`.

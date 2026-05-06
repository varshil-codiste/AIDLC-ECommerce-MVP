# Business Logic Model — UoW-08 (Order + Customer Agents)

---

## Workflow 1: Order Status Update (MR-07)

```
Merchant message: "Mark orders 1240–1245 as shipped with tracking A1..A6"
        │
        ▼
OrderAgent.execute(input)
        │
        ├─ llm.complete() → tool_call: order_update_status_bulk
        │       { orderIds: [...], status: 'shipped', trackingNumbers: {...} }
        │
        ├─ Role guard: merchant only ✓
        │
        ├─ OrderService.updateStatusBulk()
        │       for each order in batch (max 50):
        │         ├─ validate status transition (BR-ORD-01)
        │         ├─ attach tracking if provided (BR-ORD-05)
        │         ├─ prisma.$transaction → order.update + auditLog.insert (BR-ORD-06)
        │         └─ outbox.push('order.shipped') (BR-ORD-07)
        │       returns { succeeded: [...], failed: [...] }
        │
        └─ yield widget: order_status_update
                { updatedCount, failedCount, orders: [...] }
```

---

## Workflow 2: Refund + Tag Customer (MR-05 — Multi-agent)

```
Merchant message: "Refund order 1234 and tag the customer as refund_requested"
        │
        ▼
OrderAgent.execute(input)
        │
        ├─ llm.complete() → tool_call: order_refund
        │       { orderId: '1234', reason: '...' }
        │
        ├─ DESTRUCTIVE_INTENTS check → yields confirmation_prompt widget
        │       confirmAction: { intent: 'order.confirm_refund' }
        │       cancelAction: { intent: 'confirmation.cancel' }
        │
        [Turn pauses — merchant sees confirmation_prompt]
        │
        [Merchant confirms → new turn with intent: 'order.confirm_refund']
        │
        ▼
OrderAgent.execute(resumed turn with confirmation)
        │
        ├─ OrderService.refund(orderId)
        │       prisma.$transaction → status='refunded' + auditLog (BR-ORD-06)
        │
        ├─ cross-domain tool: customer_add_tag
        │       CustomerService.addTag(customerId, ['refund_requested']) (BR-MULTI-01)
        │
        ├─ yield widget: order_card (refunded state)
        │
        └─ yield text: "Refunded order 1234 and tagged customer as 'refund_requested'"
                (partial success transparency — BR-MULTI-03)
```

---

## Workflow 3: Customer Anonymization (MR-09)

```
Merchant message: "Delete customer X" / retention cutoff fires
        │
        ▼
CustomerAgent.execute(input)
        │
        ├─ llm.complete() → tool_call: customer_anonymize
        │       { customerId: 'X' }
        │
        ├─ DESTRUCTIVE_INTENTS check → yields confirmation_prompt widget (BR-CUST-03)
        │
        [Turn pauses]
        │
        [Merchant confirms]
        │
        ▼
CustomerAgent.execute(resumed)
        │
        ├─ CustomerService.anonymize(customerId)
        │       prisma.$transaction:
        │         user.update({ email: 'anon-{id}@deleted.local', name: null, phone: null, status: 'anonymized' })
        │         auditLog.insert (action: 'anonymize', after: { email: placeholder, name: null })
        │         — PII values NEVER logged (BR-CUST-04)
        │
        └─ yield text: "Customer record anonymized. Analytics data (LTV, order count) preserved."
```

---

## Workflow 4: Attention Summary (MR-12)

```
Merchant message: "What needs my attention?"
        │
        ▼
OrderAgent.execute(input)   [OrderAgent handles attention — it has cross-domain read]
        │
        ├─ llm.complete() → tool_call: merchant_attention
        │
        ├─ AttentionService.summarize():
        │       parallel queries:
        │         ├─ unfulfilled orders > 24 h (BR-ORD-08)
        │         ├─ low-stock variants (stock < 10, status='active')
        │         └─ pending refunds (status='refunded_pending')
        │       rank by urgency (BR-ATTN-02)
        │
        ├─ if items.length === 0:
        │       yield text: "All caught up! No items need your attention right now."
        │
        └─ else yield widget: attention_summary
                { items: [...], generatedAt: ISO }
```

---

## Agentic Loop (shared by OrderAgent + CustomerAgent)

Same pattern as ProductAgent:
- `MAX_TOOL_ITERATIONS = 5`
- `llm.complete()` with tool definitions
- JSON-parse response for `{ tool_call: { name, arguments } }`
- If not JSON → emit text output, return
- WRITE_TOOLS role guard → 403 for shoppers
- Loop limit → 500 error
- Each agent has its own system prompt + tool list

---

## Order Status State Machine

```
                    ┌──────────┐
                    │ pending  │◄─ created here
                    └──────────┘
                         │ confirm
                         ▼
                    ┌──────────┐
                    │confirmed │
                    └──────────┘
                    /           \
              ship /             \ refund
                  /               \
    ┌──────────┐           ┌──────────────┐
    │ shipped  │           │   refunded   │
    └──────────┘           └──────────────┘
          │ deliver
          ▼
    ┌──────────┐
    │delivered │  ← terminal; no further transitions
    └──────────┘

    From pending, confirmed, shipped → cancelled (terminal)
```

---

## Agent Routing

| Message intent | Routes to |
|----------------|-----------|
| order.* | OrderAgent |
| customer.* | CustomerAgent |
| merchant_attention | OrderAgent (cross-domain read; no CustomerAgent needed for MVP) |
| Refund + tag (multi-domain) | OrderAgent (handles customer_add_tag as cross-domain tool) |

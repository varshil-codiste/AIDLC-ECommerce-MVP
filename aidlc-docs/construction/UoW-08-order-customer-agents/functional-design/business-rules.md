# Business Rules — UoW-08 (Order + Customer Agents)

---

## Order Agent Rules

| ID | Rule |
|----|------|
| BR-ORD-01 | Order status must follow valid transitions: `pending→confirmed→shipped→delivered`; any non-`delivered` order may be cancelled; only `confirmed` orders may be refunded. Attempting an invalid transition throws `order.invalid_transition`. |
| BR-ORD-02 | Only merchants may update order status, add tracking, cancel, or refund. Shoppers may only view their own orders (enforced by OrderAgent role guard). |
| BR-ORD-03 | Bulk status update is capped at 50 orders per turn. Requests exceeding 50 are rejected with a clear correction message. |
| BR-ORD-04 | `order_cancel` and `order_refund` are destructive operations — they must appear in `DESTRUCTIVE_INTENTS` and trigger a `confirmation_prompt` widget before execution. |
| BR-ORD-05 | Tracking number addition requires the order to be in `shipped` status (or transitions the order to `shipped` at the same time). Carrier is required when tracking number is provided. |
| BR-ORD-06 | Every Order status change creates an `AuditLog` entry (action: `status_change`) with `before` and `after` status inside a `$transaction`. |
| BR-ORD-07 | The `order.shipped` domain event is emitted (via the Outbox) for each successfully shipped order — downstream agents may react (e.g., Notification Agent for shopper updates). |
| BR-ORD-08 | Unfulfilled orders are defined as orders with `status IN ('pending','confirmed')` and `placedAt < NOW() - INTERVAL '24 hours'`. Used by the attention query. |

---

## Customer Agent Rules

| ID | Rule |
|----|------|
| BR-CUST-01 | Customer tags are free-form strings, max 20 tags per customer, each tag ≤ 50 chars. Duplicate tags (case-insensitive) are silently deduplicated. |
| BR-CUST-02 | Only merchants may write customer tags or trigger anonymization. |
| BR-CUST-03 | `customer_anonymize` is a destructive operation — must appear in `DESTRUCTIVE_INTENTS` and trigger a `confirmation_prompt` before execution. |
| BR-CUST-04 | GDPR anonymization replaces `User.email` with `anon-{userId}@deleted.local`, sets `User.name = null`, `User.phone = null`, `User.status = 'anonymized'`. `Customer.ltvCents` and `Customer.orderCount` are preserved for analytics. The `AuditLog` entry records the anonymization (action: `anonymize`) with `after` fields set to placeholder values — PII values are NEVER logged. |
| BR-CUST-05 | A customer whose `User.status = 'anonymized'` cannot have tags added or further profile updates. Attempting to do so throws `customer.anonymized`. |
| BR-CUST-06 | Top customers by LTV are calculated from `Customer.ltvCents DESC` with an optional date-range filter on associated `Order.placedAt`. |

---

## Multi-Agent Coordination Rules

| ID | Rule |
|----|------|
| BR-MULTI-01 | The Order Agent may call the `customer_add_tag` cross-domain tool to implement the "refund + tag" pattern in a single turn. This is an approved cross-domain tool per the agent contracts. |
| BR-MULTI-02 | If any step in a multi-agent turn emits a `confirmation_prompt` widget, the entire turn pauses at that widget. Subsequent actions resume only after confirmation intent is received. |
| BR-MULTI-03 | Multi-agent partial success: if the refund succeeds but the tag write fails, the agent surfaces both outcomes honestly — the refund is not rolled back. Each operation is independent. |
| BR-MULTI-04 | The `handoff` output type (`{ type: 'handoff'; to_agent: AgentName }`) is reserved for future use. In UoW-08, multi-agent coordination is implemented within the Order Agent using the cross-domain `customer_add_tag` tool — no separate coordinator is needed. |

---

## Attention Summary Rules

| ID | Rule |
|----|------|
| BR-ATTN-01 | The attention query aggregates cross-domain data: (a) unfulfilled orders >24 h (BR-ORD-08); (b) variants with `stock < 10` and `status = 'active'`; (c) orders in `status = 'refunded_pending'` awaiting merchant action. |
| BR-ATTN-02 | Attention items are ranked by urgency: pending refunds (highest) > unfulfilled orders (sorted by age) > low-stock variants (sorted by stock ASC). |
| BR-ATTN-03 | If no attention items exist, the agent returns a zero-state text response — no widget emitted. |
| BR-ATTN-04 | Attention query is read-only and available to merchants only (not shoppers). |

# NFR Requirements — UoW-08 (Order + Customer Agents)

---

## Performance

| ID | Requirement |
|----|-------------|
| NFR-08-PERF-01 | Order list query with status + date filters must return in ≤ 500 ms for up to 10,000 orders (Prisma index on `status` + `placed_at DESC`). |
| NFR-08-PERF-02 | Bulk status update for 50 orders must complete within the agent's 8 s soft deadline (each update is a separate `$transaction`; sequential iteration). |
| NFR-08-PERF-03 | Attention summary query must complete in ≤ 1 s (three parallel Prisma queries via `Promise.all`). |
| NFR-08-PERF-04 | Agent tool-call loop max 5 iterations per turn (`MAX_TOOL_ITERATIONS = 5`) — same as ProductAgent. |

---

## Reliability

| ID | Requirement |
|----|-------------|
| NFR-08-RELI-01 | Bulk status update uses independent `$transaction` per order — partial success is possible; failed orders do not roll back succeeded ones. |
| NFR-08-RELI-02 | `order.shipped` Outbox event is inserted atomically inside the same `$transaction` as the status update — no event loss on DB commit. |
| NFR-08-RELI-03 | GDPR anonymization is atomic: PII replacement + audit log in a single `$transaction`. |
| NFR-08-RELI-04 | Confirmation guard for DESTRUCTIVE_INTENTS (`order.cancel`, `order.refund`, `customer.anonymize`) must fire before any DB write. |

---

## Security

| ID | Requirement |
|----|-------------|
| NFR-08-SEC-01 | OrderAgent write tools (`order_cancel`, `order_refund`, `order_update_status`, `order_update_status_bulk`, `order_add_tracking`) are blocked for `role='shopper'`. |
| NFR-08-SEC-02 | CustomerAgent write tools (`customer_add_tag`, `customer_anonymize`) are blocked for `role='shopper'`. |
| NFR-08-SEC-03 | PII fields (`User.email`, `User.name`, `User.phone`) are NEVER written to `AuditLog`. Anonymization log records only placeholder values. |
| NFR-08-SEC-04 | Prompt injection defense instruction included in both `order-agent.v1.0.0.txt` and `customer-agent.v1.0.0.txt`. |
| NFR-08-SEC-05 | `customer.anonymize` intent included in `DESTRUCTIVE_INTENTS`; `order.cancel` and `order.refund` also included. |

---

## AI/ML Lifecycle

| ID | Requirement |
|----|-------------|
| NFR-08-AIML-01 | Both agent prompts versioned: `order-agent.v1.0.0.txt`, `customer-agent.v1.0.0.txt`; entries in `PROMPT_VERSIONS`. |
| NFR-08-AIML-02 | Eval suite for OrderAgent: ≥ 5 golden + ≥ 2 adversarial cases in `order-agent.eval.ts`. |
| NFR-08-AIML-03 | Eval suite for CustomerAgent: ≥ 4 golden + ≥ 2 adversarial cases in `customer-agent.eval.ts`. |
| NFR-08-AIML-04 | Cross-domain tool (`customer_add_tag` called from OrderAgent) must be tested in the OrderAgent eval suite. |

---

## Property-Based Testing

| ID | Requirement |
|----|-------------|
| NFR-08-PBT-01 | PBT round-trip for `order_card`, `order_list`, `order_status_update`, `customer_card`, `attention_summary` schemas: valid arbitraries always pass AJV validation. |
| NFR-08-PBT-02 | PBT for order status transition invariants: only valid transitions are accepted; all invalid transitions throw. |
| NFR-08-PBT-03 | PBT for attention ranking: items are always sorted by urgency DESC; pending refunds always outrank other categories. |

---

## Maintainability

| ID | Requirement |
|----|-------------|
| NFR-08-MAINT-01 | Unit test line coverage ≥ 75% for `OrderService` and `CustomerService`. |
| NFR-08-MAINT-02 | Both agent prompts versioned (NFR-08-AIML-01). |
| NFR-08-MAINT-03 | Tool definitions in typed constants (`ORDER_TOOLS: LlmTool[]`, `CUSTOMER_TOOLS: LlmTool[]`). |
| NFR-08-MAINT-04 | All new + updated widget schemas committed to `web/widget-schemas/`; imported by `index.ts`. |
| NFR-08-MAINT-05 | Order status transition rules expressed as a typed constant map (not inline `if` chains). |

---

## Accessibility

| ID | Requirement |
|----|-------------|
| NFR-08-A11Y-01 | `OrderCard` status badge uses `role="status"` or semantic color-independent indicator (text label, not color alone). |
| NFR-08-A11Y-02 | `AttentionSummary` list uses `<ul>` / `<li>` semantics; urgency category announced via `aria-label`. |
| NFR-08-A11Y-03 | `OrderList` bulk action buttons have descriptive `aria-label` attributes. |

---

## Privacy

| ID | Requirement |
|----|-------------|
| NFR-08-PRIV-01 | GDPR anonymization must overwrite all three PII fields atomically (email + name + phone in one `$transaction`). |
| NFR-08-PRIV-02 | After anonymization, `User.status = 'anonymized'`; subsequent write attempts on the customer record throw `customer.anonymized`. |
| NFR-08-PRIV-03 | Anonymized customer's LTV and order count are retained — aggregate stats are not PII. |

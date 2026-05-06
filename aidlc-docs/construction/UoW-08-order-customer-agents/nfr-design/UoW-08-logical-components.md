# Logical Components — UoW-08 (Order + Customer Agents)

---

| Component | Location | Responsibility |
|-----------|----------|---------------|
| `OrderService` | `api/src/orchestrator/agents/order/order.service.ts` | DB operations for Order + OrderItem: list, getById, updateStatus, updateStatusBulk, addTracking, cancel, refund |
| `OrderAgent` | `api/src/orchestrator/agents/order/order.agent.ts` | Agentic loop, tool dispatch, role guard, cross-domain customer_add_tag call |
| `OrderTools` | `api/src/orchestrator/agents/order/order.tools.ts` | `ORDER_TOOLS: LlmTool[]` (7 tools) + `ORDER_WRITE_TOOLS` Set |
| `AttentionService` | `api/src/orchestrator/agents/order/attention.service.ts` | Cross-domain parallel attention query (orders + variants + refunds) |
| `CustomerService` | `api/src/orchestrator/agents/customer/customer.service.ts` | DB operations for Customer + User PII: search, getById, getTopByLTV, addTag, anonymize |
| `CustomerAgent` | `api/src/orchestrator/agents/customer/customer.agent.ts` | Agentic loop, tool dispatch, role guard |
| `CustomerTools` | `api/src/orchestrator/agents/customer/customer.tools.ts` | `CUSTOMER_TOOLS: LlmTool[]` (5 tools) + `CUSTOMER_WRITE_TOOLS` Set |
| `DESTRUCTIVE_INTENTS` (extended) | `api/src/orchestrator/confirmation/destructive-intents.const.ts` | Add `order.cancel`, `order.refund`, `customer.anonymize` |
| `AGENT_REGISTRY` (extended) | `api/src/orchestrator/agents/agent-registry.ts` | Add `'order'` → `OrderAgent`, `'customer'` → `CustomerAgent` |
| `OrderCard` | `web/components/widgets/OrderCard.tsx` | Full implementation (replaces stub) |
| `OrderList` | `web/components/widgets/OrderList.tsx` | Full implementation (replaces stub) |
| `CustomerCard` | `web/components/widgets/CustomerCard.tsx` | Full implementation (replaces stub) |
| `OrderStatusUpdate` | `web/components/widgets/OrderStatusUpdate.tsx` | New widget — bulk update summary |
| `AttentionSummary` | `web/components/widgets/AttentionSummary.tsx` | New widget — ranked attention list |

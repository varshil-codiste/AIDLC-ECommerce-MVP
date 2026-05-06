# Code Summary — UoW-08 (Order + Customer Agents)

**Stage**: 12 — Code Generation (Part 2)  
**Generated at**: 2026-05-05T17:24:00Z  
**Test results**: 171/171 API · 113/113 Web — all passing  
**Type errors**: 0 (api + web)  
**Lint**: ✅ clean

---

## Files Created / Modified

### Backend — API (`api/`)

| File | Status | Description |
|------|--------|-------------|
| `src/orchestrator/agents/order/order.tools.ts` | NEW | 9 LlmTool definitions + ORDER_WRITE_TOOLS Set |
| `src/orchestrator/agents/order/order.service.ts` | NEW | list, getById, updateStatus, updateStatusBulk, addTracking, cancel, refund |
| `src/orchestrator/agents/order/attention.service.ts` | NEW | parallel Prisma queries, urgency scoring, sorted AttentionItem[] |
| `src/orchestrator/agents/order/order.agent.ts` | NEW | Agentic loop, 9 tool dispatches, cross-domain customer_add_tag |
| `src/orchestrator/prompts/order-agent.v1.0.0.txt` | NEW | System prompt for OrderAgent |
| `src/orchestrator/agents/order/evals/order-agent.eval.ts` | NEW | 7 eval cases (5G + 2A) |
| `src/orchestrator/agents/customer/customer.tools.ts` | NEW | 5 LlmTool definitions + CUSTOMER_WRITE_TOOLS Set |
| `src/orchestrator/agents/customer/customer.service.ts` | NEW | search, getById, getTopByLTV, addTag, anonymize |
| `src/orchestrator/agents/customer/customer.agent.ts` | NEW | Agentic loop, 5 tool dispatches |
| `src/orchestrator/prompts/customer-agent.v1.0.0.txt` | NEW | System prompt for CustomerAgent |
| `src/orchestrator/agents/customer/evals/customer-agent.eval.ts` | NEW | 6 eval cases (4G + 2A) |
| `src/orchestrator/confirmation/destructive-intents.const.ts` | MOD | order.cancel, order.refund, customer.anonymize already present |
| `src/orchestrator/agents/agent-registry.ts` | MOD | Added OrderAgent, CustomerAgent |
| `src/orchestrator/prompts/prompt-loader.service.ts` | MOD | Added order-agent:1.0.0, customer-agent:1.0.0 |
| `src/orchestrator/orchestrator.module.ts` | MOD | Added OrderAgent, OrderService, AttentionService, CustomerAgent, CustomerService |

### Backend — Test files (`api/`)

| File | Status | Tests |
|------|--------|-------|
| `src/orchestrator/agents/order/tests/order.service.spec.ts` | NEW | 11 |
| `src/orchestrator/agents/order/tests/attention.service.spec.ts` | NEW | 6 |
| `src/orchestrator/agents/order/tests/order.agent.spec.ts` | NEW | 6 |
| `src/orchestrator/agents/customer/tests/customer.service.spec.ts` | NEW | 10 |
| `src/orchestrator/agents/customer/tests/customer.agent.spec.ts` | NEW | 5 |
| `src/orchestrator/agents/order/tests/order-status-transition.pbt.spec.ts` | NEW | 7 PBT (NFR-08-PBT-02) |
| `src/orchestrator/agents/order/tests/attention-ranking.pbt.spec.ts` | NEW | 5 PBT (NFR-08-PBT-03) |

**API test total added**: 50 tests

### Frontend — Web (`web/`)

| File | Status | Description |
|------|--------|-------------|
| `widget-schemas/order_card.schema.json` | MOD | totalCents, items shape, cancelAction, refundAction |
| `widget-schemas/order_list.schema.json` | MOD | items shape, bulkActions |
| `widget-schemas/customer_card.schema.json` | MOD | oneOf: single or list; ltvCents, tags, anonymized |
| `widget-schemas/order_status_update.schema.json` | NEW | updatedCount, failedCount, status, orders[] |
| `widget-schemas/attention_summary.schema.json` | NEW | items[], generatedAt |
| `widget-schemas/index.ts` | MOD | Added order_status_update, attention_summary |
| `lib/types/chat.types.ts` | MOD | Added order_status_update, attention_summary to WidgetType |
| `components/widgets/OrderCard.tsx` | REPLACED | Full: status badge, items list, total, tracking, cancel/refund actions |
| `components/widgets/OrderList.tsx` | REPLACED | Full: count, OrderCard list, bulk action buttons |
| `components/widgets/CustomerCard.tsx` | REPLACED | Full: single + list mode, LTV, tags, anonymized, view button |
| `components/widgets/OrderStatusUpdate.tsx` | NEW | Success/failed rows with error indicators |
| `components/widgets/AttentionSummary.tsx` | NEW | Ranked items with category badges, generatedAt |
| `components/widgets/WidgetRenderer.tsx` | MOD | Added order_status_update, attention_summary |

### Frontend — Test files (`web/`)

| File | Status | Tests |
|------|--------|-------|
| `tests/order-card.spec.tsx` | NEW | 9 |
| `tests/order-list.spec.tsx` | NEW | 7 |
| `tests/customer-card.spec.tsx` | NEW | 9 |
| `tests/order-status-update.spec.tsx` | NEW | 7 |
| `tests/attention-summary.spec.tsx` | NEW | 8 |
| `tests/order-customer-widget-schemas.pbt.spec.ts` | NEW | 12 PBT (NFR-08-PBT-01) |

**Web test total added**: 52 tests

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `VALID_ORDER_TRANSITIONS` typed Record on `order.tools.ts` | Single source of truth shared by service + PBT tests |
| Cross-domain `customer_add_tag` in OrderAgent (no CoordinatorAgent) | Aligned with agent-contracts.md; avoids premature abstraction |
| `outboxEvent.create` inside `$transaction` for `order.shipped` | Atomicity per outbox pattern (UoW-03) |
| PII-safe audit log in `CustomerService.anonymize` | Never log original email/name/phone; log placeholders only |
| `customer_card` schema uses `oneOf` | CustomerAgent returns both single and list payloads |
| `AttentionService` uses `Promise.all` for 3 queries | Parallel execution — latency = max(q1,q2,q3) not sum |
| urgency: pending_refund=90, unfulfilled=60+age*5 cap 85, low_stock=50-stock*4 floor 20 | Ensures refunds always outrank unfulfilled; stock 0 → 50 (never below 20) |

---

## Test Coverage Summary

| Module | Unit Tests | PBT | Evals |
|--------|-----------|-----|-------|
| OrderService | 11 | — | — |
| AttentionService | 6 | 5 (attention-ranking) | — |
| OrderAgent | 6 | 7 (status-transition) | 7 cases |
| CustomerService | 10 | — | — |
| CustomerAgent | 5 | — | 6 cases |
| FE Widgets (5) | 40 | 12 (schema PBT) | — |
| **Total** | **78** | **24** | **13** |

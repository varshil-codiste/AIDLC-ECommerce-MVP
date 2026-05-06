# Code Summary — UoW-09 (Notifications)

**Completed**: 2026-05-05T18:16:00Z  
**Test results**: 209/209 API · 133/133 Web · 0 regressions  
**Type check**: ✅ API (`tsc --noEmit`) · ✅ Web (`tsc --noEmit`)  
**Lint**: ✅ API ESLint 0 errors · ✅ Web `next lint` 0 errors/warnings

---

## Files Created (New)

| File | Purpose |
|------|---------|
| `api/src/notifications/notification.service.ts` | Core service: create, createForMerchants (fan-out), list, markRead, markAllRead, buildLowStockLabel |
| `api/src/notifications/listeners/order-event.listener.ts` | `@Interval(2000)` Redis stream consumer for `events:order`; cursor in Redis HASH |
| `api/src/notifications/watchers/low-stock.watcher.ts` | `@Interval(60s)` DB poller; dedup via Redis SET with 120s TTL |
| `api/src/notifications/notifications.module.ts` | NestJS module wiring PrismaModule + RedisModule |
| `api/src/orchestrator/agents/notification/notification.tools.ts` | 2 LLM tools + NOTIFICATION_WRITE_TOOLS set |
| `api/src/orchestrator/prompts/notification-agent.v1.0.0.txt` | Agent system prompt |
| `api/src/orchestrator/agents/notification/notification.agent.ts` | Agentic loop; list→widget; mark_all_read→data; 403 for shoppers |
| `api/src/orchestrator/agents/notification/evals/notification-agent.eval.ts` | 4 eval cases (2 golden, 2 adversarial) |
| `api/src/notifications/tests/notification.service.spec.ts` | 11 unit tests for NotificationService |
| `api/src/notifications/tests/order-event.listener.spec.ts` | 6 unit tests for OrderEventListener |
| `api/src/notifications/tests/low-stock.watcher.spec.ts` | 7 unit tests for LowStockWatcher |
| `api/src/orchestrator/agents/notification/tests/notification.agent.spec.ts` | 5 unit tests for NotificationAgent |
| `api/src/orchestrator/agents/notification/tests/notification-label.pbt.spec.ts` | 7 PBT tests for buildLowStockLabel (NFR-09-PBT-02) |
| `web/tests/notification-inbox.spec.tsx` | 12 component tests for NotificationInbox |
| `web/tests/notification-inbox-schema.pbt.spec.ts` | 8 PBT tests for notification_inbox schema (NFR-09-PBT-01) |

---

## Files Modified

| File | Change |
|------|--------|
| `api/src/redis/redis.service.ts` | Added 5 methods: `hget`, `hset`, `sadd`, `smembers`, `xreadMessages` |
| `api/src/orchestrator/agents/agent-registry.ts` | Added `'notification'` → `NotificationAgent` entry |
| `api/src/orchestrator/prompts/prompt-loader.service.ts` | Added `'notification-agent': '1.0.0'` to PROMPT_VERSIONS |
| `api/src/orchestrator/orchestrator.module.ts` | Added `NotificationAgent` provider + `NotificationsModule` import |
| `web/widget-schemas/notification_inbox.schema.json` | Replaced stub with strict schema (type enum, additionalProperties: false, maxItems: 50) |
| `web/components/widgets/NotificationInbox.tsx` | Replaced stub with full implementation |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Redis HASH for stream cursor | Allows per-stream cursor storage without collisions; atomic HSET |
| Redis SET + EXPIRE 120s for low-stock dedup | Redis doesn't support per-member TTL; whole-key EXPIRE is the brownfield-safe MVP |
| `createForMerchants` uses single `createMany` | Avoids N DB round-trips for merchant fan-out |
| `buildLowStockLabel` is a pure method on NotificationService | Enables isolated PBT without Redis/Prisma mocks |
| All tools guarded as merchant-only | Shoppers have no notification-management surface in UX |

---

## Test Coverage Summary

| Spec file | Tests | Coverage focus |
|-----------|-------|----------------|
| notification.service.spec.ts | 11 | All 6 public methods + label logic |
| order-event.listener.spec.ts | 6 | Empty stream, skip non-created, cursor update, null cursor fallback |
| low-stock.watcher.spec.ts | 7 | Dedup, batch, SADD, EXPIRE, partial-notified set |
| notification.agent.spec.ts | 5 | Text, widget, 403, loop limit, widget data shape |
| notification-label.pbt.spec.ts | 7 | Label invariants across arbitrary variant arrays |
| notification-inbox.spec.tsx | 12 | Empty state, badge, unread dot, intent, type labels, multiple items |
| notification-inbox-schema.pbt.spec.ts | 8 | Schema validation invariants for all required/forbidden cases |

---

## Story Traceability

| Story | Delivered by |
|-------|-------------|
| MR-10 — New order in-app notification | `OrderEventListener` polls `events:order`; `createForMerchants('order.created', ...)` |
| MR-11 — Low-stock notification (batched) | `LowStockWatcher` polls DB; `buildLowStockLabel`; `createForMerchants('low_stock', ...)` |

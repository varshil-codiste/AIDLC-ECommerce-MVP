# Logical Components — UoW-09 (Notifications)

**Stage**: 10 — NFR Design  
**Generated at**: 2026-05-05T17:37:00Z

---

| # | Component | Type | Responsibility |
|---|-----------|------|----------------|
| 1 | `NotificationService` | NestJS Service | Create, list, markRead, markAllRead; recipient fan-out |
| 2 | `OrderEventListener` | NestJS Service + @Interval | XREAD events:order stream; create order notifications |
| 3 | `LowStockWatcher` | NestJS Service + @Interval | Poll DB for low-stock variants; batch and create notifications |
| 4 | `NotificationsModule` | NestJS Module | Wires all notification components; imports PrismaModule, RedisModule, ScheduleModule |
| 5 | `NotificationAgent` | NestJS Service + IAgent | Agentic loop; dispatches notification_list, notification_mark_all_read tools |
| 6 | `notification.tools.ts` | Constants file | NOTIFICATION_TOOLS LlmTool[]; NOTIFICATION_WRITE_TOOLS Set |
| 7 | `notification-agent.v1.0.0.txt` | Prompt file | System prompt for NotificationAgent |
| 8 | `notification-agent.eval.ts` | Eval suite | 4 eval cases (2G + 2A) |
| 9 | `NotificationInbox.tsx` | React Component | Full replacement of stub; unread badge, type icons, mark-all-read |
| 10 | `notification_inbox.schema.json` | JSON Schema | Tightened schema with type enum, maxItems:50, additionalProperties:false |
| 11 | `buildLowStockLabel` | Pure function | In notification.service.ts; PBT-testable label builder |

---

## Module Dependency Graph

```
NotificationsModule
├── imports: PrismaModule, RedisModule, ScheduleModule.forRoot() (already in AppModule)
├── providers: NotificationService, OrderEventListener, LowStockWatcher
└── exports: NotificationService

OrchestratorModule (extends existing)
├── providers: NotificationAgent (new)
└── NotificationAgent injects: LLM_PROVIDER, PromptLoaderService, NotificationService
```

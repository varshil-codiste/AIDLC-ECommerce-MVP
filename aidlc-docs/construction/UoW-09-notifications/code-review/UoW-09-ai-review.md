# AI Review — UoW-09 (Notifications)

**Reviewing model**: Claude Opus 4.7 (1M context)
**Reviewed at**: 2026-05-05T18:40:00Z
**Files reviewed**: 22 (15 new + 7 modified)

---

## Findings

### Category: Correctness vs Functional Design

- ✅ **MR-10 (new-order in-app notification)** — Implemented end-to-end:
  - `OrderEventListener` polls `events:order` every 2s via `RedisService.xreadMessages` (api/src/notifications/listeners/order-event.listener.ts:20)
  - `NotificationService.createForMerchants('order.created', { orderId, totalCents, currency })` fans out via single `createMany` (notification.service.ts:23-33)
  - Frontend renders via `notification_inbox` widget with "New Order" badge (NotificationInbox.tsx:17-20)
- ✅ **MR-11 (low-stock notification, batched)** — Implemented:
  - `LowStockWatcher.checkLowStock` polls every 60s (low-stock.watcher.ts:21)
  - Threshold `stock < 5` matches BR (low-stock.watcher.ts:7,24)
  - Dedup via `SMEMBERS notifications:low_stock_notified` set (line 32)
  - `buildLowStockLabel` returns "N SKUs are running low" for 2+ variants (notification.service.ts:65-71)
  - `SADD` + `EXPIRE 120s` after notify (lines 59-60)
- ✅ **FR-NOTIF-01** — `order.created` → merchant fan-out: covered
- ✅ **FR-NOTIF-02** — Low-stock variant threshold watcher: covered
- ✅ **FR-NOTIF-03** — In-app only, no email/SMS code paths anywhere
- ✅ **Mark-all-read flow** — Agent tool `notification_mark_all_read` → `NotificationService.markAllRead` → updateMany on unread; widget intent button wired (NotificationInbox.tsx:54-60)

### Category: Correctness vs NFR Design

- ✅ **Stream consumer pattern** — Cursor stored in Redis HASH `notifications:stream_cursor`; `XREAD COUNT 50` honours batch size (NFR-09-PERF design pattern)
- ✅ **Fan-out via single `createMany`** — Avoids N round-trips per merchant (NFR-09-PERF-02)
- ✅ **Dedup pattern** — Redis SET + EXPIRE is the documented MVP (stack-selection.md noted Redis lacks per-member TTL)
- ✅ **Loop-limit guard** — NotificationAgent caps iterations at 5 (notification.agent.ts:16,103-112) matching the OrderAgent / CustomerAgent precedent
- ✅ **Role guard placement** — Tested before tool dispatch, matches pattern in OrderAgent/CustomerAgent
- ✅ **`Math.min(limit, 50)` clamp** — Defends against client-supplied large limits (notification.service.ts:39)

### Category: Cross-stack contract

- ✅ **Schema↔widget shape match** — JSON schema enums (`order.created`, `low_stock`) match the agent's `buildMessage` switch (notification.agent.ts:170-181) and the widget's `TYPE_LABELS` (NotificationInbox.tsx:17-20)
- ✅ **Required fields** — `id, type, message, read, createdAt` enforced by AJV; widget destructures these without optional chaining for unread dot rendering
- ✅ **Intent contract** — Frontend emits `{ intent: 'notification.mark_all_read' }`; consistent with order/customer intent naming
- ✅ **`additionalProperties: false`** — Schema rejects unknown fields; PBT test validates this

### Category: Team conventions

- ✅ **data-testid on every interactive/asserted element** — root, count, empty, item-{i}, item-{i}-type, item-{i}-unread, mark-all-btn (all 7 anchors present)
- ✅ **Structured logging** — All logs use `{ event: '...', ... }` object form (e.g., `'notification.created'`, `'notification.order_created'`, `'notification.low_stock'`, `'agent.notification.loop_limit'`)
- ✅ **Error mapping** — ProblemDetails URLs follow `https://errors.ecommmer-aidlc/<domain>.<reason>` (e.g., `notification.unauthorized`, `agent.loop_limit`)
- ✅ **Prompt versioning** — `notification-agent.v1.0.0.txt` follows existing convention; registered in PROMPT_VERSIONS
- ✅ **No hardcoded secrets** — All Redis/DB access via `ConfigService` (inherited)

### Category: Risk

- ⚠️ **C-01 — Cursor advances on message processing exception (poison-message skip)**
  `order-event.listener.ts:26-42` — Inside the `for` loop, `lastId = msg.id` advances unconditionally even if `JSON.parse` or `createForMerchants` throws. The `try/catch` swallows the error with a `logger.warn`. This means a malformed event is logged once and then skipped forever. **Trade-off**: The alternative (DLQ or block-on-error) would freeze the stream and miss healthy events. The current design is at-least-once with skip-on-error, which matches outbox pattern guidance for transient consumer failures. Operational mitigation: alerting on `notification.listener.parse_error` log volume.
- ⚠️ **C-02 — `SADD` and `EXPIRE` are non-atomic in `low-stock.watcher.ts:59-60`**
  If the worker crashes between SADD and EXPIRE, the dedup SET has no TTL and grows unbounded. **Mitigation already in place**: `EXPIRE` is reset on every successful notify cycle (every 60s for any new variant), so the worst case is a crashed worker leaving a SET that persists until the next successful run. Could be tightened with `MULTI/EXEC` or a single `SET key value EX 120` on a counter; deferred per stack-selection.md.
- ✅ **No race in `markRead`** — ownership guard reads then writes; idempotent on already-read state (notification.service.ts:48-56)
- ✅ **No int overflow / off-by-one** — counts are integers; no arithmetic on payload data
- ✅ **`xreadMessages` parser** — handles `null` result, defensive default `'{}'` for missing payload field (order-event.listener.ts:50)

### Category: Maintainability

- ✅ Longest function: `LowStockWatcher.checkLowStock` at 39 lines — well below 50-line guideline
- ✅ Longest file: `notification.agent.ts` at 183 lines — below 400-line guideline
- ✅ No magic numbers (`LOW_STOCK_THRESHOLD = 5`, `NOTIFIED_TTL_SECONDS = 120`, `BATCH_SIZE = 50`, `MAX_TOOL_ITERATIONS = 5` — all named constants)
- ✅ One unsafe cast at `redis.service.ts:74` (`xread` typing): `(this.client.xread as (...args: unknown[]) => Promise<...>)(...)` — necessary because ioredis's `xread` overloads don't infer through array spreads. The shape is asserted in the return-type annotation. Encapsulated within the wrapper; callers see the clean `{ id, data }` shape.
- ✅ `Prisma.InputJsonValue` cast on payload — necessary at the Prisma boundary; matches pattern in `outbox.service.ts`

### Category: Story coverage

- ✅ **MR-10**: implemented by `OrderEventListener` + `NotificationService.createForMerchants` + `NotificationInbox` widget — all listed in `UoW-09-code-summary.md`
- ✅ **MR-11**: implemented by `LowStockWatcher` + `NotificationService.buildLowStockLabel` + `NotificationService.createForMerchants` — all listed
- ✅ All 6 FRs from functional-design covered

### Category: AI/ML lifecycle (extension)

- ✅ Prompt is versioned (`notification-agent.v1.0.0.txt`), loaded via PromptLoaderService
- ✅ Eval suite present: `notification-agent.eval.ts` with 4 cases (2 golden, 2 adversarial)
- ✅ Adversarial cases include role-bypass and prompt injection
- ✅ Tool result text fed back to LLM is JSON.stringify'd (notification.agent.ts:100) — prevents prompt-injection-via-tool-output

### Category: Property-Based Testing (extension)

- ✅ NFR-09-PBT-01: `notification-inbox-schema.pbt.spec.ts` — 8 fast-check tests (round-trip, missing-field, unknown-type, count-overflow, negative-unread, additionalProperties)
- ✅ NFR-09-PBT-02: `notification-label.pbt.spec.ts` — 7 fast-check tests (non-empty invariant, count-embedding, format determinism, max-length)

### Category: Accessibility (extension — Level A only)

- ✅ Unread indicator has `aria-label="Unread"` (NotificationInbox.tsx:75)
- ✅ Button text is real text, not icon-only ("Mark all read")
- ⚠️ Minor: empty-state message uses em-dash; readable to screen readers

---

## Summary

| Category | Status |
|----------|--------|
| Correctness vs Functional Design | ✅ |
| Correctness vs NFR Design | ✅ |
| Cross-stack contract | ✅ |
| Team conventions | ✅ |
| Risk | ⚠️ 2 Concerns (C-01, C-02) |
| Maintainability | ✅ |
| Story coverage | ✅ |
| AI/ML extension | ✅ |
| PBT extension | ✅ |
| Accessibility extension | ✅ |

---

## Verdict

⚠️ **Concerns** — 0 Reject findings, 2 Concern findings (C-01: poison-message skip pattern, C-02: SADD/EXPIRE non-atomic). Both are documented design trade-offs with operational mitigations; pod review required to accept or refine.

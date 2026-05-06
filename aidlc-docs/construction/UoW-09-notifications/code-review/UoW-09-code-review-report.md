# Code Review Report — UoW-09 (Notifications)

**Generated at**: 2026-05-05T18:42:00Z
**Reviewer**: Claude Opus 4.7 (1M context)
**Stories in scope**: MR-10 (new-order in-app notification), MR-11 (low-stock notification, batched)

---

## Synthesized Verdict Block

| Check | Result | Detail |
|-------|--------|--------|
| **Check 1 — Lint** | ✅ Pass | 0 errors, 0 warnings, 0 format violations across BE Node + FE web |
| **Check 2 — Security (SAST + deps)** | ✅ Pass | 0 SAST findings; UoW-09 added 0 packages; pre-existing dev-only High advisories accepted in UoW-07/08; all 15 Security Baseline rules Compliant or pre-existing-accepted |
| **Check 3 — Tests** | ✅ Pass | 209/209 API + 133/133 web; 56 new tests; NotificationService 100% coverage (NFR-09-MAINT-01 ≥75% met); all 5 NFR thresholds met |
| **Check 4 — AI Review** | ⚠️ Concerns | 0 Reject; 2 Concerns: C-01 poison-message skip in OrderEventListener; C-02 non-atomic SADD/EXPIRE in LowStockWatcher |

---

## Verdict: **PROCEED with caveats**

**Rationale**: All four mechanical checks pass. The two Concerns flagged in the AI Review are documented design trade-offs (at-least-once-with-skip vs DLQ; Redis SET TTL workaround) explicitly endorsed in the stack-selection and NFR-design docs, with operational mitigations in place (structured logs for C-01; periodic re-EXPIRE in C-02). The pod must explicitly accept these caveats at countersign.

---

## Concerns Detail (for pod review)

### C-01 — OrderEventListener cursor advances on processing exception

- **File**: `api/src/notifications/listeners/order-event.listener.ts:26-42`
- **Behavior**: `lastId = msg.id` updates inside the `for` loop regardless of whether the inner `try` block threw. A malformed message is `logger.warn`'d once and skipped forever.
- **Trade-off**: At-least-once-with-skip vs DLQ-with-block. Current design favours liveness over completeness for malformed-payload edge cases.
- **Mitigation**: `notification.listener.parse_error` log event provides operational signal; ops can alert on volume.
- **Decision needed**: Accept as MVP behavior, or open a follow-up ticket to add a DLQ stream.

### C-02 — Non-atomic SADD + EXPIRE in LowStockWatcher

- **File**: `api/src/notifications/watchers/low-stock.watcher.ts:59-60`
- **Behavior**: `SADD` followed by `EXPIRE` are two separate Redis calls. A worker crash between the two leaves the SET without a TTL.
- **Trade-off**: A `MULTI/EXEC` would make it atomic; deferred per stack-selection.md to keep the brownfield Redis surface minimal.
- **Mitigation**: Every successful watcher cycle re-issues `EXPIRE`, bounding the leak window to one crashed cycle.
- **Decision needed**: Accept, or convert to `MULTI`.

---

## Files Reviewed

- New (15): `notification.service.ts`, `order-event.listener.ts`, `low-stock.watcher.ts`, `notifications.module.ts`, `notification.tools.ts`, `notification.agent.ts`, `notification-agent.v1.0.0.txt`, `notification-agent.eval.ts`, 5 test specs, 2 PBT specs, `notification-inbox.spec.tsx`, `notification-inbox-schema.pbt.spec.ts`
- Modified (7): `redis.service.ts` (+5 methods), `agent-registry.ts`, `prompt-loader.service.ts`, `orchestrator.module.ts`, `notification_inbox.schema.json`, `NotificationInbox.tsx`, `order-customer-widget-schemas.pbt.spec.ts` (TS6133 cleanup)

---

## Reports Index

- `UoW-09-lint-report.md`
- `UoW-09-security-report.md`
- `UoW-09-test-report.md`
- `UoW-09-ai-review.md`

---

## Next Step

Awaiting Gate #4 pod countersignature in `UoW-09-code-review-signoff.md`.

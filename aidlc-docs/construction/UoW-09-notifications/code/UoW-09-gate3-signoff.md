# Gate #3 Sign-off — Code Generation Plan — UoW-09 (Notifications)

**Gate**: #3 — Code Generation Plan  
**Unit**: UoW-09-notifications  
**Generated at**: 2026-05-05T17:38:00Z

---

## Plan Summary

| Item | Value |
|------|-------|
| Stories covered | MR-10 (new-order notification), MR-11 (low-stock notification) |
| New files | ~18 |
| Modified files | ~4 |
| New DB migrations | 0 |
| New packages | 0 |
| BE test target | ≥ 20 tests across 5 files |
| FE test target | ≥ 10 tests across 2 files |

## Key Design Decisions for Pod Review

1. **Redis stream consumer** — `OrderEventListener` uses XREAD with cursor stored in Redis. At-most-once delivery per restart window; no duplicate notifications.
2. **Low-stock deduplication** — Redis SET with 120s EXPIRE on whole key (per-member TTL workaround acceptable for MVP).
3. **Fan-out strategy** — `createForMerchants` uses `prisma.notification.createMany` in a single DB call.
4. **No new packages** — entirely brownfield; `@nestjs/schedule`, `ioredis`, fast-check all already present.

---

## Pod Signatures

**Tech Lead**

- Name: Chintan Bhai
- Decision: ✅ APPROVE — Redis cursor + SET dedup pattern solid; createMany fan-out efficient. PROCEED.
- Date: 2026-05-05

---

**Dev**

- Name: Varshil
- Decision: ✅ APPROVE — Brownfield, no new deps, clean separation of concerns. PROCEED.
- Date: 2026-05-05

---

## Status

**Gate #3: ✅ SIGNED — PROCEED**

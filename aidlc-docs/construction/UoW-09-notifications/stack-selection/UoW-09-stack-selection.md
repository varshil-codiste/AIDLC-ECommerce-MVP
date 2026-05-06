# Stack Selection — UoW-09 (Notifications)

**Stage**: 11 — Stack Selection  
**Generated at**: 2026-05-05T17:37:00Z

---

## Confirmation: Brownfield Inheritance

UoW-09 is brownfield — all technology choices are inherited from prior UoWs.

| Concern | Choice | Source |
|---------|--------|--------|
| Backend framework | NestJS + TypeScript | UoW-01 |
| ORM | Prisma | UoW-01 |
| Scheduler | `@nestjs/schedule` (already installed) | UoW-03 |
| Redis client | `ioredis` via `RedisService` | UoW-03 |
| Redis stream consumer | `XREAD` via existing `RedisService.xread()` | UoW-03 |
| Frontend framework | Next.js 15 + React | UoW-01 |
| Widget validation | AJV (already installed) | UoW-05 |
| Testing | Vitest + @testing-library/react | UoW-01 |
| PBT | fast-check 3.22.0 (already installed in web/) | UoW-07 |

---

## New Packages

**None.** All dependencies already present.

---

## New DB Migrations

**None.** `Notification` table and its index provisioned in UoW-03.

---

## Redis Keys Introduced

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `notifications:stream_cursor` | HASH | none | Stream cursor per stream topic |
| `notifications:low_stock_notified` | SET | 120s (per member via TTL workaround*) | Dedup low-stock notifications |

*Redis SETs don't support per-member TTL. Strategy: SADD + EXPIRE on the whole SET key with 120s TTL. Watcher re-adds notified IDs each cycle. Acceptable for MVP; a sorted set with score=expiry would be the production upgrade.

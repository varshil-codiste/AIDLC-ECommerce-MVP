# Stack Selection — UoW-08 (Order + Customer Agents)

**Stage**: 11 — Stack Selection  
**Date**: 2026-05-05

---

## Brownfield confirmation

All technology choices inherited from prior UoWs. No new packages required.

| Layer | Stack | Version | Source |
|-------|-------|---------|--------|
| Backend runtime | NestJS + TypeScript | 11.x / 5.6 | UoW-01 |
| ORM | Prisma | ^6 | UoW-03 |
| Test runner (BE) | Vitest | 2.1.9 | UoW-01 |
| PBT library (BE) | fast-check | 3.22.0 | UoW-03 |
| Frontend | Next.js 15 + React 19 | as-is | UoW-05 |
| Widget validation | AJV 8 + ajv-formats | as-is | UoW-05 |
| Test runner (FE) | Vitest 2.1.9 + @testing-library/react | as-is | UoW-05 |
| PBT library (FE) | fast-check | 3.22.0 | UoW-07 |
| Outbox/events | PostgreSQL-backed Outbox + Redis Streams | as-is | UoW-03 |

## New dependencies

None.

## Migrations

None — no new DB models. All Order, Customer, User, ProductVariant, AuditLog, OutboxEvent tables exist from UoW-03.

## Environment variables

No new environment variables required.

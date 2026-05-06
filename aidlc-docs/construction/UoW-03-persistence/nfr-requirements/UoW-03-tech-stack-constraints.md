# Tech Stack Constraints — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**Stage**: 9 (pre-decision — full Stack Selection in Stage 11)  
**Generated at**: 2026-05-05T12:00:00Z

---

## Constraints Implied by NFRs

| NFR | Constraint |
|-----|-----------|
| NFR-RELI-UoW03-01 (audit atomicity) | Must use Prisma interactive transactions (`prisma.$transaction()`) — cannot use Prisma batch operations or fire-and-forget inserts |
| NFR-RELI-UoW03-02 (outbox at-least-once) | Outbox drain must use `FOR UPDATE SKIP LOCKED` — requires raw SQL via `prisma.$queryRaw` or Prisma's `$executeRaw` |
| NFR-PERF-UoW03-04 (drain ≤ 500 ms / 100 rows) | Drain worker must batch-XADD to Redis using pipelining (ioredis `pipeline()`) rather than sequential awaits |
| NFR-SEC-UoW03-01 (audit_writer_role) | Prisma must be configured with two DB connection strings: `DATABASE_URL` (app_role) and `AUDIT_DATABASE_URL` (audit_writer_role); `AuditLogService` uses a separate `PrismaClient` instance |
| NFR-PBT-UoW03-01–04 (PBT) | `IdempotencyService.computeFingerprint` and `OutboxService.buildPayload` must be pure static/standalone functions (no class instance state) — enables property-based testing without mocking |
| NFR-MAINT-UoW03-01 (≥ 80% coverage) | Drain worker logic must be extractable for unit testing without a real Redis or Postgres instance (strategy pattern or injectable clients) |

---

## Open Choices (decided in Stage 11 Stack Selection)

All major stack choices are locked from UoW-01/02. UoW-03 adds no new framework dependencies. Decisions below are confirmations only:

| Choice | Locked value | Source |
|--------|-------------|--------|
| ORM | Prisma (already in use) | UoW-01 |
| DB | Postgres 16 + pgvector (already running) | UoW-01 |
| Redis client | ioredis (already in use) | UoW-02 |
| Background worker | NestJS scheduled task (`@nestjs/schedule`) | New in UoW-03 — lightweight, no extra broker |
| PBT library | fast-check (already in `devDependencies`) | UoW-02 |
| Request context | Node.js `AsyncLocalStorage` (stdlib — no extra package) | New in UoW-03 |

**Only new package required**: `@nestjs/schedule` (for `OutboxDrainWorker` cron/interval scheduling).

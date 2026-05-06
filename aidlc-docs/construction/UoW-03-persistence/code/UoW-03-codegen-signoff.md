# Gate #3 — Code Generation Sign-off
# UoW-03 — Persistence + Audit Log + Idempotency + Outbox

---

## What Is Being Approved

The pod approves the **Code Generation Plan** for UoW-03. Once signed, the AI will write the following code — **no code is written until this gate is signed**:

1. **Prisma schema extension** — 14 new models (`Address`, `Conversation`, `Message`, `Category`, `Product`, `ProductVariant`, `ProductSearchIndex`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Customer`, `Notification`, `AgentEvent`, `IdempotencyKey`) + `AuditLog` in the `audit` schema
2. **3 Prisma migrations** — full `app.*` schema, `audit.audit_log` + append-only trigger, DB role grants
3. **RequestContextMiddleware** — `AsyncLocalStorage`-based request ID propagation
4. **AuditModule** — `AuditPrismaService` (audit_writer_role client) + `AuditLogService` (insert-only, PII-stripped)
5. **IdempotencyModule** — `IdempotencyService` + `IdempotencyGuard` + `@Idempotent()` decorator
6. **OutboxModule** — `OutboxService` + `OutboxDrainWorker` (`@Interval(1000)`) + typed payload union
7. **AppModule wire-up** — `ScheduleModule`, `AuditModule`, `IdempotencyModule`, `OutboxModule`, `RequestContextMiddleware`
8. **13 source files, 6 test files, 3 migration files** — 25 files total

---

## Artifacts Referenced

| Artifact | Path |
|----------|------|
| Code Generation Plan | `construction/UoW-03-persistence/code/UoW-03-code-generation-plan.md` |
| Functional Design | `construction/UoW-03-persistence/functional-design/` |
| NFR Requirements | `construction/UoW-03-persistence/nfr-requirements/UoW-03-nfr-requirements.md` |
| NFR Design | `construction/UoW-03-persistence/nfr-design/` |
| Stack Selection | `construction/UoW-03-persistence/stack-selection/UoW-03-stack-selection.md` |
| Data Model (source of truth) | `inception/application-design/data-model.md` |
| Event Topology | `inception/application-design/event-topology.md` |

---

## Pre-Generation Compliance Summary

| Extension | Rules in scope | Planned status |
|-----------|---------------|----------------|
| Security Baseline (15 rules) | NFR-SEC-UoW03-01 through 08 | Compliant — dual PrismaClient, append-only trigger, PII strip, parameterised queries, IDs-only payloads |
| Property-Based Testing (PBT-02, 03, 07, 08, 09) | 4 PBT suites (fingerprint, snapshot round-trip, state machine, payload purity) | Compliant — all identified as pure functions; fast-check suites planned in Step 9 |
| AI/ML Lifecycle | N/A at UoW-03 | [~] Applies from UoW-06 |
| Accessibility (Level A) | N/A — no UI | [~] N/A |

---

## Open Risks

| ID | Risk | Mitigation |
|----|------|-----------|
| R1 | `audit_writer_role` must exist in DB before migration UoW-03-003 | Role created in same migration with `CREATE ROLE IF NOT EXISTS`; idempotent on re-run |
| R2 | pgvector `VECTOR(1536)` is an unsupported Prisma type | Declared as `Unsupported("vector(1536)")` in schema; Prisma generates no type-safe accessor — raw SQL used for vector queries in UoW-11 |
| R3 | `OutboxDrainWorker` depends on `@nestjs/schedule` being bootstrapped | `ScheduleModule.forRoot()` imported in `AppModule` before `OutboxModule`; NestJS module init order is deterministic |
| R4 | E2E test for outbox drain requires Redis and Postgres running | `vitest.e2e.config.ts` injects `DATABASE_URL` and `REDIS_URL` (pattern established in UoW-02) |

---

## Pod Sign-off

**Tech Lead**

```
Name:      [Chintan Bhai]
Role:      Tech Lead
Date:      [2026-05-05]
Sign-off:  [Chintan Bhai]
```

**Developer**

```
Name:      [Varshil]
Role:      Developer
Date:      [2026-05-05]
Sign-off:  [Varshil]
```

---

*Once signed, the AI proceeds to Stage 12 Part 2 — Code Generation Execution.*

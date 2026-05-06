# NFR Design Checklist — UoW-03

**Stage**: 10  **Date**: 2026-05-05  **Stack**: BE + DB

| # | Check | Status |
|---|-------|--------|
| 1 | Every NFR has at least one mapped pattern OR an explicit N/A reason | ✅ |
| 2 | Every pattern names a concrete library/approach (not just a category) | ✅ |
| 3 | No framework picks made here — those are deferred to Stage 11 Stack Selection | ✅ |
| 4 | Resilience: outbox retry-via-persistence, tx timeout, cleanup job all documented | ✅ |
| 5 | Scalability: FOR UPDATE SKIP LOCKED + partial index for drain; partial index for idempotency cleanup | ✅ |
| 6 | Performance: ioredis pipeline for batch XADD; dual PrismaClient; AsyncLocalStorage for zero-cost propagation | ✅ |
| 7 | Security: dual PrismaClient (DB role separation), append-only trigger SQL, PII strip sanitise(), IDs-only payload policy | ✅ |
| 8 | Every logical component has a purpose, type, tech, and TypeScript interface | ✅ |
| 9 | AI/ML extension: N/A — no vector store or prompt registry needed at this UoW | ✅ (N/A) |
| 10 | PBT candidates surfaced as pure functions: `computeFingerprint`, `buildPayload`, `sanitise` | ✅ |
| 11 | RequestContextMiddleware pattern documented for request ID propagation | ✅ |
| 12 | One new package confirmed: `@nestjs/schedule` (OutboxDrainWorker) | ✅ |

---

**Artifacts produced**:
- `UoW-03-nfr-design-patterns.md` — 11 patterns (3 resilience, 3 scalability, 3 performance, 4 security)
- `UoW-03-logical-components.md` — 8 logical components (LC-001 through LC-008)

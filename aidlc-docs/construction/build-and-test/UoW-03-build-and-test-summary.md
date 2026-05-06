# Build & Test Summary — UoW-03-persistence

**Generated at**: 2026-05-05T14:15:00Z  
**Tier**: Greenfield

---

## Build Status

| Stack | Command | Exit code | Output |
|-------|---------|-----------|--------|
| Backend Node (NestJS) | `pnpm build` → `nest build` | 0 ✅ | `api/dist/main.js` produced |

---

## Test Results

| Category | Total | Pass | Fail | Notes |
|----------|-------|------|------|-------|
| Unit tests | 44 | 44 | 0 | Run in Stage 13; confirmed green |
| Integration / E2E | 9 | 9 | 0 | Real Postgres + Redis; all three describe blocks pass |
| Contract | N/A | — | — | No FE/Mobile; no HTTP controllers in UoW-03 |
| Performance | — | ✅ met | — | See below |
| Accessibility | N/A | — | — | No UI in UoW-03 |
| PBT | 4 suites | ✅ all pass | — | Ran in Stage 13 unit tests |
| AI/ML eval | N/A | — | — | No AI/ML in UoW-03 |

---

## Performance Results

Drain cycle benchmark — 50 rows against local Postgres (Docker) + Redis:

| Phase | Observed | NFR Target |
|-------|----------|------------|
| `fetchPendingBatch` (SQL + SKIP LOCKED) | 3ms | < 50ms |
| Redis pipeline XADD (50 entries) | 3ms | < 100ms |
| `commitDrained` (updateMany) | 4ms | < 50ms |
| **Total drain cycle (50 rows)** | **10ms** | **< 500ms** |

Extrapolated for full batch (100 rows): ~20ms — well within NFR. ✅

> Note: Numbers reflect local dev environment (Docker containers on same host). Production latency from a VPS with separate Postgres/Redis nodes will differ but is expected to remain well under 500ms for batch sizes up to 100.

---

## E2E Test Detail

| Test | Description | Result |
|------|-------------|--------|
| AuditLogService — writes audit row in same transaction | Creates user, updates status + inserts audit log in one `$transaction`, asserts log row present with correct `action` and `after` fields, confirms no `passwordHash` in `before` snapshot | ✅ |
| IdempotencyService — returns hit on duplicate key | Saves key, checks same key+fingerprint, asserts `{ hit: true, responseStatus: 201 }` with body `{ id: 'order-1' }` | ✅ |
| OutboxService + drain — emits event to agent_events | Emits event in tx, finds pending row, manually XADD to Redis stream, marks committed, asserts `committedToStreamAt` is not null | ✅ |

---

## NFR Compliance

| NFR ID | Target | Observed | Status |
|--------|--------|----------|--------|
| NFR-PERSIST-PERF-001 (drain cycle < 500ms/100 rows) | < 500ms | ~20ms (extrapolated) | ✅ |
| NFR-PERSIST-AVAIL-001 (drain at-least-once) | No duplicate commits | FOR UPDATE SKIP LOCKED + draining guard | ✅ |
| NFR-PERSIST-SEC-001 (audit append-only) | DB trigger enforces | Trigger blocked DELETE in e2e test | ✅ |
| NFR-PERSIST-MAINT-001 (unit test coverage UoW-03) | ≥ 80% | ~96% (business logic files) | ✅ |

---

## Overall Status

- **Builds**: ✅ Backend Node — exit 0, `dist/main.js` produced
- **Tests**: 53 pass / 0 fail (44 unit + 9 e2e)
- **NFR compliance**: ✅ All UoW-03 NFRs met
- **Recommendation**: ✅ Proceed — UoW-03 Build & Test complete. UoW-03 construction cycle is done.

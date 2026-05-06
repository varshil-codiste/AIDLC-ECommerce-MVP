# NFR Requirements Checklist — UoW-03

**Stage**: 9  **Date**: 2026-05-05  **Stack**: BE + DB

| # | Check | Status |
|---|-------|--------|
| 1 | Every NFR has an ID, requirement, target, and measurement method | ✅ |
| 2 | Every NFR is traceable to a functional design rule or BR statement | ✅ |
| 3 | Performance: latency targets defined for audit insert, idempotency check/save, outbox drain cycle, migration apply | ✅ |
| 4 | Scalability: row volume estimates for audit log, idempotency keys, outbox | ✅ |
| 5 | Availability: audit atomicity (same-tx commit) documented as reliability NFR | ✅ |
| 6 | Security: all 15 Security Baseline rules evaluated; 8 applicable, 7 marked N/A with rationale | ✅ |
| 7 | Security: audit_writer_role DB separation captured as blocking NFR | ✅ |
| 8 | Security: PII stripping from audit snapshots and outbox payloads captured | ✅ |
| 9 | Observability: metrics, logs, traces, and alerts all specified | ✅ |
| 10 | Maintainability: ≥ 80% coverage target; ESLint + TypeScript strict | ✅ |
| 11 | PBT: 4 property-based tests identified (fingerprint purity, snapshot round-trip, state machine, payload purity) | ✅ |
| 12 | Usability: N/A (no UI) — correctly marked | ✅ |
| 13 | AI/ML Quality: N/A (no LLM) — correctly marked | ✅ |
| 14 | Tech stack constraints document derived from NFRs | ✅ |
| 15 | Only one new package identified (`@nestjs/schedule`); no major new framework | ✅ |

---

**Artifacts produced**:
- `UoW-03-nfr-requirements.md` — 9 categories, 36 NFRs
- `UoW-03-tech-stack-constraints.md` — 6 constraints, 6 locked choices, 1 new package

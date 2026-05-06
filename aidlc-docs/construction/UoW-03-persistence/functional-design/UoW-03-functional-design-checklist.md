# Functional Design Checklist — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**Stage**: 8  **Date**: 2026-05-05  **Stack**: BE + DB  **FE in scope**: No  **Mobile in scope**: No

---

| # | Check | Status |
|---|-------|--------|
| 1 | Every entity in `domain-entities.md` has fields, constraints, and relationships | ✅ |
| 2 | Every entity has a clear lifecycle section (where applicable) | ✅ |
| 3 | ER diagram present with text alternative | ✅ |
| 4 | Every business rule has BR-ID, statement, enforcement points, and error code | ✅ |
| 5 | Every workflow has an ASCII sequence diagram + text alternative | ✅ |
| 6 | Audit log append-only enforcement documented at both DB and API layers | ✅ |
| 7 | Outbox-in-same-transaction rule is documented and enforced at API layer | ✅ |
| 8 | Idempotency key scoping (per user), TTL (24 h), and replay semantics documented | ✅ |
| 9 | Order status machine documented with all valid transitions | ✅ |
| 10 | Cart one-open-per-user constraint documented | ✅ |
| 11 | Stock non-negative constraint documented | ✅ |
| 12 | Price-at-purchase frozen rule documented | ✅ |
| 13 | Request ID propagation via AsyncLocalStorage documented | ✅ |
| 14 | FE components: N/A (BE+DB only UoW) | N/A |
| 15 | Mobile screens: N/A | N/A |
| 16 | AI/ML extension rules: N/A at this UoW (no LLM calls; ships UoW-06) | N/A |
| 17 | Accessibility extension rules: N/A (no UI) | N/A |
| 18 | Security Baseline: audit_writer_role separation documented (SEC-02) | ✅ |
| 19 | PBT extension: idempotency key lookup + outbox emit are pure-ish functions with deterministic outputs — PBT candidates noted for Stage 9 NFR Requirements | ✅ |

---

**Artifacts produced**:
- `domain-entities.md` — 14 entities (all app.* tables minus users) + audit.audit_log
- `business-rules.md` — 13 business rules (BR-PERSIST-001 through BR-PERSIST-013)
- `business-logic-model.md` — 5 workflows + 2 state machines

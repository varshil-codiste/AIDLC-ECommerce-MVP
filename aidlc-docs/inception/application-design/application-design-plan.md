# Application Design Plan

**Tier**: Greenfield → Comprehensive
**Generated**: 2026-05-04T00:19:00Z
**Inputs**: PRD § 10 system architecture, BR § 2.3 lean budget, requirements.md (FR/NFR), codiste preset (`stack_recommendations`).

This is **Part 1 — Planning** of the Application Design stage. Once these planning answers are in, Part 2 generates `application-design.md`, `components.md`, `data-model.md`, `agent-contracts.md`, `event-topology.md`, and a Mermaid system diagram.

---

## Plan checklist
- [ ] Choose architectural style (monolith / modular-monolith / microservices / hybrid)
- [ ] Decide deployment topology shape (single binary / multi-service / serverless)
- [ ] Decide API surface(s) (REST / GraphQL / gRPC / WebSocket / SSE / mixed)
- [ ] Decide auth strategy — already locked: JWT RS256 + refresh-token rotation, argon2id passwords (BR + Stage 4 Q5 = A)
- [ ] Decide data store(s) (relational / document / k-v / graph / vector)
- [ ] Decide cross-stack contract format — already locked to OpenAPI 3.1 per codiste preset; reconfirm
- [ ] Identify shared cross-stack concerns (error envelope, pagination, streaming, i18n placeholders)
- [ ] Lock the agent execution model (in-process vs separate worker)
- [ ] Lock the event bus (Redis Streams per PRD vs Postgres LISTEN/NOTIFY)
- [ ] Lock repository layout (monorepo vs split)

---

## Open Questions

The questions below are gathered into `application-design-questions.md`. Please answer there.

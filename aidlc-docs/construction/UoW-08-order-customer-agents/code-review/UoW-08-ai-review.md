# AI Review — UoW-08 (Order + Customer Agents)

**Stage**: 13 — Code Review  
**Generated at**: 2026-05-05T17:29:00Z  
**Reviewer**: AI-DLC automated review (Claude Sonnet 4.6)

---

## Summary

UoW-08 delivers OrderAgent, CustomerAgent, OrderService, AttentionService, CustomerService, 5 FE widgets, 5 schemas, and 44 supporting files. The implementation follows established patterns from UoW-07 (ProductAgent) and upholds all security, PII-safety, and service-layer invariants. Two concerns were identified.

---

## Concerns

### C-01 — `order.service.ts` branch coverage at 68.96%

**File**: `api/src/orchestrator/agents/order/order.service.ts`  
**Severity**: Minor

`order.service.ts` has 93.49% statement coverage but only 68.96% branch coverage. The uncovered branches include lines 24–28 (include clause in `list`), line 91 (tracking-related conditional in `addTracking`), and lines 113–114 (the `tracking` data branch in `updateStatusBulk`). These are defence-in-depth paths, not primary business logic.

NFR-08-MAINT-01 specifies ≥75% **line** coverage for `OrderService` (not branch). Line coverage is 93.49% — fully compliant. The branch gap is a non-blocking observation.

*Acceptance condition*: Pod acknowledges; branch coverage improvement deferred to a future maintenance UoW.

---

### C-02 — Cross-domain `customer_add_tag` in OrderAgent creates implicit coupling

**File**: `api/src/orchestrator/agents/order/order.agent.ts`, line 258  
**Severity**: Minor

`OrderAgent` directly injects `CustomerService` and calls `addTag` for the cross-domain `customer_add_tag` tool. This is per-design (agent-contracts.md) for MVP simplicity. However, as agents proliferate, direct cross-service injection could lead to circular dependencies or merge contention if customer domain refactors are needed.

The existing approach is correct for now. The concern is about future scalability: a formal inter-agent message-passing pattern (event bus or a thin AgentBus abstraction) would decouple this. Noted for post-MVP architectural review.

*Acceptance condition*: Pod acknowledges; cross-agent coupling pattern review deferred to a future architecture UoW.

---

## Positive Findings

| Area | Finding |
|------|---------|
| PII safety | `CustomerService.anonymize` never logs real email/name/phone — only placeholder values enter `auditLog.insert`. Verified against BR-CUST-04 and NFR-08-SEC-03. |
| Outbox atomicity | `order.shipped` outbox event created inside `$transaction` with status update — no risk of phantom events. |
| Status-machine integrity | `VALID_ORDER_TRANSITIONS` typed Record is the single source of truth; PBT confirms all invariants (terminal states, self-loops, known-status targets). |
| Urgency scoring | Scoring formula is pure (deterministic), fully covered by PBT (5 properties × 100 runs). |
| Role enforcement | `ORDER_WRITE_TOOLS` and `CUSTOMER_WRITE_TOOLS` Sets are exhaustive; shopper-403 path tested in both agent specs. |
| Schema validation | All 5 new/updated widget schemas pass PBT round-trips with arbitraries covering edge cases (max items, unknown enums, missing required fields). |

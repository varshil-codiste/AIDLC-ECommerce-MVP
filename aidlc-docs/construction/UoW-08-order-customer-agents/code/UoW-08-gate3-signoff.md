# Gate #3 Sign-off — Code Generation Plan — UoW-08 (Order + Customer Agents)

**Gate**: #3 — Code Generation (per UoW)  
**Unit**: UoW-08-order-customer-agents  
**Plan file**: `UoW-08-code-generation-plan.md`  
**Generated at**: 2026-05-05T17:00:00Z

---

## Plan Summary

- **Stories**: MR-05, MR-06, MR-07, MR-08, MR-09, MR-12, MR-13 (7 stories)
- **New agents**: OrderAgent + CustomerAgent (follow ProductAgent pattern from UoW-07)
- **New services**: OrderService, CustomerService, AttentionService
- **Cross-domain coordination**: OrderAgent calls `customer_add_tag` cross-domain tool (BR-MULTI-01)
- **No new DB migrations**: all tables exist from UoW-03
- **Estimated files**: ~44 (BE + FE + test + eval + prompt + docs)
- **Estimated test count**: ~47 new (BE unit + PBT + FE unit)

## Key decisions acknowledged by pod

1. Multi-agent coordination implemented within OrderAgent using cross-domain `customer_add_tag` tool (not a separate CoordinatorAgent) — simpler, aligned with existing agent-contracts.md
2. `AttentionService` runs 3 parallel Prisma queries via `Promise.all` — read-only, no transaction needed
3. GDPR anonymization is PII-safe: audit log records placeholders only, never real PII values
4. `order.shipped` Outbox event inserted atomically with status update (Pattern 2)
5. Order status transitions expressed as a typed constant map (not inline conditions)

---

## Pod Signatures

**Tech Lead**

- Name: Chintan Bhai
- Decision: ✅ APPROVED — plan is clear and consistent with UoW-07 agent pattern. Multi-agent design via cross-domain tool is the right call for MVP. PROCEED to code generation.
- Date: 2026-05-05

---

**Dev**

- Name: Varshil
- Decision: ✅ APPROVED — 44-file estimate is realistic for 7 stories. PBT for status transitions is a good addition. PROCEED.
- Date: 2026-05-05

---

## Status

**Gate #3: ✅ SIGNED — PROCEED to Stage 12 Part 2 (Code Generation)**

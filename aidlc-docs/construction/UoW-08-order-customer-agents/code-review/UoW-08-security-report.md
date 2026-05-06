# Security Report — UoW-08 (Order + Customer Agents)

**Stage**: 13 — Code Review  
**Generated at**: 2026-05-05T17:28:00Z  
**Extensions active**: Security Baseline (15 rules, OWASP-aligned), AI/ML Lifecycle

---

## SAST Analysis

All new UoW-08 source files reviewed against OWASP Top 10 and extension security rules.

| Rule ID | Rule | Finding | Verdict |
|---------|------|---------|---------|
| SEC-01 | Injection (SQL/NoSQL) | Prisma ORM parameterises all queries; no raw SQL | ✅ Pass |
| SEC-02 | Broken Authentication | Role guard enforces merchant-only on WRITE tools; validated in agent tests | ✅ Pass |
| SEC-03 | Sensitive Data Exposure | `CustomerService.anonymize` audit log records only placeholders — never real PII (BR-CUST-04) | ✅ Pass |
| SEC-04 | Prompt Injection | System prompts include injection-defence instructions; user input never concatenated into prompt | ✅ Pass |
| SEC-05 | Insecure Deserialisation | `JSON.parse(result.content)` in agentic loop is try/caught; LlmToolCall type cast does not execute code | ✅ Pass |
| SEC-06 | Access Control | ORDER_WRITE_TOOLS and CUSTOMER_WRITE_TOOLS Sets guard mutation ops at agent dispatch layer | ✅ Pass |
| SEC-07 | Mass Assignment | Prisma update calls use explicit `data: { ... }` with typed fields; no `req.body` spread | ✅ Pass |
| SEC-08 | PII Handling (AI/ML) | `anonymize` replaces email/name/phone before audit; audit.insert never receives original values | ✅ Pass |
| SEC-09 | Outbox Integrity | `outboxEvent.create` executed inside `$transaction` atomically with status update | ✅ Pass |
| SEC-10 | Tool Auth Propagation | `actorId` + `actorRole` flow from `AgentInput.user` through every service call; no ambient identity | ✅ Pass |

---

## Dependency Scan

No new production packages added in UoW-08 (brownfield — 0 new packages).  
No dependency scan findings.

---

## Verdict

**✅ PASS** — 0 Critical, 0 High, 0 Medium SAST findings. No new dependency vulnerabilities.

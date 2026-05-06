# NFR Requirements Checklist — UoW-07

**Date**: 2026-05-05

- [x] Every NFR has an ID, requirement, target, and measurement method
- [x] Every NFR is traceable to a Functional Design rule, BR, or global NFR
- [x] Performance: 5 NFRs with numeric targets (ms / iteration count)
- [x] Scalability: 3 NFRs
- [x] Availability: 2 NFRs
- [x] Security: 6 NFRs (write restriction, audit log, destructive confirmation, log sanitization, SKU, prompt injection)
- [x] Reliability: 4 NFRs (partial success, SKU retry, LLM parse failure, transactionality)
- [x] Observability: 5 NFRs (structured logs, OTel spans, iteration count, bulk summary, cost telemetry)
- [x] Maintainability: 4 NFRs (coverage ≥ 75%, prompt versioning, typed tools, schema committed)
- [x] Usability: 3 NFRs
- [x] AI/ML Quality section present (AI/ML extension enabled): 7 NFRs
- [x] PBT section present (PBT extension partial): 4 NFRs (round-trip, price parser, bulk-line parser)
- [x] Accessibility (Level A): 4 NFRs
- [x] Tech stack constraints derived from NFRs (no new packages anticipated)
- [x] Total: 26 NFRs across 9 categories

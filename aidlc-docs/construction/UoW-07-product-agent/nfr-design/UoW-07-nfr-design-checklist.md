# NFR Design Checklist — UoW-07

**Date**: 2026-05-05

- [x] Every NFR has at least one mapped pattern or explicit N/A
  - Performance: P-PERF-01 (streaming), P-PERF-02 (search)
  - Scalability: P-SCAL-01 (stateless), P-SCAL-02 (sequential bulk)
  - Availability: covered by P-RES-02 (LLM parse guard), P-RES-03 (loop limit)
  - Security: P-SEC-01 (role gate), P-SEC-02 (audit log), P-SEC-03 (destructive intent), P-SEC-04 (prompt injection)
  - Reliability: P-RES-01 (SKU retry), P-RES-02 (LLM parse guard), P-RES-03 (loop limit), P-RES-04 (transaction)
  - Observability: P-OBS-01 (OTel spans), P-OBS-02 (structured logs)
  - AI/ML: P-AIML-01 (versioned prompt), P-AIML-02 (typed tools), P-AIML-03 (eval suite)

- [x] Every pattern names a specific approach (not generic "we'll handle errors")
- [x] Every logical component has purpose, type, and location
- [x] No framework choices made (all deferred to Stage 11)
- [x] AI/ML extension: vector store N/A for UoW-07 (semantic search deferred to UoW-11); prompt registry + eval suite listed
- [x] 9 logical components documented
- [x] 14 patterns documented

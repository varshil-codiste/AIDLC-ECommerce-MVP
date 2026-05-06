# NFR Requirements Checklist — UoW-04-telemetry

- [x] Performance NFRs captured (4) — OTel overhead, cost meter overhead, async export, budget query
- [x] Scalability NFRs captured (2) — row growth with TTL; OTel queue bounded
- [x] Availability NFRs captured (2) — telemetry never blocks; alarm latency acceptable
- [x] Security NFRs captured (4) — no PII in spans; no prompt text persisted; DB access control; OTLP auth
- [x] Reliability NFRs captured (3) — meter swallows errors; cron safe; inserts durable
- [x] Observability NFRs captured (5) — trace/span IDs in logs; Tempo ingestion; 4 Prometheus metrics
- [x] Maintainability NFRs captured (3) — coverage ≥ 80%; single pricing source; easy price update
- [x] AI/ML Quality NFRs captured (3) — cost accuracy PBT; no prompt text; unknown model handling
- [x] All NFRs traceable to BRs or execution-plan risk mitigations

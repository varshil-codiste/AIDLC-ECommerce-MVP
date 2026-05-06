# Functional Design Checklist — UoW-04-telemetry

- [x] Domain entities documented — `domain-entities.md` (LlmCostRecord + OTel context + pricing table)
- [x] Business rules documented — `business-rules.md` (7 rules: BR-TEL-001 through BR-TEL-007)
- [x] State transitions / workflows documented — `business-logic-model.md` (4 workflows + budget state machine)
- [x] Integration points identified — OTel SDK → Grafana Alloy (OTLP/gRPC); external LLM APIs (Anthropic / OpenAI)
- [x] Error handling defined — BR-TEL-007 (exporter failure: drop + warn; never block request path)
- [x] No FE components (BE+OBS only — N/A)
- [x] No Mobile screens (N/A)
- [x] Security misuse cases considered — LLM cost manipulation not possible (meter is server-side only)
- [x] Accessibility — N/A (no UI)

# Functional Design Checklist — UoW-06

- [x] Every entity has fields, constraints, and relationships (`domain-entities.md`)
- [x] `ConversationMessage` and `Conversation` have full field specs + lifecycle
- [x] `PendingConfirmation` (Redis) has key schema, TTL, and lifecycle
- [x] `PromptTemplate` (file-backed) documented per AI/ML extension
- [x] Runtime types (`AgentInput`, `AgentOutput`, `SseEvent`) defined
- [x] Every BR has BR-ID, statement, enforcement points, error code, user-facing copy
- [x] BR-ORCH-001 through BR-ORCH-009 documented
- [x] Workflow 1 (text message stream) has Mermaid sequence + text alternative
- [x] Workflow 2 (widget intent routing) has Mermaid sequence + text alternative
- [x] Workflow 3 (confirmation confirm/cancel) has Mermaid sequence + text alternative
- [x] Workflow 4 (multi-agent handoff) has Mermaid sequence + text alternative
- [x] SSE turn lifecycle state machine documented with text alternative
- [x] Confirmation protocol state machine documented with text alternative
- [x] AI/ML extension: PromptTemplate versioning addressed
- [x] AI/ML extension: prompt injection defense (BR-ORCH-006)
- [x] No FE components (UoW-06 is BE-only) — N/A
- [x] No Mobile screens — N/A

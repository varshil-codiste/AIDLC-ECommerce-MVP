# Functional Design Checklist — UoW-05-chat-shell

**Generated at**: 2026-05-05T15:00:00Z

---

- [x] Domain entities defined (ChatMessage, WidgetPayload, SseEvent, ChatSessionState)
- [x] FE component tree documented (full hierarchy with file paths)
- [x] Business rules documented (9 rules: auth gate, auto-scroll, composer lock, widget validation, SSE reconnect, intent emission, a11y, role-based welcome, session persistence)
- [x] Business logic workflows documented (4 workflows + 2 state machines)
- [x] Widget type registry documented with per-UoW implementation plan
- [x] SSE wire format defined (token/widget/done/error events)
- [x] No new BE endpoints in this UoW (orchestrator SSE defined in UoW-06)
- [x] No new DB tables in this UoW
- [x] Accessibility constraints captured (BR-UI-007)
- [x] Session storage persistence captured (BR-UI-009)
- [x] Story traceability: SH-01 (chat surface), MR-01 (chat surface)

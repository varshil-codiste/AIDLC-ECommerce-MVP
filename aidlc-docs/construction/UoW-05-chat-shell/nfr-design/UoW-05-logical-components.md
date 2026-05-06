# Logical Components — UoW-05-chat-shell

**Generated at**: 2026-05-05T15:00:00Z

---

## Component Map

| Component | File | Responsibility | Key patterns |
|-----------|------|----------------|--------------|
| Chat Page | `web/app/chat/page.tsx` | Route entry; owns `ChatSessionState` via `useReducer`; mounts SSE client on first render | Pattern 1 (useReducer) |
| MessageList | `web/components/chat/MessageList.tsx` | Renders message array; auto-scroll sentinel; aria-live wrapper | Pattern 4 (IntersectionObserver) |
| MessageBubble | `web/components/chat/MessageBubble.tsx` | Dispatches to `StreamingTokens` (text) or `WidgetRenderer` (widget) based on message type | — |
| StreamingTokens | `web/components/chat/StreamingTokens.tsx` | Renders accumulated token stream; debounced aria updates | Pattern 5 (aria debounce) |
| TypingIndicator | `web/components/chat/TypingIndicator.tsx` | Animated "..." shown while `streaming=true` | — |
| Composer | `web/components/chat/Composer.tsx` | Textarea + send; disabled when `composerDisabled=true`; fires `ADD_USER_MESSAGE` on submit | Pattern 1 (dispatch) |
| WidgetRenderer | `web/components/widgets/WidgetRenderer.tsx` | Registry dispatch + schema validation; `UnknownWidget` fallback | Pattern 3 (registry) |
| UnknownWidget | `web/components/widgets/UnknownWidget.tsx` | Fallback for unknown/invalid widget types; user-friendly message | BR-UI-004 |
| [12 widget stubs] | `web/components/widgets/*.tsx` | Placeholder stubs for all 12 widget types; renders widget type name + raw JSON | Future UoWs fill these in |
| SseClient | `web/lib/sse-client.ts` | EventSource wrapper; reconnect backoff; Last-Event-ID; event routing | Pattern 2 (class + reconnect) |
| IntentEmitter | `web/lib/intent-emitter.ts` | POST /orchestrator/intent; auth header; 401 refresh + retry | BR-UI-006 |
| ApiClient | `web/lib/api-client.ts` | Typed fetch wrapper; auth injection; traceparent header; 401 refresh | Pattern 7 (traceparent) |
| SessionLib | `web/lib/auth/session.ts` | Token read/write; auto-refresh via rotation; role extraction from JWT | NFR-UI-SEC-001 |
| TelemetryLib | `web/lib/telemetry.ts` | Sentry init; traceparent extraction; error reporting | Pattern 7 |
| CSP Config | `web/next.config.js` | Content Security Policy headers | Pattern 6 |
| Widget Schemas | `web/widget-schemas/*.schema.json` | AJV-compatible JSON schemas for all 12 widget types | Pattern 3 |

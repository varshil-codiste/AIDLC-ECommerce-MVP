# NFR Requirements — UoW-05-chat-shell

**UoW**: UoW-05 — Chat UI shell + SSE client + widget renderer framework  
**Tier**: Greenfield (Comprehensive)  
**Stack**: Frontend (Next.js/React)  
**Generated at**: 2026-05-05T15:00:00Z

---

## Performance

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-PERF-001 | First Contentful Paint (chat page) | < 1.5 s on 4G (Lighthouse CI) | FR-CHAT-03 |
| NFR-UI-PERF-002 | First token visible in chat bubble after message submit | < 1.5 s p95 | FR-CHAT-03, NFR-PERF-01 |
| NFR-UI-PERF-003 | Widget render time (first pixel after `widget` SSE event) | < 100 ms (client-side only) | NFR-PERF-02 |
| NFR-UI-PERF-004 | Bundle size (gzipped) — initial JS | < 200 KB | Lean budget constraint; Next.js App Router code-split |
| NFR-UI-PERF-005 | React render time — per token update | < 16 ms (no jank at 60 fps) | Streaming UX quality |

---

## Scalability

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-SCAL-001 | Concurrent SSE connections per browser tab | 1 (one active chat) | Browser EventSource limit |
| NFR-UI-SCAL-002 | Chat message list performance | No jank up to 500 messages in session | `sessionStorage` cap |

---

## Availability

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-AVAIL-001 | SSE reconnect on drop | ≤ 3 retries with exponential backoff before error state | BR-UI-005 |
| NFR-UI-AVAIL-002 | Graceful degradation if SSE endpoint unreachable | Error message in chat; Composer re-enabled | BR-UI-005 |

---

## Security

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-SEC-001 | JWT token never stored in `localStorage` | Use `httpOnly` cookie (set by BE) or short-lived `sessionStorage` | SECURITY-04 |
| NFR-UI-SEC-002 | All API calls include `Authorization: Bearer <token>` header | Auto-injected by `api-client.ts` | SECURITY-01 |
| NFR-UI-SEC-003 | Widget payloads treated as untrusted data | Validated via `ajv` before render; no `dangerouslySetInnerHTML` | SECURITY-05 |
| NFR-UI-SEC-004 | SSE connection authenticated | `accessToken` sent as `Authorization` header on SSE GET | SECURITY-02 |
| NFR-UI-SEC-005 | Content Security Policy | Configured in `next.config.js`; no inline scripts; `script-src 'self'` | SECURITY-01 |

---

## Reliability

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-REL-001 | No message loss on SSE reconnect | Last-Event-ID header sent on reconnect | BR-UI-005 |
| NFR-UI-REL-002 | Chat history survives page refresh | Persisted to `sessionStorage` | BR-UI-009 |
| NFR-UI-REL-003 | Widget schema validation prevents partial renders | Invalid widget → `UnknownWidget` fallback | BR-UI-004 |

---

## Observability

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-OBS-001 | FE errors reported to Sentry | All unhandled exceptions + caught widget errors | Application Design |
| NFR-UI-OBS-002 | `traceparent` header forwarded on API calls | Links FE fetch to BE OTel trace | BR-TEL-001 (UoW-04) |
| NFR-UI-OBS-003 | SSE connect/disconnect events logged | `console.warn` in dev; Sentry breadcrumb in prod | Debugging support |

---

## Maintainability

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-MAINT-001 | Unit + component test coverage (UoW-05 FE files) | ≥ 80% line coverage | Standard greenfield threshold |
| NFR-UI-MAINT-002 | ESLint + Prettier clean | 0 errors, 0 format violations | NFR-MAINT-01 |
| NFR-UI-MAINT-003 | TypeScript strict mode | No `any` escapes; strict null checks | Maintainability |
| NFR-UI-MAINT-004 | Widget renderer extensible | Adding a new widget type requires only: add schema + add component + register in dispatcher | Architecture constraint |

---

## Usability / Accessibility

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-UI-A11Y-001 | Keyboard navigation — all interactive elements reachable via Tab | WCAG 2.2 Level A (SC 2.1.1) | Accessibility extension |
| NFR-UI-A11Y-002 | `aria-live="polite"` on `MessageList` | Screen reader announces new messages without interrupting | NFR-A11Y-03, BR-UI-007 |
| NFR-UI-A11Y-003 | Streaming token updates debounced for screen readers | Announce at most every 500 ms during stream | BR-UI-007 |
| NFR-UI-A11Y-004 | Focus management after Composer submit | Focus returns to Composer on stream completion | WCAG 2.2 SC 3.2.2 |
| NFR-UI-A11Y-005 | Color contrast ≥ 4.5:1 (normal text) | WCAG 2.2 Level AA SC 1.4.3 | Accessibility extension (Level A + AA) |
| NFR-UI-A11Y-006 | Role announcements for loading states | `aria-busy="true"` on MessageList while streaming | WCAG 2.2 SC 4.1.3 |

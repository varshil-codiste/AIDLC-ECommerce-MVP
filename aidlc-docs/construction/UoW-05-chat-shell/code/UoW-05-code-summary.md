# Code Summary — UoW-05 (Chat UI Shell + SSE Client + Widget Renderer)

**Completed**: 2026-05-05T15:20:00Z  
**Test results**: 38 tests, 38 passed, 0 failed  
**Test files**: 7 (including 5 new for UoW-05)

---

## Files Created

### Shared Types (1 file)
| File | Description |
|------|-------------|
| `web/lib/types/chat.types.ts` | `ChatMessage`, `ChatSessionState`, `SseEvent`, `WidgetPayload`, `WidgetType`, `SseStatus`, `SseHandlers`, all reducer `ChatAction` union types |

### Core Libraries (4 files)
| File | Description |
|------|-------------|
| `web/lib/sse-client.ts` | `SseClient` class — EventSource wrapper with exponential backoff reconnect (1s→2s→4s→failed), named event routing |
| `web/lib/chat-reducer.ts` | `chatReducer` pure function; `saveSession`/`loadSession` sessionStorage helpers |
| `web/lib/intent-emitter.ts` | `emitIntent` — POST to orchestrator with auth header, 401 refresh+retry |
| `web/lib/api-client.ts` | `fetchApi<T>` — typed fetch helper; injects Authorization + traceparent headers |
| `web/lib/telemetry.ts` | `getTraceparent()` from Sentry active span; `reportError()` wraps Sentry |

### Widget Schemas (13 files)
| File | Description |
|------|-------------|
| `web/widget-schemas/index.ts` | AJV instance with `ajv-formats`; pre-compiled validators; `validateWidgetPayload(type, data): boolean` |
| `web/widget-schemas/product_card.schema.json` | Required: productId, title, priceUsd |
| `web/widget-schemas/product_carousel.schema.json` | Required: items array |
| `web/widget-schemas/product_edit_preview.schema.json` | Required: productId, fields |
| `web/widget-schemas/cart_summary.schema.json` | Required: items array, totalUsd |
| `web/widget-schemas/order_card.schema.json` | Required: orderId, status, items |
| `web/widget-schemas/order_list.schema.json` | Required: orders array |
| `web/widget-schemas/tracking_widget.schema.json` | Required: orderId, carrier, trackingNumber, status |
| `web/widget-schemas/payment_widget.schema.json` | Required: orderId, amountUsd, currency |
| `web/widget-schemas/customer_card.schema.json` | Required: customerId, name, email |
| `web/widget-schemas/dashboard_digest.schema.json` | Required: metrics object |
| `web/widget-schemas/confirmation_prompt.schema.json` | Required: message, confirmAction, cancelAction |
| `web/widget-schemas/notification_inbox.schema.json` | Required: notifications array |

### Widget Components (14 files)
| File | Description |
|------|-------------|
| `web/components/widgets/WidgetRenderer.tsx` | Registry-first dispatch: checks `WIDGET_REGISTRY[type]` before AJV validation; `UnknownWidget` fallback for unknown or invalid payloads |
| `web/components/widgets/UnknownWidget.tsx` | `reason="schema.invalid"` → "couldn't display this response"; no reason → "Unknown widget type: {type}" |
| `web/components/widgets/ProductCard.tsx` | Stub — renders type label + raw JSON |
| `web/components/widgets/ProductCarousel.tsx` | Stub |
| `web/components/widgets/ProductEditPreview.tsx` | Stub |
| `web/components/widgets/CartSummary.tsx` | Stub |
| `web/components/widgets/OrderCard.tsx` | Stub |
| `web/components/widgets/OrderList.tsx` | Stub |
| `web/components/widgets/TrackingWidget.tsx` | Stub |
| `web/components/widgets/PaymentWidget.tsx` | Stub |
| `web/components/widgets/CustomerCard.tsx` | Stub |
| `web/components/widgets/DashboardDigest.tsx` | Stub |
| `web/components/widgets/ConfirmationPrompt.tsx` | Stub |
| `web/components/widgets/NotificationInbox.tsx` | Stub |

### Chat UI Components (5 files)
| File | Description |
|------|-------------|
| `web/components/chat/StreamingTokens.tsx` | Token text renderer; debounced 500ms `aria-live` sr-only span for screen readers; blinking cursor during stream |
| `web/components/chat/TypingIndicator.tsx` | Three bouncing dots; `role="status"`, `aria-label="typing"` |
| `web/components/chat/MessageBubble.tsx` | Role-styled bubble (user/assistant); dispatches to `StreamingTokens` or `WidgetRenderer` |
| `web/components/chat/MessageList.tsx` | `aria-live="polite"`, `aria-busy={streaming}`, `data-testid="message-list"`; IntersectionObserver auto-scroll sentinel |
| `web/components/chat/Composer.tsx` | Enter submits, Shift+Enter inserts newline; `disabled` when `composerDisabled`; `data-testid="composer-textarea"` + `data-testid="composer-send"` |

### Page (1 file)
| File | Description |
|------|-------------|
| `web/app/chat/page.tsx` | `useReducer(chatReducer)`; `useRef<SseClient>`; session restore on mount; role-based welcome + merchant digest; renders `MessageList` + `Composer` |

### Tests (5 files)
| File | Tests | Status |
|------|-------|--------|
| `web/tests/chat-reducer.spec.ts` | 11 | ✅ Pass |
| `web/tests/sse-client.spec.ts` | 7 | ✅ Pass |
| `web/tests/widget-renderer.spec.tsx` | 4 | ✅ Pass |
| `web/tests/message-list.spec.tsx` | 5 | ✅ Pass |
| `web/tests/composer.spec.tsx` | 6 | ✅ Pass |

### Config / Infrastructure (2 files modified)
| File | Change |
|------|--------|
| `web/vitest.config.ts` | Added `@` path alias + `setupFiles: ['./tests/setup.ts']` |
| `web/tests/setup.ts` | `@testing-library/jest-dom` import + `scrollIntoView` stub |

---

## Files Modified (from prior UoWs)

None — UoW-05 is entirely new code. All dependencies (`lib/auth-service.ts`, middleware, etc.) consumed read-only.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Native `EventSource` (not WebSocket) | Server sends only; no FE→BE stream needed; simpler reconnect model |
| `useReducer` over Zustand/Redux | State is local to chat page; no cross-page sharing required |
| AJV with pre-compiled validators | Schema validation at mount time; errors caught before unmount panic |
| Registry-first in `WidgetRenderer` | Unknown types must show "unknown type" message, not "schema invalid" message |
| `BACKOFF_MS = [1000, 2000, 4000]` | Three retries with doubling delay; matches NFR-SSE-REL-001 |
| `StreamingTokens` sr-only span | Screen readers need a non-blinking aria-live region; visible span has cursor animation |
| `sessionStorage` for message history | Tab-scoped persistence; cleared on tab close; no cross-tab leakage |

---

## Bugs Found and Fixed During Code Generation

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `@/widget-schemas` import unresolved in Vitest | Missing `resolve.alias` in `vitest.config.ts` | Added `@` alias to vitest config |
| `toBeDisabled` not a valid matcher | `@testing-library/jest-dom` not loaded | Created `tests/setup.ts` with import |
| `scrollIntoView is not a function` | jsdom doesn't implement it | Added stub in `setup.ts` |
| SSE reconnect test wrong mock sequence | `onerror` called on same instance in loop | Fixed to call `onerror` on each successive instance after advancing timers |
| `WidgetRenderer` showed "schema.invalid" for unknown types | Schema check ran before registry check | Reordered: registry check first, then schema |
| `getByText('Hello')` found multiple elements | `StreamingTokens` renders text in both visible and sr-only spans | Changed to `getAllByText(...).length > 0` |

---

## Test Results

```
Test Files  7 passed (7)
Tests       38 passed (38)
Start at    15:18:05
Duration    2.02s
```

No regressions in prior UoW tests (login, widget-renderer all green).

---

## Story Traceability

| Story | Implemented by |
|-------|---------------|
| SH-01 (chat surface) | `app/chat/page.tsx`, `components/chat/`, `lib/sse-client.ts`, `lib/chat-reducer.ts` |
| MR-01 (dashboard digest welcome) | `app/chat/page.tsx` merchant mount effect + `DashboardDigest` stub |

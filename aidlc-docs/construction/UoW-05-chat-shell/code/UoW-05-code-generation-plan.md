# Code Generation Plan — UoW-05 (Chat UI Shell + SSE Client + Widget Renderer)

**Tier**: Greenfield (Comprehensive)  
**Stacks in scope**: Frontend (Next.js/React)  
**Stories implemented**: SH-01 (chat surface parts), MR-01 (chat surface parts)  
**Generated at**: 2026-05-05T15:00:00Z

---

## Code Location

- **Workspace root**: `/home/user/Documents/Project/ECommmer-AIDLC`
- **Application code root**: `web/` (Next.js project)
- **NEVER write under `aidlc-docs/`**

---

## Dependency Status

| Upstream | Status |
|----------|--------|
| UoW-01 (Scaffolding) | COMPLETE — Next.js project, Tailwind, Vitest, ESLint, middleware auth gate |
| UoW-02 (Auth) | COMPLETE — `lib/auth-service.ts`, `components/auth/`, middleware for `/chat` route |
| UoW-03 (Persistence) | COMPLETE (BE only — no FE dependency) |
| UoW-04 (Telemetry) | COMPLETE (BE only — `lib/telemetry.ts` stub in FE wires to Sentry) |

---

## Steps

### Step 1: Install New Packages

- [x] Install `ajv`, `ajv-formats`, `clsx`, `tailwind-merge` into `web/`
- [x] Run `pnpm install` from workspace root

**Files modified**: `web/package.json`, `pnpm-lock.yaml`

---

### Step 2: Shared Types

- [x] `web/lib/types/chat.types.ts` — `ChatMessage`, `ChatSessionState`, `SseEvent`, `WidgetPayload`, `WidgetType`, `SseStatus`, `Action` (reducer actions)

**Files created**: 1

---

### Step 3: SSE Client

- [x] `web/lib/sse-client.ts` — `SseClient` class: `connect()`, `disconnect()`, `scheduleReconnect()` with exponential backoff (1s → 2s → 4s → failed); `Last-Event-ID` support; routes `token`/`widget`/`done`/`error` events to caller handlers

**Files created**: 1

---

### Step 4: Chat State Reducer

- [x] `web/lib/chat-reducer.ts` — `chatReducer(state, action): ChatSessionState`; handles all Action types; `sessionStorage` persistence helpers `saveSession()` / `loadSession()`

**Files created**: 1

---

### Step 5: Intent Emitter

- [x] `web/lib/intent-emitter.ts` — `emitIntent(intent, sessionId, payload)`: POST to `/api/v1/orchestrator/intent`; injects `Authorization` header; 401 refresh + retry; redirect to `/login` on second 401

**Files created**: 1

---

### Step 6: API Client

- [x] `web/lib/api-client.ts` — typed `fetchApi<T>(path, options)` helper: injects auth header; injects `traceparent` from `lib/telemetry.ts`; handles 401 token refresh via `lib/auth/session.ts`

**Files created**: 1

---

### Step 7: Telemetry Lib

- [x] `web/lib/telemetry.ts` — `initTelemetry()` (Sentry already init'd in `sentry.client.config.ts`); `getTraceparent()` extracts W3C traceparent from Sentry context; `reportError(err)` wraps `Sentry.captureException`

**Files created**: 1

---

### Step 8: Widget Schemas

- [x] `web/widget-schemas/index.ts` — exports `validateWidgetPayload(type, data): boolean` using AJV with all 12 schemas compiled
- [x] `web/widget-schemas/product_card.schema.json`
- [x] `web/widget-schemas/product_carousel.schema.json`
- [x] `web/widget-schemas/product_edit_preview.schema.json`
- [x] `web/widget-schemas/cart_summary.schema.json`
- [x] `web/widget-schemas/order_card.schema.json`
- [x] `web/widget-schemas/order_list.schema.json`
- [x] `web/widget-schemas/tracking_widget.schema.json`
- [x] `web/widget-schemas/payment_widget.schema.json`
- [x] `web/widget-schemas/customer_card.schema.json`
- [x] `web/widget-schemas/dashboard_digest.schema.json`
- [x] `web/widget-schemas/confirmation_prompt.schema.json`
- [x] `web/widget-schemas/notification_inbox.schema.json`

**Files created**: 13

---

### Step 9: Widget Components (Stubs + Renderer)

- [x] `web/components/widgets/WidgetRenderer.tsx` — registry dispatch: `WIDGET_REGISTRY` map; AJV validation before mount; `UnknownWidget` fallback
- [x] `web/components/widgets/UnknownWidget.tsx` — fallback for unknown/invalid widget types
- [x] `web/components/widgets/ProductCard.tsx` — stub (renders type + raw JSON)
- [x] `web/components/widgets/ProductCarousel.tsx` — stub
- [x] `web/components/widgets/ProductEditPreview.tsx` — stub
- [x] `web/components/widgets/CartSummary.tsx` — stub
- [x] `web/components/widgets/OrderCard.tsx` — stub
- [x] `web/components/widgets/OrderList.tsx` — stub
- [x] `web/components/widgets/TrackingWidget.tsx` — stub
- [x] `web/components/widgets/PaymentWidget.tsx` — stub
- [x] `web/components/widgets/CustomerCard.tsx` — stub
- [x] `web/components/widgets/DashboardDigest.tsx` — stub
- [x] `web/components/widgets/ConfirmationPrompt.tsx` — stub
- [x] `web/components/widgets/NotificationInbox.tsx` — stub

**Files created**: 14

---

### Step 10: Chat UI Components

- [x] `web/components/chat/StreamingTokens.tsx` — renders accumulated token text; debounced aria-live updates (500ms)
- [x] `web/components/chat/TypingIndicator.tsx` — animated "..." while `streaming=true`
- [x] `web/components/chat/MessageBubble.tsx` — dispatches to `StreamingTokens` or `WidgetRenderer` based on message type; role-styled (user vs assistant)
- [x] `web/components/chat/MessageList.tsx` — renders message array; IntersectionObserver auto-scroll sentinel; `aria-live="polite"` wrapper; `aria-busy` during streaming
- [x] `web/components/chat/Composer.tsx` — textarea + send button; disabled when `composerDisabled=true`; keyboard shortcut (Enter to send, Shift+Enter for newline); `aria-label`

**Files created**: 5

---

### Step 11: Chat Page

- [x] `web/app/chat/page.tsx` — route entry; `useReducer(chatReducer, initialState)`; `useRef(SseClient)`; `useEffect` on mount for role-based welcome + merchant digest request; `sessionStorage` restore; renders `MessageList` + `Composer`

**Files created**: 1

---

### Step 12: Unit + Component Tests

- [x] `web/tests/chat-reducer.spec.ts` — pure reducer tests for all 7 action types; sessionStorage persistence
- [x] `web/tests/sse-client.spec.ts` — `SseClient` reconnect logic; Last-Event-ID; event routing; backoff timing (using fake timers)
- [x] `web/tests/widget-renderer.spec.tsx` — valid widget renders correct stub; invalid schema renders UnknownWidget; unknown type renders UnknownWidget
- [x] `web/tests/message-list.spec.tsx` — renders messages; aria-live attribute; auto-scroll sentinel present
- [x] `web/tests/composer.spec.tsx` — disabled when `composerDisabled`; Enter submits; Shift+Enter does not submit

**Files created**: 5

---

### Step 13: Code Summary

- [x] `aidlc-docs/construction/UoW-05-chat-shell/code/UoW-05-code-summary.md` (written after Part 2)

---

## Story Traceability

| Story | Files implementing it |
|-------|-----------------------|
| SH-01 (chat surface) | `app/chat/page.tsx`, `components/chat/`, `lib/sse-client.ts` |
| MR-01 (dashboard digest welcome) | `app/chat/page.tsx` (merchant mount effect), `components/widgets/DashboardDigest.tsx` (stub) |

---

## Estimated File Count

| Category | Count |
|----------|-------|
| Source files (new) | 34 |
| Test files (new) | 5 |
| Schema files (new) | 12 + 1 index |
| **Total** | **52** |

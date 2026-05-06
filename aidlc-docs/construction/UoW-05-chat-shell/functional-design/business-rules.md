# Business Rules — UoW-05-chat-shell

---

## BR-UI-001: Chat Route Requires Authentication

**Applies to**: `app/chat/page.tsx`  
**Statement**: The `/chat` route is only accessible to authenticated users. Unauthenticated access redirects to `/login`. The role (`shopper` | `merchant`) is decoded from the JWT access token and stored in session state to gate role-specific welcome messages.  
**Enforcement**: Next.js middleware checks for a valid `accessToken` cookie before rendering the chat page; missing or expired token → redirect.  
**Error code**: N/A — redirect, not an error.

---

## BR-UI-002: Auto-Scroll to Latest Message Unless User Has Scrolled Up

**Applies to**: `MessageList.tsx`  
**Statement**: The message list auto-scrolls to the bottom when a new message is appended or when a streaming message grows. If the user has manually scrolled upward (scroll position > 50px from bottom), auto-scroll is suppressed until the user scrolls back to the bottom.  
**Enforcement**: `useAutoScroll` hook tracks `scrollTop` and `scrollHeight`; intersection observer on a sentinel element at the bottom of the list.  
**Error code**: N/A — UI behavior.

---

## BR-UI-003: Composer Is Disabled While Streaming

**Applies to**: `Composer.tsx`  
**Statement**: When `streaming=true` in `ChatSessionState`, the textarea and send button are disabled. The user may not submit a new message while the previous response is still streaming.  
**Enforcement**: `composerDisabled` derived from `streaming` state; textarea `disabled` + send button `aria-disabled="true"`.  
**Error code**: N/A

---

## BR-UI-004: Widget Payloads Validated Before Render

**Applies to**: `WidgetRenderer.tsx`  
**Statement**: When a `widget` SSE event arrives, the payload `data` is validated against the JSON schema file at `web/widget-schemas/{type}.schema.json` before the widget component is mounted. If validation fails, `UnknownWidget` is rendered with a user-facing message: "We couldn't display this response. Please try again."  
**Enforcement**: `ajv` validation in `WidgetRenderer`; validation errors surface an `error` type message instead of mounting the widget.  
**Error code**: `widget.schema.invalid`

---

## BR-UI-005: SSE Reconnect with Exponential Backoff

**Applies to**: `lib/sse-client.ts`  
**Statement**: If the SSE connection drops mid-stream (network error, server restart), the client:
1. Waits 1 s, then reconnects
2. If second attempt fails, waits 2 s
3. If third attempt fails, waits 4 s
4. After 3 failed reconnects, transitions to `sseStatus = 'failed'` and appends an error message

On reconnect, the client sends the last received `messageId` via `Last-Event-ID` header so the server can replay from the correct position.  
**Enforcement**: `SseClient` class; `reconnectAttempts` counter; `setTimeout` with backoff multiplier.  
**Error code**: `sse.connection.failed`

---

## BR-UI-006: Widget Intent Emission

**Applies to**: `lib/intent-emitter.ts`  
**Statement**: Widget interactions that trigger actions (e.g., "Add to cart" on a `product_card`) emit a structured intent to `POST /api/v1/orchestrator/intent`. The intent payload shape is `{ intent: string, sessionId: string, payload: Record<string, unknown> }`. The emitter includes the current JWT access token in the `Authorization` header. On 401, it refreshes the token once and retries; on second 401, it redirects to `/login`.  
**Enforcement**: `intentEmitter.emit()` helper; wraps `fetch` with auth header injection + refresh logic.  
**Error code**: `intent.emit.failed`

---

## BR-UI-007: Accessibility — ARIA Live Regions

**Applies to**: `MessageList.tsx`, `ConfirmationPrompt.tsx`  
**Statement**: 
- `MessageList` uses `aria-live="polite"` so screen readers announce new messages without interrupting current speech.
- `ConfirmationPrompt` widget uses `aria-live="assertive"` so critical confirmation requests are announced immediately.
- `StreamingTokens` updates are batched to avoid screen reader flooding (announce every 500ms or on `done`, whichever comes first).  
**Enforcement**: `aria-live` attributes on wrapper `<div>`; `StreamingTokens` debounces aria updates via `useRef` timer.  
**Error code**: N/A

---

## BR-UI-008: Role-Based Welcome Message

**Applies to**: `app/chat/page.tsx`  
**Statement**: On first render after login, if the message list is empty, a synthetic welcome message is prepended:
- **Shopper**: "Hi! I'm your shopping assistant. What are you looking for today?"
- **Merchant**: KPI digest request is sent to the orchestrator immediately (the `dashboard_digest` widget renders in response, per SH-01/MR-01 ACs).

The welcome message is a local text message (not from SSE); the dashboard digest request fires an SSE connection on mount.  
**Enforcement**: `useEffect` on mount; `role` from session state.  
**Error code**: N/A

---

## BR-UI-009: Message History Preserved Across Page Refresh

**Applies to**: `lib/sse-client.ts`, `ChatSessionState`  
**Statement**: Chat messages are persisted to `sessionStorage` keyed by session ID. On page reload, messages are restored from `sessionStorage` before mounting, so the user sees their conversation history. Only the current session's messages are stored (not cross-session history).  
**Enforcement**: `useEffect` writes `messages` to `sessionStorage` on every change; initial state reads from `sessionStorage` on mount.  
**Error code**: N/A

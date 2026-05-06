# Domain Entities — UoW-05-chat-shell

> **Stack scope**: Frontend only (`web/`). No new BE endpoints, no DB changes.  
> BE orchestrator SSE endpoint is defined in UoW-06; UoW-05 builds against a mock/stub.

---

## Entity: ChatMessage (client-side)

**Purpose**: Represents one message in the chat thread — either a user utterance, an assistant text response, or a widget injected by the orchestrator.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | unique per session | client-generated UUID |
| role | `'user' \| 'assistant'` | required | |
| type | `'text' \| 'widget' \| 'error'` | required | |
| content | string | required if type=text | accumulated SSE token stream |
| widget | `WidgetPayload \| null` | required if type=widget | validated against widget schema |
| streaming | boolean | | true while SSE tokens still arriving |
| timestamp | Date | | client time of creation |

**Lifecycle**:
- User message: created on Composer submit; immediately appended; no streaming state
- Assistant text: created as empty streaming=true on first `token` SSE event; content accumulated as tokens arrive; streaming=false on `done` event
- Widget message: created on `widget` SSE event; content=null; widget=payload; streaming=false

---

## Entity: WidgetPayload (client-side)

**Purpose**: Typed union of all 12 widget payloads the orchestrator can emit. The widget renderer dispatches on `type` to the correct component.

| Field | Type | Constraints |
|-------|------|-------------|
| type | `WidgetType` | required — one of 12 known types |
| data | `Record<string, unknown>` | validated against per-type JSON schema in `web/widget-schemas/` |

**Known widget types** (UoW-05 renders the dispatcher + skeleton; concrete widgets built per-UoW):

| Type | Component | UoW |
|------|-----------|-----|
| `product_card` | `ProductCard.tsx` | UoW-07 |
| `product_carousel` | `ProductCarousel.tsx` | UoW-11 |
| `product_edit_preview` | `ProductEditPreview.tsx` | UoW-07 |
| `cart_summary` | `CartSummary.tsx` | UoW-10 |
| `order_card` | `OrderCard.tsx` | UoW-08 |
| `order_list` | `OrderList.tsx` | UoW-08 |
| `tracking_widget` | `TrackingWidget.tsx` | UoW-11 |
| `payment_widget` | `PaymentWidget.tsx` | UoW-10 |
| `customer_card` | `CustomerCard.tsx` | UoW-08 |
| `dashboard_digest` | `DashboardDigest.tsx` | UoW-06 |
| `confirmation_prompt` | `ConfirmationPrompt.tsx` | UoW-12 |
| `notification_inbox` | `NotificationInbox.tsx` | UoW-09 |

**UoW-05 responsibility**: register the dispatcher; provide a `UnknownWidget` fallback for unknown types; confirm the schema validation hook is wired up.

---

## Entity: SseEvent (wire format)

**Purpose**: Named SSE events emitted by the BE orchestrator over `GET /api/v1/orchestrator/stream`.

| Event name | Data shape | Triggers |
|------------|------------|---------|
| `token` | `{ delta: string }` | Append delta to streaming assistant message |
| `widget` | `{ type: WidgetType, data: unknown }` | Append widget message; validate schema |
| `done` | `{ messageId: string }` | Mark streaming=false; record message ID for idempotency |
| `error` | `{ code: string, message: string }` | Append error message; surface to user |

---

## Entity: ChatSessionState (React state)

**Purpose**: Top-level client state for the `/chat` page. Managed via `useReducer`.

| Field | Type | Notes |
|-------|------|-------|
| messages | `ChatMessage[]` | append-only in practice |
| streaming | boolean | true while SSE connection is open and receiving |
| composerDisabled | boolean | true while streaming |
| role | `'shopper' \| 'merchant'` | derived from JWT; determines welcome message |
| error | `string \| null` | last fatal error |
| sseStatus | `'idle' \| 'connecting' \| 'connected' \| 'reconnecting' \| 'failed'` | SSE connection lifecycle |

---

## Component Tree

```
app/chat/page.tsx                         ← Route; owns ChatSessionState via useReducer
  ├── components/chat/MessageList.tsx      ← aria-live="polite"; auto-scroll hook
  │   ├── components/chat/MessageBubble.tsx ← text content or widget dispatcher
  │   │   ├── components/chat/StreamingTokens.tsx  ← renders streaming delta text
  │   │   └── components/widgets/WidgetRenderer.tsx ← dispatches widget type → component
  │   │       ├── [all 12 widget components — stubs in UoW-05]
  │   │       └── components/widgets/UnknownWidget.tsx ← fallback for unrecognised types
  │   └── components/chat/TypingIndicator.tsx ← shows "..." when streaming=true
  └── components/chat/Composer.tsx         ← textarea + send button; disabled while streaming
      └── components/chat/SendButton.tsx
│
lib/sse-client.ts                          ← EventSource wrapper; reconnect; event routing
lib/intent-emitter.ts                      ← POST /api/v1/orchestrator/intent
lib/api-client.ts                          ← Generated typed client (auth endpoints for now)
lib/auth/session.ts                        ← Token storage + auto-refresh (from UoW-02 BE)
lib/telemetry.ts                           ← FE error reporting + traceparent propagation
```

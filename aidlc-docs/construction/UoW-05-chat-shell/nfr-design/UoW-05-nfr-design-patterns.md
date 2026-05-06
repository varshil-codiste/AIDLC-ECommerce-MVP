# NFR Design Patterns — UoW-05-chat-shell

**Generated at**: 2026-05-05T15:00:00Z

---

## Pattern 1: useReducer for Chat Session State

**Addresses**: NFR-UI-PERF-005, NFR-UI-MAINT-003  
**Pattern**: `ChatSessionState` is managed via React `useReducer` rather than `useState` with multiple fields or a third-party state manager. This:
- Prevents unnecessary re-renders (dispatch is stable, state updates are batched)
- Makes state transitions explicit and testable (pure reducer function)
- Avoids `useState` closure staleness issues during SSE callbacks

```typescript
type Action =
  | { type: 'ADD_USER_MESSAGE'; payload: string }
  | { type: 'START_STREAMING'; messageId: string }
  | { type: 'APPEND_TOKEN'; delta: string }
  | { type: 'ADD_WIDGET'; widget: WidgetPayload }
  | { type: 'STREAMING_DONE' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_SSE_STATUS'; status: SseStatus };

function chatReducer(state: ChatSessionState, action: Action): ChatSessionState { ... }
```

---

## Pattern 2: SSE Client as a Class with Reconnect Logic

**Addresses**: NFR-UI-AVAIL-001, NFR-UI-REL-001  
**Pattern**: `SseClient` is a plain TypeScript class (not a React hook) that wraps `EventSource`. It is instantiated once per chat session and held in a `useRef`. Reconnect logic is internal to the class, not spread across React effects.

```typescript
class SseClient {
  private es: EventSource | null = null;
  private attempts = 0;
  private maxAttempts = 3;

  connect(url: string, handlers: SseHandlers, lastEventId?: string): void { ... }
  disconnect(): void { ... }
  private scheduleReconnect(url: string, handlers: SseHandlers): void { ... }
}
```

Held in component: `const sseRef = useRef(new SseClient())`.

---

## Pattern 3: Widget Renderer as a Registry Dispatch Map

**Addresses**: NFR-UI-MAINT-004, NFR-UI-PERF-003  
**Pattern**: Widget type → component mapping is a simple `Record<WidgetType, React.ComponentType<WidgetProps>>` object. Adding a new widget requires:
1. Add JSON schema to `web/widget-schemas/`
2. Create component in `web/components/widgets/`
3. Add one entry to the registry map

```typescript
const WIDGET_REGISTRY: Record<string, React.ComponentType<{ data: unknown }>> = {
  product_card: ProductCard,
  product_carousel: ProductCarousel,
  // ...
};

export function WidgetRenderer({ type, data }: WidgetPayload) {
  const Component = WIDGET_REGISTRY[type] ?? UnknownWidget;
  return <Component data={data} />;
}
```

Schema validation happens before the registry lookup:

```typescript
const valid = validateWidgetPayload(type, data); // ajv
if (!valid) return <UnknownWidget reason="schema.invalid" />;
```

---

## Pattern 4: Auto-Scroll with Intersection Observer

**Addresses**: NFR-UI-PERF-005, BR-UI-002  
**Pattern**: A sentinel `<div ref={bottomRef} />` at the bottom of `MessageList`. An `IntersectionObserver` watches whether it's visible. When visible, `autoScrollEnabled=true`; when the user scrolls up and the sentinel leaves the viewport, `autoScrollEnabled=false`. `scrollIntoView({ behavior: 'smooth' })` fires only when `autoScrollEnabled=true`.

This avoids `scrollTop` polling (which forces layout reflow on every RAF) and is O(1) per scroll event.

---

## Pattern 5: Streaming Token Debouncing for Accessibility

**Addresses**: NFR-UI-A11Y-003, BR-UI-007  
**Pattern**: During SSE streaming, the `aria-live` region is updated at most every 500 ms rather than on every token. A `useRef` timer accumulates deltas and flushes them to the aria region on a throttled schedule. On `done`, the full content is flushed immediately.

```typescript
const ariaFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function scheduleAriaFlush(text: string) {
  if (ariaFlushRef.current) clearTimeout(ariaFlushRef.current);
  ariaFlushRef.current = setTimeout(() => {
    setAriaText(text);
  }, 500);
}
```

---

## Pattern 6: CSP via Next.js Headers Config

**Addresses**: NFR-UI-SEC-005  
**Pattern**: Content Security Policy defined in `next.config.js` `headers()` function. Applied to all routes. Nonce-based for inline styles from shadcn/ui components.

```javascript
// next.config.js
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'Content-Security-Policy',
      value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL}`,
    }],
  }];
}
```

---

## Pattern 7: `traceparent` Propagation from FE to BE

**Addresses**: NFR-UI-OBS-002  
**Pattern**: `lib/telemetry.ts` reads the `traceparent` value injected by Sentry's FE SDK (W3C trace context). Every `fetch` call in `api-client.ts` and `intent-emitter.ts` includes `traceparent` as a request header so the BE OTel span can be linked to the FE user action.

```typescript
import * as Sentry from '@sentry/nextjs';

export function getTraceparent(): string | undefined {
  return Sentry.getCurrentHub().getClient()?.getIntegration(...)?.getTraceData()?.traceparent;
}
```

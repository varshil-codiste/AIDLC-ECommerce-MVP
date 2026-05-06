# Business Logic Model — UoW-05-chat-shell

---

## Workflow 1: User Sends a Message

```
User                 Composer        ChatSessionState      SseClient             BE Orchestrator
  |                     |                  |                   |                        |
  |-- types message ---->|                 |                   |                        |
  |-- hits Enter/Send -->|                 |                   |                        |
  |                     |-- dispatch ------>|                   |                        |
  |                     |  addUserMessage  |                   |                        |
  |                     |  streaming=true  |                   |                        |
  |                     |  composerDisabled|                   |                        |
  |                     |                  |-- connect -------->|                        |
  |                     |                  |  POST /stream      |-- SSE GET /stream ---->|
  |                     |                  |  {message, role}   |                        |
  |<-- typing indicator--|                  |                   |                        |
  |   renders            |                  |                   |<-- event: token -------|
  |                     |                  |<-- onToken --------|  {delta: "Hi! "}       |
  |                     |                  | addStreamingDelta  |                        |
  |<-- streaming text --|                  |                   |<-- event: token --------|
  |   updates           |                  |                   |  {delta: "Looking..."}  |
  |                     |                  |                   |<-- event: widget -------|
  |                     |                  |<-- onWidget -------|  {type, data}          |
  |                     |                  | addWidgetMessage   |                        |
  |<-- widget renders --|                  |                   |<-- event: done ---------|
  |                     |                  |<-- onDone ---------|  {messageId}           |
  |                     |                  | streaming=false    |                        |
  |                     |                  | composerEnabled    |                        |
  |<-- composer re-enabled|               |                   |                        |
```

---

## Workflow 2: Widget Intent Emission

```
User             WidgetComponent    IntentEmitter           BE Orchestrator
  |                   |                  |                        |
  |-- clicks "Add" -->|                  |                        |
  |                   |-- emit intent -->|                        |
  |                   |  {intent,        |-- POST /intent ------->|
  |                   |   sessionId,     |  Auth: Bearer <token>  |
  |                   |   payload}       |                        |
  |                   |                  |<-- 200 OK -------------|
  |                   |                  |                        |
  |                   |-- [new SSE stream starts, Workflow 1 repeats]
```

---

## Workflow 3: SSE Reconnect Flow

```
SseClient                                  BE Orchestrator
    |                                            |
    |<-- connection drops ---------------------->|
    |   (network error)
    |
    |-- wait 1s
    |-- attempt 1: GET /stream
    |   Last-Event-ID: <last messageId>         |
    |<-- connection refused ----------------------|
    |
    |-- wait 2s
    |-- attempt 2: GET /stream                  |
    |<-- 200 OK, stream resumes -----------------|
    |
    [normal streaming resumes from Workflow 1]

If 3 attempts fail:
    |-- sseStatus = 'failed'
    |-- dispatch: addErrorMessage("Connection lost. Please refresh to continue.")
```

---

## Workflow 4: Page Mount (First Load)

```
app/chat/page.tsx mount
    |
    |-- read role from JWT (via lib/auth/session.ts)
    |-- read messages from sessionStorage
    |
    |-- if messages empty:
    |       if role = 'shopper':
    |           dispatch: addAssistantText("Hi! I'm your shopping assistant...")
    |       if role = 'merchant':
    |           SseClient.connect({ message: '__init__', role: 'merchant' })
    |           [Workflow 1 fires; dashboard_digest widget renders]
    |
    |-- if messages exist (reload):
    |       restore to ChatSessionState
    |       sseStatus = 'idle'
```

---

## State Machine: SSE Connection Lifecycle

```
IDLE
  |
  v [user sends message OR merchant mount]
CONNECTING
  |
  v [EventSource opens]
CONNECTED
  |              |
  v [done event] v [network drop]
IDLE          RECONNECTING
                 |
                 v [reconnect success]
              CONNECTED
                 |
                 v [3 failures]
              FAILED
```

---

## State Machine: Composer Lifecycle

```
ENABLED (streaming = false)
  |
  v [user submits]
DISABLED (streaming = true)
  |
  v [done or error event]
ENABLED
```

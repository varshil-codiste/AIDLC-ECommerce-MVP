# Components Catalog

**Generated**: 2026-05-04T00:20:30Z

Modules / components organized by stack. Each row points to the design artifact (or future source location) that defines it in detail.

---

## Frontend (`web/`)

| Component | Type | Responsibility | Key dependencies |
|-----------|------|---------------|-------------------|
| `app/chat/page.tsx` | Route | Single chat surface; the only user-facing route | SSE client, widget renderer, role detector |
| `components/chat/MessageList.tsx` | Component | Renders message history; auto-scrolls; preserves focus during streams (NFR-A11Y-02) | aria-live=polite |
| `components/chat/Composer.tsx` | Component | Text input + send; keyboard shortcuts | i18n placeholder |
| `components/chat/StreamingTokens.tsx` | Component | Renders incoming SSE token stream into the active assistant bubble | SSE client |
| `components/widgets/ProductCard.tsx` | Widget | Renders `product_card` payload | NFR-A11Y-04 alt text |
| `components/widgets/ProductCarousel.tsx` | Widget | Renders `product_carousel` (horizontal scroll, keyboard-navigable) | NFR-A11Y-01 |
| `components/widgets/CartSummary.tsx` | Widget | Renders `cart_summary` with qty steppers | intent emission |
| `components/widgets/OrderCard.tsx` | Widget | Renders `order_card` | — |
| `components/widgets/OrderList.tsx` | Widget | Renders `order_list` (merchant) | filters, bulk actions |
| `components/widgets/TrackingWidget.tsx` | Widget | Renders `tracking_widget` (timeline) | — |
| `components/widgets/PaymentWidget.tsx` | Widget | Renders `payment_widget` (simulated) | — |
| `components/widgets/ProductEditPreview.tsx` | Widget | Renders `product_edit_preview` | confirm/edit-more intent |
| `components/widgets/CustomerCard.tsx` | Widget | Renders `customer_card` | — |
| `components/widgets/DashboardDigest.tsx` | Widget | Renders `dashboard_digest` (KPI cards) | — |
| `components/widgets/ConfirmationPrompt.tsx` | Widget | Renders `confirmation_prompt`; aria-live=assertive | NFR-A11Y-03 |
| `components/widgets/NotificationInbox.tsx` | Widget | Renders `notification_inbox` (merchant) | unread count |
| `components/widgets/Toast.tsx` | Component | In-app toast for new-order / low-stock notifications | — |
| `components/auth/LoginForm.tsx` | Component | Email + password login | rate-limit aware |
| `lib/sse-client.ts` | Lib | Wraps EventSource; reconnect on drop; surfaces `token`/`widget`/`done`/`error` events | — |
| `lib/intent-emitter.ts` | Lib | Sends widget interaction intents to `/api/v1/orchestrator/intent` | — |
| `lib/api-client.ts` | Lib | Generated typed client from `shared/openapi.yaml` | — |
| `lib/auth/session.ts` | Lib | Token storage + auto-refresh via rotation | — |
| `lib/telemetry.ts` | Lib | Forwards FE errors + traceparent to BE / Sentry | — |

**Frontend stack**: Next.js (App Router) + React + Tailwind + shadcn/ui — per codiste preset (Stage 11 confirms).

---

## Backend (`api/`)

### Top-level modules

| Module | Responsibility | Key types / files |
|--------|----------------|-------------------|
| `auth/` | Login, refresh, password hashing, role decoding from JWT, rate limiting | `AuthService`, `JwtStrategy`, `argon2.service.ts` |
| `orchestrator/` | LLM-powered intent router; role gate; widget assembly; multi-agent coordination; cost telemetry sidecar | `OrchestratorService`, `RoleGate`, `WidgetAssembler` |
| `agents/product/` | Product Agent (both modes) — LLM + tools | `ProductAgent`, `prompt.ts`, `tools/*.ts` |
| `agents/cart/` | Cart Agent (shopper) | `CartAgent`, `prompt.ts`, `tools/*.ts` |
| `agents/order/` | Order Agent (both modes) | `OrderAgent`, `prompt.ts`, `tools/*.ts` |
| `agents/customer/` | Customer Agent (merchant) | `CustomerAgent`, `prompt.ts`, `tools/*.ts` |
| `agents/checkout/` | Checkout Agent (shopper, simulated payment) | `CheckoutAgent`, `prompt.ts`, `tools/*.ts` |
| `core-api/` | Typed tool surface — port layer; one file per entity (`product.tool.ts`, `cart.tool.ts`, …); these are what agents call | port interfaces + adapter binding |
| `persistence/` | Prisma client; repository adapters per entity; outbox writer | `PrismaService`, `*.repository.ts` |
| `audit/` | Append-only audit log writer; subscribed to all repository writes via interceptor | `AuditService`, `AuditInterceptor` |
| `notifications/` | Subscribes Redis Streams; emits in-app notifications; manages `notifications` entity | `NotificationConsumer`, `notifications.service.ts` |
| `telemetry/` | OTel tracer; LLM cost meter; structured logging shim | `TracerProvider`, `CostMeter` |
| `events/` | Outbox drain worker → Redis Streams publisher | `OutboxWorker`, `StreamPublisher` |

### Cross-cutting

| Concern | Implementation |
|---------|----------------|
| Idempotency middleware | Per-request key check against Redis `idem:<key>` |
| Confirmation-prompt middleware | Wraps destructive intents; emits `confirmation_prompt` widget; resumes original intent on confirm |
| Error envelope (RFC 7807) | Global `HttpExceptionFilter` |
| Request-ID propagation | Middleware on every inbound; embedded in every log + every outbound LLM call |

**Backend stack**: NestJS + Prisma + Vitest — per codiste preset (Stage 11 confirms).

---

## Database (`api/prisma/schema.prisma`)

Full schema in `data-model.md`. 14 entities total: 12 from PRD § 11 + 2 added (`notifications`, `idempotency_keys`).

---

## Cross-stack shared (`shared/`)

| File / dir | Purpose |
|------------|---------|
| `shared/openapi.yaml` | Source of truth for REST contract |
| `shared/widget-schemas/<widget>.json` | JSON Schema for each of the 12 widget payload shapes (Z-validated on FE, OpenAPI-validated on BE) |
| `shared/intents/<intent>.json` | JSON Schema for widget-interaction intents (cart.add, cart.update, …) |
| `shared/types/` | Auto-generated TS types shared by FE + BE |

---

## Infrastructure (`infra/`)

Filled at Stage 11 / Stage 16. Placeholder for Dockerfile per stack + Terraform modules.

---

## Component → Story coverage

Every story in `user-stories.md` lands in 1–4 components above. Stage 7 Workflow Planning will generate the Units-of-Work decomposition, where each UoW typically owns 2–6 components from this list.

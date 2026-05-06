# Product Requirements Document (PRD)
## Chat-Native E-Commerce Platform — Multi-Agent MVP

**Version:** 0.3 (Chat-Only, Self-Hosted)
**Date:** April 17, 2026
**Status:** Draft

---

## 1. Executive Summary

A **chat-native e-commerce platform** where both shoppers and merchants interact with their store entirely through a unified conversational interface. A role-aware orchestrator routes every message to specialized agents that handle CRUD operations on products, orders, customers, and carts. The chat renders **rich inline widgets** — product cards, cart summaries, order trackers, payment prompts — so users never leave the conversation.

There is no traditional storefront (no PLP/PDP pages) and no traditional admin panel (no forms/tables). The chat **is** the product.

---

## 2. Vision & Differentiation

Traditional e-commerce = pages, menus, forms. Chat-native e-commerce = intent-first, conversational, frictionless.

**For shoppers:** "I need a gift for my mom, she loves plants, under $50" — the agent understands, searches, shows cards, lets them buy inline.

**For merchants:** "How are we doing today? Refund order 1234, and tag that customer as needs-follow-up" — multi-agent workflow executes in one turn.

This is riskier than traditional e-commerce but highly differentiated — and perfectly suited to LLM-era expectations.

---

## 3. Problem Statement

- **Shoppers** are tired of navigating cluttered stores, filters, and multi-step checkouts when they just want to describe what they need.
- **Merchants** waste hours inside admin dashboards clicking through screens to do things a sentence could describe.

A single conversational surface solves both sides.

---

## 4. Goals & Non-Goals

### MVP Goals
- One unified chat app with role-aware routing (shopper vs. merchant)
- 5 core agents covering both sides of the marketplace
- Rich widget rendering (product cards, cart, order cards, etc.) inline in chat
- Full shopper journey (discover → cart → checkout → track) via chat only
- Full merchant journey (onboard → add products → fulfill orders → manage customers) via chat only
- Single-tenant MVP (we host one store; multi-tenant comes later)

### Non-Goals (MVP)
- Traditional storefront or admin UI
- Multi-tenant (multiple merchants on one deployment)
- Mobile native app (responsive web chat only)
- Voice interface
- Multi-currency / multi-language
- Review moderation, analytics, marketing agents (v1.1+)
- Payment implementation details (deferred decision)

---

## 5. Target Users

### Shopper Persona — "Chat-native Chloe"
- Comfortable with ChatGPT, WhatsApp shopping, concierge services
- Values speed and natural interaction over browsing
- Willing to trust AI to surface the right products

### Merchant Persona — "Operator Olivia"
- Running a small DTC brand (apparel, home goods, specialty food)
- Overwhelmed by traditional admin panels
- Wants to manage the store from her phone while doing other things
- 2–5 people on her team

---

## 6. Experience Overview

### 6.1 Unified Entry Point
- User visits `chat.ourhub.com` (or equivalent)
- Logs in → system detects role (`shopper`, `merchant`, `admin`) from user record
- Chat UI adapts: available agents, suggested prompts, and widget types change by role
- Same codebase, same UI shell, different capabilities and tone

### 6.2 Shopper Flow (Chat Only)
1. Shopper opens chat → greeted by a welcome message with suggested queries
2. "Show me running shoes under $100" → **Product Agent** renders a product card carousel inline
3. Clicks "Add to cart" on a card → **Cart Agent** confirms with an updated cart widget
4. "Checkout" → **Checkout Agent** renders a payment prompt (Stripe integration TBD)
5. After purchase → **Order Agent** shows an order confirmation card
6. Later: "Where's my order?" → **Order Agent** shows live tracking widget

### 6.3 Merchant Flow (Chat Only)
1. Merchant opens chat → dashboard digest card: today's orders, low stock, new customers
2. "Add a new product: Linen Shirt, $45, 100 in stock" → **Product Agent** walks through missing fields conversationally, renders preview card
3. "Refund order #1234 and tag the customer as refund_requested" → **Order Agent** + **Customer Agent** coordinate, render confirmation
4. "Who are my top 10 customers this month?" → **Customer Agent** renders a ranked list card
5. "Mark orders 1240–1245 as shipped with these tracking numbers..." → bulk operation confirmed with a summary card

---

## 7. Agent Definitions (MVP — 5 Agents)

| Agent | Audience | Responsibilities |
|---|---|---|
| **Product Agent** | Both | Merchant: CRUD products/variants/stock. Shopper: search, recommend, compare |
| **Cart Agent** | Shopper | CRUD cart items, view cart, apply rules |
| **Order Agent** | Both | Shopper: view own orders, track, request returns. Merchant: manage all orders, fulfill, refund |
| **Customer Agent** | Merchant | CRUD customer profiles, tags, segments |
| **Checkout Agent** | Shopper | Guide through payment; renders payment widget (impl TBD) |

> Role-based access is enforced at the orchestrator layer: a shopper's message cannot trigger merchant-only agent actions even if phrased deceptively.

### 7.1 Product Agent
**Merchant mode (full CRUD):**
- Create product via conversational field-gathering
- Read/search by any attribute
- Update any field, including bulk operations
- Soft-delete (archive)

**Shopper mode (read + recommend):**
- Semantic search ("something for outdoor dinners")
- Filter and sort via natural language
- Returns **product card carousel** widget inline
- Compare 2–3 products side by side

### 7.2 Cart Agent (Shopper-only)
- Add item (with variant selection if needed)
- Remove / update quantity
- View cart → renders **cart summary widget** with items, subtotal, estimated total
- Clear cart
- Cart persists across sessions per shopper

### 7.3 Order Agent
**Shopper mode:**
- "Show me my orders" → **order list widget**
- "Where's my last order?" → **tracking widget**
- "I want to return order #1234" → starts return flow

**Merchant mode:**
- Read all orders with filters
- Update status, add tracking
- Issue refunds (coordinates with payment system)
- Cancel orders
- Each update triggers events so other agents react (e.g., restock inventory, notify customer)

### 7.4 Customer Agent (Merchant-only)
- Create customer manually
- Read: search, list by tag/segment, LTV
- Update: edit info, add/remove tags
- Delete: GDPR-safe anonymization

### 7.5 Checkout Agent (Shopper-only)
- Confirms cart → collects/selects shipping address
- Renders **payment widget** (implementation TBD — Stripe link vs. embedded)
- On success, hands off to Order Agent to create order and confirm
- Handles failures with clear retry guidance

---

## 8. Chat Widget Specification

All widgets are structured JSON returned by agents and rendered by the chat UI.

| Widget | Triggered by | Key Elements |
|---|---|---|
| `product_card` | Product Agent (shopper) | Image, name, price, variants, "Add to cart" button |
| `product_carousel` | Product Agent (shopper) | Multiple product cards, horizontal scroll |
| `cart_summary` | Cart Agent | Line items, quantity steppers, subtotal, "Checkout" button |
| `order_card` | Order Agent | Order ID, status, items, total, actions (track/return) |
| `order_list` | Order Agent (merchant) | Table-like list with filters and bulk-action buttons |
| `tracking_widget` | Order Agent (shopper) | Shipment timeline, carrier info |
| `payment_widget` | Checkout Agent | Payment method selector + submit (impl TBD) |
| `product_edit_preview` | Product Agent (merchant) | Product card preview + "Confirm" / "Edit more" |
| `customer_card` | Customer Agent | Profile, tags, LTV, recent orders |
| `dashboard_digest` | Orchestrator (merchant) | KPI cards: sales, orders, low-stock alerts |
| `confirmation_prompt` | Any destructive op | "Are you sure?" with Confirm/Cancel buttons |

### Widget Interaction Contract
- Every interactive element (button, stepper, selector) sends a structured intent back to the orchestrator (e.g., `{intent: "cart.add", product_id: "p123", variant_id: "v456"}`)
- This keeps the agent loop closed — **all state changes go through agents**, even button clicks

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | First token streamed in <1.5s; widget render <3s from message |
| **Availability** | 99.5% uptime |
| **Security** | Role-based access enforced at orchestrator; rate-limit per user; audit log for all writes |
| **Compliance** | GDPR-ready (data export, anonymization), PCI offloaded to payment provider |
| **Scalability** | Support 1K concurrent chat sessions in MVP (single-tenant store) |
| **Observability** | Full trace per message: orchestrator → agent calls → DB writes |
| **Safety** | Destructive ops always trigger a `confirmation_prompt` widget before executing |

---

## 10. System Architecture

```
                    ┌──────────────────────────────────┐
                    │   UNIFIED CHAT UI (Web)          │
                    │   - Text input + streaming        │
                    │   - Rich widget renderer          │
                    │   - Role-aware suggestions        │
                    └────────────────┬─────────────────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │  Orchestrator    │
                          │  - Auth + role   │
                          │  - Intent route  │
                          │  - Widget assembly│
                          └────────┬─────────┘
                                   │
        ┌────────────┬─────────────┼─────────────┬─────────────┐
        │            │             │             │             │
  ┌─────▼─────┐ ┌────▼────┐ ┌──────▼──────┐ ┌───▼────────┐ ┌──▼──────────┐
  │  Product  │ │  Cart   │ │   Order     │ │ Customer   │ │  Checkout   │
  │  Agent    │ │  Agent  │ │   Agent     │ │ Agent      │ │  Agent      │
  └─────┬─────┘ └────┬────┘ └──────┬──────┘ └───┬────────┘ └──┬──────────┘
        │            │             │             │             │
        └────────────┴─────────────┴─────────────┴─────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   Core API Layer    │
                        │   (typed tools)     │
                        └──────────┬──────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
      ┌──────▼─────┐        ┌──────▼──────┐       ┌──────▼──────┐
      │ PostgreSQL │        │ Redis       │       │  Payment    │
      │            │        │ (events +   │       │  Provider   │
      │            │        │  cache)     │       │  (TBD)      │
      └────────────┘        └─────────────┘       └─────────────┘
```

### Key Design Decisions
- **Orchestrator = LLM + role gate.** Every incoming message carries the user's role; orchestrator blocks cross-role abuse at this layer.
- **Agents are stateless LLM functions** with scoped tools (each tool is a typed API endpoint).
- **Widgets are JSON payloads**, not HTML — the renderer on the client controls styling for consistency.
- **Single Postgres** owns all core data; **Redis Streams** carry inter-agent events (`order.created` → customer LTV recalc, stock decrement, etc.).
- **No traditional pages.** The router is literally one route: `/chat`. Deep links to a widget state (e.g., "share this product") are handled by replaying a seed message.

---

## 11. Data Model (High-Level)

```
users              — role (shopper | merchant | admin), auth info
products           — title, description, price, status, category_id
product_variants   — SKU, attributes (size, color), stock
categories         — name, parent_id
carts              — user_id, items[], updated_at
orders             — user_id, status, total, payment_ref
order_items        — order_id, variant_id, qty, price_at_purchase
customers          — (merchant-view of shoppers) tags[], segments[], ltv
addresses          — user_id, type
conversations      — user_id, started_at
messages           — conversation_id, role (user|agent), content, widget_payload
audit_log          — actor, action, entity, before, after
agent_events       — event_type, payload, emitted_by, consumed_by[]
```

> Note: `customers` is a merchant-facing projection of `users` with role=shopper, plus merchant-added metadata.

---

## 12. User Stories

### Shopper
1. As a shopper, I can describe what I'm looking for in natural language and see a product carousel.
2. As a shopper, I can add items to my cart by clicking a button on a product card.
3. As a shopper, I can view my cart as a widget and edit quantities inline.
4. As a shopper, I can check out through a payment widget without leaving the chat.
5. As a shopper, I can ask "where's my order?" and see a tracking widget.
6. As a shopper, I can initiate a return by asking for one.

### Merchant
7. As a merchant, I log in and see a digest card with today's KPIs.
8. As a merchant, I can add a new product conversationally and see a preview before confirming.
9. As a merchant, I can ask "what needs my attention?" and get a prioritized action list.
10. As a merchant, I can refund an order and tag the customer in a single message.
11. As a merchant, I can bulk-update stock levels by describing the changes.
12. As a merchant, destructive operations always ask for confirmation before executing.

---

## 13. Success Metrics (3 months post-launch)

| Metric | Target |
|---|---|
| Shopper message-to-cart conversion rate | ≥ 15% |
| Shopper cart-to-purchase conversion rate | ≥ 40% |
| Merchant onboarding completion (first product live) | ≥ 70% |
| Agent command success rate | ≥ 85% |
| Median messages to complete a purchase | ≤ 6 |
| Median messages to complete a merchant CRUD op | ≤ 3 |
| Merchant-reported time saved per week | ≥ 3 hours |

---

## 14. MVP Milestones

| Phase | Duration | Deliverable |
|---|---|---|
| **M1 — Foundations** | Weeks 1–3 | Auth, DB schema, role system, Core API scaffolding |
| **M2 — Chat Shell + Orchestrator** | Weeks 4–6 | Chat UI with streaming, role-aware routing, widget renderer framework |
| **M3 — Merchant Path** | Weeks 7–9 | Product + Order + Customer agents (merchant mode) |
| **M4 — Shopper Path** | Weeks 10–12 | Product agent (shopper mode) + Cart + Checkout + Order (shopper mode) |
| **M5 — Polish & Widgets** | Weeks 13–14 | All 10+ widget types, confirmation flows, audit log, error states |
| **M6 — Closed Beta** | Weeks 15–16 | 5 merchants + real shoppers on one hosted store |
| **M7 — Launch** | Week 17 | Public release (single-tenant) |

---

## 15. Risks & Assumptions

### Risks
- **Discovery UX in chat is unproven at scale.** Shoppers may abandon if product discovery feels slower than a traditional grid.
- **Rich widgets add frontend complexity** — we're essentially rebuilding UI primitives inside chat.
- **LLM latency & cost** — every interaction touches the orchestrator + at least one agent; costs scale with message volume.
- **Role confusion** — a merchant testing as a shopper, or vice versa, may expect different behaviors; clear role switch is needed.
- **Payment trust in chat** — shoppers may be wary of paying inside a chat UI (mitigated by payment widget design + trust signals).

### Assumptions
- Target users tolerate and prefer conversational flows over traditional UI
- Single-tenant is acceptable for MVP validation (multi-tenant later)
- Rich widgets rendered in chat satisfy the visual/trust requirements that a traditional storefront normally provides

---

## 16. Open Questions

1. **Payment integration** — Stripe Checkout redirect, embedded Elements, or hosted link? (Deferred)
2. **Product image quality in chat** — carousel + zoom modal, or limited to thumbnails?
3. **Shopper onboarding** — guest chat + account upsell, or require account before first message?
4. **Multi-modal input** — can shoppers upload a photo ("find me something like this")?
5. **Merchant bulk uploads** — CSV upload via chat attachment, or purely conversational?
6. **Offline / async** — do merchants get push notifications when important events happen (new order, low stock)?
7. **Analytics agent** — when does this join the lineup? Some merchants will want it early.

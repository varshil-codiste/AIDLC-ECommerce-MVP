# Personas — Chat-Native E-Commerce Platform

**Tier**: Greenfield
**Generated**: 2026-05-04T00:17:00Z
**Source**: PRD § 5; BR § 1.2; Stage 5 Q1 = A

The MVP serves two named personas. Internal pilot users (5–10 Codiste team members) play one of these two roles; pilot is a **deployment context**, not a third persona.

---

## Persona 1 — Shopper "Chat-native Chloe"

**Role**: `shopper` (in `users.role`)

**Demographics & context**
- 25–40, urban, smartphone-first
- Has used ChatGPT, WhatsApp shopping, concierge services
- Comfortable expressing intent in natural language
- Indian English (en-IN) speaker (BR § 2.9)

**Motivations**
- Wants a frictionless way to describe what she's looking for and get specific recommendations
- Values speed over browsing — would rather type a sentence than apply 6 filters
- Trusts AI to surface the right products if it can ask the right clarifying question

**Pain points the product addresses**
- Cluttered storefronts with too many filters, menus, modals
- Multi-step checkouts that lose her between cart and confirmation
- Order tracking buried inside an account dashboard

**Constraints / risks**
- May abandon if discovery feels slower than a traditional grid (BR risk R1)
- May be wary of paying inside a chat UI (mitigated by clear payment widget — N/A in MVP because internal/demo)

**Primary chat surface**
- Same `/chat` route as merchants; the orchestrator detects role from the user record and shows shopper-mode agents (Product, Cart, Checkout, Order — shopper mode)

**Sample utterances** (used in acceptance criteria)
- *"I need a gift for my mom, she loves plants, under $50"*
- *"Show me running shoes in size 9, navy"*
- *"Where's my last order?"*
- *"I want to return order 1234"*

---

## Persona 2 — Merchant "Operator Olivia"

**Role**: `merchant` (in `users.role`)

**Demographics & context**
- 30–50, runs a small Direct-to-Consumer (DTC) brand: apparel, home goods, or specialty food
- 2–5 person team; she is the operator-of-record
- Manages the store from her phone while doing other things (school run, factory visit, dinner)
- Indian English (en-IN) speaker

**Motivations**
- Wants to keep the store running with minimal screen time
- Hates clicking through admin dashboards to do things a sentence could describe
- Wants to react quickly to events (new orders, low stock, customer issues)

**Pain points the product addresses**
- Traditional admin panels have too many forms, tabs, and screens for routine operations
- Bulk operations (mark 12 orders shipped, update stock for 30 SKUs) are painful in tabular UIs
- Notifications scatter across email + dashboards + Slack

**Constraints / risks**
- Needs **fast** confirmation of multi-agent actions (refund + tag in one turn) — partial failures must be explicit
- Cannot afford to accidentally execute a destructive op (every cart-clear, order-cancel, customer-delete must confirm)
- Limited time → notifications must surface what matters, not everything

**Primary chat surface**
- Same `/chat` route as shoppers; the orchestrator shows merchant-mode agents (Product, Order — merchant mode, Customer) plus the dashboard digest on session-open

**Sample utterances**
- *"How are we doing today?"* → dashboard digest
- *"Add a new product: Linen Shirt, $45, 100 in stock"*
- *"Refund order 1234 and tag the customer as refund_requested"*
- *"Mark orders 1240–1245 as shipped with these tracking numbers..."*
- *"What needs my attention?"*

---

## Out-of-band stakeholder (NOT a persona for stories)

The Codiste pod (Tech Lead + Dev) is the *out-of-band* stakeholder during MVP. They do not appear in any user story; they appear in operational documents (audit log, observability dashboards, runbooks).

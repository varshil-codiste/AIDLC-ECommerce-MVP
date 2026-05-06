# User Stories — Chat-Native E-Commerce Platform

**Tier**: Greenfield (Comprehensive)
**Generated**: 2026-05-04T00:17:30Z
**Sources**: PRD § 12 + `requirements/requirements.md` (FR-* and NFR-*)
**Format**: INVEST stories with Given-When-Then acceptance criteria, T-shirt sizing, requirement-ID traceability, cross-stack notes, Tier-1/2/3 ranking
**Total**: 26 stories (10 Shopper + 13 Merchant + 3 Cross-Cutting)

> **Tier ranking**: T1 = M1–M2 foundations / chat shell ; T2 = M3–M4 agent paths ; T3 = M5+ polish & widgets.
> **Stack tags**: FE (frontend chat UI), BE (backend Core API + agents), DB (Postgres schema), VEC (vector store), OBS (observability), AGT (LLM agent prompts/tools).

---

# Part A — Shopper Journey

## SH-01 — Shopper login + first chat

> **As** a Shopper, **I want** to log in with email + password and land in the chat surface, **so that** I can start interacting immediately.

**Acceptance criteria**
- *Given* a registered shopper account, *When* they submit email + correct password, *Then* a JWT (RS256, with refresh-token rotation) is issued and they are redirected to `/chat`.
- *Given* a registered shopper, *When* they land in `/chat`, *Then* the orchestrator detects role = `shopper` and renders a welcome message + suggested prompts within 1.5 s.
- *Given* a wrong password (≥ 5 attempts in 1 min), *When* the next attempt arrives, *Then* the system rate-limits and shows a polite cooldown message.

**Size**: M  · **Tier rank**: T1  · **Stacks**: FE + BE + DB
**Traces**: FR-AUTH-01..05, NFR-SEC-05, NFR-SEC-07, NFR-SEC-08

---

## SH-02 — Discover via natural language

> **As** a Shopper, **I want** to describe what I'm looking for in natural language, **so that** I get a curated `product_carousel` instead of having to apply filters.

**Acceptance criteria**
- *Given* a shopper logged in, *When* they say "show me running shoes under $100", *Then* a `product_carousel` widget renders with ≤ 8 products all priced ≤ $100, first token < 1.5 s, full carousel < 3 s.
- *Given* an ambiguous query ("a thing for my mom"), *When* it arrives, *Then* the Product Agent asks **one** clarifying question instead of returning low-relevance results.
- *Given* the vector store is unreachable, *When* a query arrives, *Then* the agent falls back to keyword search and tells the shopper explicitly "I couldn't do semantic search; here are keyword matches".

**Size**: L  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + VEC
**Traces**: FR-CHAT-03, FR-AGT-PROD-06/07, NFR-AIML-04, NFR-PERF-01/02, ERR-03

---

## SH-03 — Compare products side by side

> **As** a Shopper, **I want** to compare 2–3 products in chat, **so that** I can decide without leaving the conversation.

**Acceptance criteria**
- *Given* a `product_carousel` is on screen, *When* the shopper says "compare the first two", *Then* a comparison widget renders the two products with attribute deltas highlighted.
- *Given* the shopper asks to compare > 3 items, *When* the request arrives, *Then* the agent caps at 3 and explains why.

**Size**: S  · **Tier rank**: T3  · **Stacks**: FE + AGT
**Traces**: FR-AGT-PROD-08

---

## SH-04 — Add to cart from a product card

> **As** a Shopper, **I want** to tap "Add to cart" on a product card, **so that** the click is just as conversational as typing.

**Acceptance criteria**
- *Given* a `product_card` is rendered, *When* the shopper taps "Add to cart", *Then* a structured intent `{intent:"cart.add", product_id, variant_id}` is sent to the orchestrator (FR-CHAT-05) and a fresh `cart_summary` widget renders within 1.5 s.
- *Given* the variant is out of stock, *When* the add is attempted, *Then* the Cart Agent refuses and suggests an in-stock variant inline (EC-01).
- *Given* required variant is not chosen (e.g., size), *When* "Add to cart" is tapped, *Then* the agent asks one clarifying question.

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-CHAT-05, FR-AGT-CART-01, EC-01

---

## SH-05 — View and edit cart

> **As** a Shopper, **I want** to see my cart and adjust quantities inline, **so that** I don't have to navigate to a separate cart page.

**Acceptance criteria**
- *Given* the shopper says "show my cart", *When* the message arrives, *Then* a `cart_summary` widget renders with line items, qty steppers, subtotal, "Checkout" button.
- *Given* the cart widget is on screen, *When* the shopper changes a qty stepper, *Then* a `cart.update` intent fires and a refreshed `cart_summary` renders.
- *Given* the shopper says "clear my cart", *When* the message arrives, *Then* a `confirmation_prompt` renders before the cart is cleared (FR-ORCH-04).

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-CART-02/03/04, FR-ORCH-04

---

## SH-06 — Cart persists across sessions

> **As** a Shopper, **I want** my cart to be there when I come back, **so that** I don't lose what I picked yesterday.

**Acceptance criteria**
- *Given* a shopper added items in session 1 and logged out, *When* they log in for session 2, *Then* their cart is restored exactly as left.
- *Given* a cart is older than the retention cutoff, *When* the user logs in, *Then* the cart is presented but flagged as "older than X days — confirm before checkout".

**Size**: S  · **Tier rank**: T2  · **Stacks**: BE + DB
**Traces**: FR-AGT-CART-05, FR-CHAT-06, NFR-PRIV-03

---

## SH-07 — Resume conversation across sessions

> **As** a Shopper, **I want** to pick up the chat where I left off, **so that** I don't have to re-explain context.

**Acceptance criteria**
- *Given* the shopper had a conversation yesterday, *When* they log in today and open chat, *Then* they see the last 20 messages and can scroll back further.
- *Given* the transcript is older than 6 months, *When* the user opens chat, *Then* archived messages are not loaded (per NFR-PRIV-03 retention).

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + DB
**Traces**: FR-CHAT-06, NFR-PRIV-03

---

## SH-08 — Checkout (simulated payment)

> **As** a Shopper, **I want** to check out without leaving chat, **so that** the experience stays unbroken.

**Acceptance criteria**
- *Given* the shopper says "checkout", *When* the message arrives, *Then* the Checkout Agent collects/selects shipping address and renders a `payment_widget` (simulated — internal/demo).
- *Given* the shopper "submits payment" in the simulated widget, *When* the simulated success arrives, *Then* the Order Agent creates an order and renders an `order_card` confirmation.
- *Given* a simulated payment failure, *When* it occurs, *Then* the Checkout Agent surfaces a clear retry option (does NOT silently roll back the cart).

> NOTE: live payment integration is out-of-scope for MVP per BR § 2.7. Production integration re-engages on external rollout.

**Size**: L  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-CHK-01..04

---

## SH-09 — Track an order

> **As** a Shopper, **I want** to ask "where's my order?" and see live tracking, **so that** I don't have to dig through emails.

**Acceptance criteria**
- *Given* the shopper says "where's my last order?", *When* the message arrives, *Then* a `tracking_widget` renders with shipment timeline + carrier info for their most recent order.
- *Given* the shopper asks about an order they don't own, *When* the message arrives, *Then* the role gate denies + the orchestrator surfaces "I don't see that order under your account" (NFR-AIML-05 — no cross-user RAG bleed).

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-ORD-02, NFR-AIML-05, NFR-SEC-06

---

## SH-10 — Initiate a return

> **As** a Shopper, **I want** to ask for a return in chat, **so that** I don't need to find a hidden returns form.

**Acceptance criteria**
- *Given* the shopper says "I want to return order 1234", *When* the message arrives, *Then* the Order Agent starts a return flow (collects reason, item-level selection if applicable) and renders a confirmation `order_card` reflecting the return state.

**Size**: S  · **Tier rank**: T3  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-ORD-03

---

# Part B — Merchant Journey

## MR-01 — Merchant login + dashboard digest

> **As** a Merchant, **I want** to see today's status the moment I open chat, **so that** I know where to focus first.

**Acceptance criteria**
- *Given* a merchant logs in, *When* the chat session opens, *Then* a `dashboard_digest` widget renders within 3 s with KPI cards for: today's orders count + value, low-stock items, new customers (last 24 h).
- *Given* an empty store (no orders today), *When* the digest renders, *Then* it shows zero-state copy ("No orders yet today — let's add some products?") instead of empty cards.

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB + OBS
**Traces**: FR-AUTH-01..03, FR-ORCH-05

---

## MR-02 — Add a product conversationally

> **As** a Merchant, **I want** to add a product by describing it, **so that** I don't have to fill out a form.

**Acceptance criteria**
- *Given* a merchant says "Add a product: Linen Shirt, $45, 100 in stock", *When* the message arrives, *Then* the Product Agent walks through any missing fields (description, category, image) conversationally and renders a `product_edit_preview` widget.
- *Given* the merchant taps "Confirm" on the preview, *When* the intent fires, *Then* the product is persisted and the agent confirms.
- *Given* the merchant taps "Edit more", *When* the intent fires, *Then* the agent asks which field to change.

**Size**: L  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-PROD-01

---

## MR-03 — Update an existing product

> **As** a Merchant, **I want** to update a product by telling the agent what changed, **so that** edits are as fast as the description.

**Acceptance criteria**
- *Given* a merchant says "Change the Linen Shirt price to $50", *When* the message arrives, *Then* the Product Agent renders a `product_edit_preview` with the change diff highlighted, awaiting confirmation.

**Size**: S  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-PROD-03

---

## MR-04 — Bulk add via conversational paste

> **As** a Merchant, **I want** to paste a list of products into chat and have them added, **so that** I don't need a CSV upload UI.

**Acceptance criteria**
- *Given* a merchant pastes a list of ≤ 50 products (newline-separated), *When* the message arrives, *Then* the Product Agent parses each line, asks one clarifying question per ambiguity, and renders a single bulk-preview widget summarizing the result.
- *Given* the merchant confirms, *When* the bulk write commits, *Then* each product creation emits an audit-log entry (one per product) and the agent confirms how many succeeded / how many were rejected.

**Size**: L  · **Tier rank**: T3  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-PROD-05, NFR-SEC-04

---

## MR-05 — Multi-agent: refund + tag customer in one message

> **As** a Merchant, **I want** to refund an order and tag the customer in a single sentence, **so that** related ops happen in one turn.

**Acceptance criteria**
- *Given* a merchant says "Refund order 1234 and tag the customer as refund_requested", *When* the message arrives, *Then* the Orchestrator coordinates Order Agent + Customer Agent in one turn and renders a single confirmation widget summarizing both outcomes.
- *Given* the refund succeeded but the tag write failed, *When* the partial state is reached, *Then* the orchestrator surfaces the partial-success state honestly (no silent rollback) (EC-04).
- *Given* the merchant has not confirmed, *When* the destructive op is attempted, *Then* a `confirmation_prompt` widget renders first (FR-ORCH-04).

**Size**: L  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-ORD-06, FR-AGT-CUST-03, FR-ORCH-02/04, EC-04

---

## MR-06 — View and filter orders

> **As** a Merchant, **I want** to ask for orders by status / date / customer, **so that** I can act on them in batches.

**Acceptance criteria**
- *Given* a merchant says "Show me unfulfilled orders from this week", *When* the message arrives, *Then* an `order_list` widget renders with the matching orders, filterable buttons (status, date), and bulk-action buttons (mark shipped, cancel).

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-ORD-04

---

## MR-07 — Update order status / add tracking

> **As** a Merchant, **I want** to mark orders shipped (with tracking) in bulk, **so that** I don't update each one individually.

**Acceptance criteria**
- *Given* a merchant says "Mark orders 1240–1245 as shipped with these tracking numbers: A1, A2, A3, A4, A5, A6", *When* the message arrives, *Then* the Order Agent applies updates, emits one `order.shipped` event per order (for downstream agents to react), and renders a single summary widget.
- *Given* mismatched count of orders vs tracking numbers, *When* the message arrives, *Then* the agent rejects with a clear correction request.

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-ORD-05, FR-AGT-ORD-08

---

## MR-08 — Manage customers (read / search / segment)

> **As** a Merchant, **I want** to search and segment my customers in chat, **so that** I can spot top buyers fast.

**Acceptance criteria**
- *Given* a merchant says "Who are my top 10 customers this month?", *When* the message arrives, *Then* a ranked `customer_card` list renders sorted by month-LTV.
- *Given* a merchant taps a `customer_card`, *When* the intent fires, *Then* the full profile + tags + recent orders renders.

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT + DB
**Traces**: FR-AGT-CUST-02

---

## MR-09 — GDPR-safe customer anonymization

> **As** a Merchant (or system on a retention-cutoff trigger), **I want** to anonymize a customer record while keeping the aggregate stats, **so that** privacy obligations are met without losing analytics.

**Acceptance criteria**
- *Given* a merchant says "Delete customer X" or a retention cutoff fires, *When* the action is confirmed via `confirmation_prompt`, *Then* the Customer Agent replaces all PII fields (email, phone, address, name) with placeholders, retains the `customer_id` + `ltv` + `order_count` for analytics, and emits an audit-log entry.

**Size**: M  · **Tier rank**: T3  · **Stacks**: BE + AGT + DB
**Traces**: FR-AGT-CUST-04, NFR-PRIV-01, NFR-PRIV-03, NFR-SEC-04

---

## MR-10 — In-app new-order notification

> **As** a Merchant, **I want** to be notified in-app when a new order arrives, **so that** I can react without checking my email.

**Acceptance criteria**
- *Given* an order is created, *When* the merchant has an active session, *Then* a toast notification appears + the `notification_inbox` count increments.
- *Given* the merchant has no active session, *When* they next log in, *Then* unread notifications render in the digest + inbox.
- *Given* the merchant taps the notification, *When* the intent fires, *Then* the relevant `order_card` renders.

**Size**: M  · **Tier rank**: T2  · **Stacks**: FE + BE + DB
**Traces**: FR-NOTIF-01, FR-NOTIF-03 (no email/SMS), FR-WIDGET-12

---

## MR-11 — In-app low-stock notification

> **As** a Merchant, **I want** to be notified in-app when a SKU drops below threshold, **so that** I can restock before going OOS.

**Acceptance criteria**
- *Given* a SKU's stock drops below the configured threshold (default: 5 units), *When* the threshold is crossed, *Then* a low-stock notification is created and surfaces same as MR-10.
- *Given* multiple SKUs drop in the same minute, *When* the notifications are created, *Then* they are batched into a single notification "5 SKUs are low" instead of 5 separate ones.

**Size**: S  · **Tier rank**: T3  · **Stacks**: BE + DB
**Traces**: FR-NOTIF-02, FR-NOTIF-03

---

## MR-12 — "What needs my attention?" priority list

> **As** a Merchant, **I want** to ask "what needs my attention?" and get a prioritized list, **so that** I work on the most-important items first.

**Acceptance criteria**
- *Given* a merchant asks "what needs my attention?", *When* the message arrives, *Then* the Orchestrator (or a thin "attention" tool) returns a ranked list combining: unfulfilled orders > 24 h, low-stock SKUs, customers awaiting reply, refunds pending.
- *Given* none of these conditions hold, *When* the message arrives, *Then* the orchestrator says so clearly with zero-state copy.

**Size**: M  · **Tier rank**: T3  · **Stacks**: BE + AGT + DB
**Traces**: PRD § 12 #9, FR-ORCH-05

---

## MR-13 — Confirmation prompt before destructive ops

> **As** a Merchant (or Shopper), **I want** to be asked before destructive operations execute, **so that** I never lose data by accident.

**Acceptance criteria**
- *Given* any destructive operation is requested (cart-clear, order-cancel, customer-delete, refund), *When* the orchestrator routes the intent, *Then* a `confirmation_prompt` widget renders **before** execution.
- *Given* the user cancels the prompt, *When* "Cancel" is tapped, *Then* no state change occurs and the agent confirms the cancellation.

**Size**: S  · **Tier rank**: T2  · **Stacks**: FE + BE + AGT
**Traces**: FR-ORCH-04, FR-WIDGET-11, NFR-RELI-02

---

# Part C — Cross-Cutting Stories

## CC-01 — Accessibility Level A operability

> **As** any user with a keyboard or screen reader, **I want** to operate every widget without a mouse and to hear what's happening, **so that** the chat surface is usable for me.

**Acceptance criteria**
- *Given* a widget is rendered, *When* the user navigates by Tab/Shift+Tab, *Then* every interactive element is reachable in a logical order with a visible focus ring.
- *Given* a streaming response is in progress, *When* tokens arrive, *Then* focus does NOT jump (NFR-A11Y-02).
- *Given* a screen reader is active, *When* a widget renders, *Then* an aria-live=polite announcement summarizes the widget content (NFR-A11Y-03).
- *Given* a critical confirmation prompt renders, *When* it appears, *Then* an aria-live=assertive announcement reads it.
- *Given* an image in a widget, *When* it renders, *Then* it has a meaningful `alt` attribute (NFR-A11Y-04). Color is not the sole signal (NFR-A11Y-06).
- *Given* the page loads, *When* the title and language are read, *Then* both are present and meaningful (NFR-A11Y-08).

**Size**: M  · **Tier rank**: T3  · **Stacks**: FE
**Traces**: NFR-A11Y-01..08

---

## CC-02 — LLM cost telemetry surfaced for the pod

> **As** the pod (Tech Lead + Dev), **I want** to see token-in / token-out / USD-cost per agent invocation rolled up daily, **so that** the lean-budget constraint stays under control.

**Acceptance criteria**
- *Given* any agent invocation, *When* it completes (or fails), *Then* a structured log entry is emitted with `tokens_in`, `tokens_out`, `cost_usd`, `agent_name`, `model_name`, `request_id`, `user_id`.
- *Given* the OTel + Grafana stack is online, *When* the daily roll-up job runs, *Then* a dashboard shows yesterday's spend split by agent + by user-role + cumulative-month-to-date.
- *Given* daily spend exceeds a configured budget alarm, *When* it's crossed, *Then* a Slack message is posted to `#incidents` (warning level).

**Size**: M  · **Tier rank**: T1  · **Stacks**: BE + OBS
**Traces**: NFR-AIML-07, NFR-OBS-02/03/05

---

## CC-03 — Audit log for every write

> **As** the pod (and any future legal review), **I want** every write across the system captured in an immutable audit log, **so that** I can reconstruct who-did-what for any record.

**Acceptance criteria**
- *Given* any write operation (cart, order, customer, product, refund, tag, login event), *When* it commits, *Then* an `audit_log` row is inserted with `actor_user_id`, `actor_role`, `action`, `entity`, `entity_id`, `before`, `after`, `request_id`, `timestamp`.
- *Given* an attempt to UPDATE or DELETE an audit_log row, *When* it executes, *Then* the DB rejects (table-level grant excludes UPDATE/DELETE; or append-only constraint via trigger).
- *Given* the retention cutoff for audit log (1 year), *When* the cleanup job runs, *Then* rows older than 1 year are archived to cold storage (not permanently deleted in MVP).

**Size**: M  · **Tier rank**: T1  · **Stacks**: BE + DB
**Traces**: NFR-SEC-02, NFR-SEC-04, PRD § 11 (`audit_log` entity)

---

# INVEST Self-Check Summary

| Criterion | Compliance |
|-----------|------------|
| **Independent** | Most stories independent. Dependencies: SH-* depend on SH-01 (auth); MR-* depend on MR-01; CC-03 (audit log) is a foundation depended on by every write story. |
| **Negotiable** | All ACs are pod-negotiable; sized intentionally to allow deferral / scope adjustment. |
| **Valuable** | Each story names a persona + a value statement explicitly. |
| **Estimable** | All sized XS / S / M / L / XL. None are XL (story would need to split). |
| **Small** | All ≤ L. No XL stories — bulk product MR-04 is the largest at L (acceptable per pod sizing). |
| **Testable** | Every AC is in Given-When-Then form. Acceptance into the test suite is direct. |

**Story totals by size**: XS 0 / S 5 / M 14 / L 7 / XL 0 = 26 stories.
**By tier**: T1 = 2 / T2 = 17 / T3 = 7.

---

# Story-to-Milestone Map (preview for Stage 7 Workflow Planning)

| Milestone | Stories |
|-----------|---------|
| M1 — Foundations (W1–3) | CC-03 (audit log) + SH-01 + MR-01 (auth) + CC-02 partial (cost telemetry instrumentation) |
| M2 — Chat Shell + Orchestrator (W4–6) | All chat-shell + orchestrator role-gate behaviors that ride under SH-01/MR-01 |
| M3 — Merchant Path (W7–9) | MR-02, MR-03, MR-05, MR-06, MR-07, MR-08, MR-09, MR-10 |
| M4 — Shopper Path (W10–12) | SH-02, SH-04, SH-05, SH-06, SH-07, SH-08, SH-09 |
| M5 — Polish & Widgets (W13–14) | SH-03, SH-10, MR-04, MR-11, MR-12, MR-13, CC-01 (a11y) |
| M7 — Internal Demo Readiness (W15–17) | All stories regression-tested; runbook + demo script |

(M6 closed-beta is CUT per BR Round 2 C1 = C.)

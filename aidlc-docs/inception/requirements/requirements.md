# Requirements — Chat-Native E-Commerce Platform (Multi-Agent MVP)

**Project**: ECommmer-AIDLC
**Tier**: Greenfield → Comprehensive depth (escalated due to AI/ML-heavy + LLM-cost risk)
**Generated**: 2026-05-04T00:14:30Z
**Stage**: 4 — Requirements Analysis

This is the canonical functional + non-functional requirements doc. It synthesizes:
- `inception/business-requirements/business-requirements.md`
- Stage 4 Q1–Q10 + C1, C2, C3 answers
- Extension opt-ins (all 4 enabled — see `aidlc-state.md` § Extension Configuration)

---

## 0. Intent Analysis

| Dimension | Value |
|-----------|-------|
| Request type | New product / new project |
| Scope | System-wide — chat UI + orchestrator + 5 agents + Core API + DB + payment integration deferred |
| Complexity | Complex |
| Risk | High — LLM-cost binding constraint, novel chat-native paradigm, financial transaction handling (deferred to v1.1+ via internal/demo scope) |
| Reversibility | Medium — schema choices made now bind v1.1+ migrations; LLM provider choice can be revisited |
| Depth | **Comprehensive** (Greenfield default + AI/ML escalation) |

---

## 1. Functional Requirements

### 1.1 Chat surface (cross-role)

| ID | Requirement | Source |
|----|-------------|--------|
| FR-CHAT-01 | The system MUST provide a single web chat surface at a known URL where both shopper and merchant users transact end-to-end without navigating to traditional pages | PRD § 6.1 |
| FR-CHAT-02 | On login, the system MUST detect the user's role from the user record (shopper / merchant / admin) and adapt available agents, suggested prompts, and rendered widget types accordingly | PRD § 6.1 |
| FR-CHAT-03 | The system MUST stream the LLM response token-by-token to the chat UI; first token within 1.5 s of message submission | PRD § 9 |
| FR-CHAT-04 | The system MUST render rich inline widgets in chat (11 widget types — see § 1.3 Widget Inventory) | PRD § 8 |
| FR-CHAT-05 | Every interactive widget element (button, stepper, selector) MUST send a structured intent back to the orchestrator (e.g., `{intent: "cart.add", product_id, variant_id}`); button clicks MUST NOT bypass agents | PRD § 8 |
| FR-CHAT-06 | Chat transcripts MUST persist per-user across sessions until the retention cutoff (6 months per BR § 2.11); shoppers MUST be able to ask "show me my last order" / "pick up where we left off" | Stage 4 Q7 = A |
| FR-CHAT-07 | Streaming transport MUST be Server-Sent Events (SSE); WebSockets are out-of-scope for MVP | Stage 4 Q8 = A |

### 1.2 Authentication & role gate

| ID | Requirement | Source |
|----|-------------|--------|
| FR-AUTH-01 | The system MUST support email + password authentication; passwords hashed with **argon2id** | Stage 4 Q5 = A; codiste preset `conventions.password_hash` |
| FR-AUTH-02 | Sessions MUST use JWT with refresh-token rotation (RS256 per codiste preset) | codiste preset `cross_stack.auth` |
| FR-AUTH-03 | The user record MUST carry one of three roles: `shopper`, `merchant`, `admin`; role is set on signup or by admin promotion | PRD § 6.1, § 11 |
| FR-AUTH-04 | The orchestrator MUST enforce role-based access at routing time; a shopper-role message MUST NOT be able to invoke merchant-only agent actions even if phrased deceptively | PRD § 7, § 9 (Security) |
| FR-AUTH-05 | The MVP user base is internal pilot (5–10 Codiste team members); no public signup flow required | Stage 4 Q6 = A; BR Round 2 C1 = C |

### 1.3 Widget inventory

The orchestrator + agents emit one of these structured-JSON widget types; the chat UI renders them inline. Every widget specifies a payload schema (defined in Stage 6 Application Design):

| ID | Widget | Triggered by | Surface |
|----|--------|--------------|---------|
| FR-WIDGET-01 | `product_card` | Product Agent (shopper) | Image, name, price, variants, "Add to cart" button |
| FR-WIDGET-02 | `product_carousel` | Product Agent (shopper) | Multiple product cards, horizontal scroll |
| FR-WIDGET-03 | `cart_summary` | Cart Agent | Line items, qty steppers, subtotal, "Checkout" button |
| FR-WIDGET-04 | `order_card` | Order Agent | Order ID, status, items, total, actions (track / return) |
| FR-WIDGET-05 | `order_list` | Order Agent (merchant) | Table list with filters + bulk-action buttons |
| FR-WIDGET-06 | `tracking_widget` | Order Agent (shopper) | Shipment timeline + carrier info |
| FR-WIDGET-07 | `payment_widget` | Checkout Agent | Payment method selector + submit (impl deferred — internal/demo has no live payments) |
| FR-WIDGET-08 | `product_edit_preview` | Product Agent (merchant) | Card preview + Confirm / Edit-more |
| FR-WIDGET-09 | `customer_card` | Customer Agent | Profile, tags, LTV, recent orders |
| FR-WIDGET-10 | `dashboard_digest` | Orchestrator (merchant) | KPI cards: sales, orders, low-stock alerts |
| FR-WIDGET-11 | `confirmation_prompt` | Any destructive op | "Are you sure?" with Confirm / Cancel |
| FR-WIDGET-12 | `notification_inbox` | Orchestrator (merchant) | In-app notification list (new orders / low stock) | NEW — added at Stage 4 Q9 = A |

### 1.4 Agents (5 + role-mode-specific behaviors)

#### Product Agent (both roles)
| ID | Requirement | Mode |
|----|-------------|------|
| FR-AGT-PROD-01 | Create product via conversational field-gathering | Merchant |
| FR-AGT-PROD-02 | Read / search by any attribute | Both |
| FR-AGT-PROD-03 | Update any field including bulk operations | Merchant |
| FR-AGT-PROD-04 | Soft-delete (archive) products | Merchant |
| FR-AGT-PROD-05 | Bulk add via conversational paste — "Add 50 products with these names…" — NOT via CSV upload (Stage 4 Q10 = A) | Merchant |
| FR-AGT-PROD-06 | Semantic product search ("something for outdoor dinners") backed by embeddings + vector store | Shopper |
| FR-AGT-PROD-07 | Filter / sort via natural language; return `product_carousel` widget | Shopper |
| FR-AGT-PROD-08 | Compare 2–3 products side by side | Shopper |

#### Cart Agent (shopper only)
| ID | Requirement |
|----|-------------|
| FR-AGT-CART-01 | Add item with variant selection if needed |
| FR-AGT-CART-02 | Remove / update quantity |
| FR-AGT-CART-03 | View cart → renders `cart_summary` widget with items, subtotal, estimated total |
| FR-AGT-CART-04 | Clear cart |
| FR-AGT-CART-05 | Cart MUST persist across sessions per shopper |

#### Order Agent (both roles)
| ID | Requirement | Mode |
|----|-------------|------|
| FR-AGT-ORD-01 | "Show me my orders" → `order_list` widget | Shopper |
| FR-AGT-ORD-02 | "Where's my last order?" → `tracking_widget` | Shopper |
| FR-AGT-ORD-03 | "I want to return order #X" → starts return flow | Shopper |
| FR-AGT-ORD-04 | Read all orders with filters | Merchant |
| FR-AGT-ORD-05 | Update status, add tracking | Merchant |
| FR-AGT-ORD-06 | Issue refunds (coordinates with payment system — out-of-scope for MVP/internal-demo) | Merchant |
| FR-AGT-ORD-07 | Cancel orders | Merchant |
| FR-AGT-ORD-08 | Each order update emits an event so other agents react (e.g., restock inventory, notify customer) | System |

#### Customer Agent (merchant only)
| ID | Requirement |
|----|-------------|
| FR-AGT-CUST-01 | Create customer manually |
| FR-AGT-CUST-02 | Read: search, list by tag/segment, LTV |
| FR-AGT-CUST-03 | Update: edit info, add/remove tags |
| FR-AGT-CUST-04 | Delete: GDPR-safe anonymization (scrub PII, keep aggregate stats) |

#### Checkout Agent (shopper only)
| ID | Requirement |
|----|-------------|
| FR-AGT-CHK-01 | Confirm cart → collect / select shipping address |
| FR-AGT-CHK-02 | Render `payment_widget` (implementation deferred per PRD § 16 Q1) |
| FR-AGT-CHK-03 | On (simulated) success, hand off to Order Agent to create order and emit confirmation |
| FR-AGT-CHK-04 | Handle simulated failures with clear retry guidance |

> NOTE: Internal/demo monetization model means Checkout Agent operates in **simulation mode** only in MVP — no live payment provider integration. Re-engages on external rollout.

### 1.5 Orchestrator

| ID | Requirement |
|----|-------------|
| FR-ORCH-01 | LLM-powered intent router; receives every message + carries the user's role |
| FR-ORCH-02 | Routes to the appropriate agent(s) — single agent or multi-agent coordinated turn (e.g., "Refund order #X and tag the customer as refund_requested" → Order Agent + Customer Agent in one turn) |
| FR-ORCH-03 | Assembles widget JSON payloads from agent outputs and returns to the chat UI |
| FR-ORCH-04 | Renders `confirmation_prompt` widget BEFORE executing any destructive operation (cart-clear, order-cancel, customer-delete, refund) |
| FR-ORCH-05 | For merchants: emits a `dashboard_digest` widget on session-open with today's orders, low-stock alerts, new customers |

### 1.6 Notifications (in-app only)

| ID | Requirement | Source |
|----|-------------|--------|
| FR-NOTIF-01 | Merchants MUST see new-order events as in-app notifications (toast or `notification_inbox` widget) | Stage 4 Q9 = A |
| FR-NOTIF-02 | Merchants MUST see low-stock events as in-app notifications | Stage 4 Q9 = A |
| FR-NOTIF-03 | NO external email / SMS notifications in MVP | Stage 4 Q9 = A |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-PERF-01 | First-token streaming latency | < 1.5 s p95 | PRD § 9 |
| NFR-PERF-02 | Widget render time (user message → fully rendered widget) | < 3.0 s p95 | PRD § 9 |
| NFR-PERF-03 | Concurrent chat sessions design ceiling | 1,000 (single-tenant) | PRD § 9 |
| NFR-PERF-04 | MVP actual scale target (internal pilot) | 5–10 concurrent | Stage 4 Q6 = A |

### 2.2 Availability & Reliability

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-AVAIL-01 | Uptime | 99.5% monthly | PRD § 9 |
| NFR-RELI-01 | Idempotent agent retries on transient LLM provider failures (with bounded backoff) | required | derived |
| NFR-RELI-02 | Destructive operations (cart-clear, order-cancel, customer-delete, refund) MUST NOT execute without `confirmation_prompt` acknowledgment | hard | PRD § 9 + FR-ORCH-04 |

### 2.3 Security (extension: Security Baseline — full enforcement)

Driven by `aidlc-state.md` § Extension Configuration → Security Baseline = enabled-full. Every SECURITY-* rule applies; selected operational requirements:

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-SEC-01 | All PII (shopper email, address, phone, conversation transcripts) MUST be encrypted at rest with a separate KMS key (envelope encryption pattern in lean cloud target) | BR § 2.8 + Security Baseline |
| NFR-SEC-02 | Audit log MUST be append-only / immutable; protected from operator deletion | BR § 2.8 |
| NFR-SEC-03 | Merchant business data MUST be segregated at storage layer from shopper PII (separate schema or table family) | BR § 2.8 |
| NFR-SEC-04 | All write operations (across all agents) MUST emit an audit log entry: actor, action, entity, before, after, timestamp | PRD § 11 (`audit_log` entity) |
| NFR-SEC-05 | Rate-limit per user — protect against agent-spam abuse | PRD § 9 |
| NFR-SEC-06 | Role-based access enforced at orchestrator layer (FR-AUTH-04); cross-role abuse blocked | PRD § 9 |
| NFR-SEC-07 | Passwords hashed with argon2id; never stored plaintext, never logged | codiste preset |
| NFR-SEC-08 | JWT signed with RS256; refresh-token rotation on use | codiste preset |
| NFR-SEC-09 | PCI scope = zero (no card data on platform; deferred to payment provider when payments re-engage) | PRD § 9 |

### 2.4 Privacy & Data Handling

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-PRIV-01 | GDPR-ready architecture: data export endpoint per user; anonymization endpoint per user (replaces PII with placeholders, retains aggregate metrics) | PRD § 9 |
| NFR-PRIV-02 | Indian DPDP Act 2023 alignment (currently not load-bearing because monetization = internal/demo, but built-in for future external onboarding) | BR § 2.6 |
| NFR-PRIV-03 | Retention windows enforced by automated job: PII 12 mo / transcripts 6 mo / audit log 1 yr / agent traces 30 d / embeddings rebuilt on schedule | BR § 2.11 |
| NFR-PRIV-04 | NO public TOS / Privacy Policy required for MVP (internal/demo); hard-gate to draft+publish before any external onboarding | BR § 3.5 |

### 2.5 AI/ML Lifecycle (extension: AI/ML Lifecycle — full enforcement)

Driven by Stage 4 Q2 = A. All AIML-* rules apply:

| ID | Requirement |
|----|-------------|
| NFR-AIML-01 | Every prompt template MUST be version-controlled in source; never edited live in production |
| NFR-AIML-02 | An eval suite MUST exist for each agent before its first Gate #4 PROCEED; eval covers golden-path + ≥ 3 adversarial cases |
| NFR-AIML-03 | Hallucination guardrails: agents MUST cite the data source for any factual claim about products, orders, customers; orchestrator MUST refuse to answer when data is missing rather than confabulate |
| NFR-AIML-04 | Semantic search retriever (vector store) MUST report retrieval quality metrics (recall@k, precision@k) on a labeled eval set |
| NFR-AIML-05 | RAG context MUST be limited to the calling user's authorization scope (a shopper's RAG retrieval CANNOT surface another user's order data) |
| NFR-AIML-06 | LLM PII handling: outgoing messages to the LLM provider MUST redact direct identifiers when not needed for the task; incoming PII in user messages logged + flagged |
| NFR-AIML-07 | Cost telemetry: every agent invocation logs token-in / token-out / cost-USD; aggregated daily for budget monitoring |
| NFR-AIML-08 | Prompt-injection defense: orchestrator validates that role gate cannot be bypassed via crafted user content |

### 2.6 Property-Based Testing (extension: Property-Based Testing — partial enforcement)

Driven by Stage 4 Q3 = B. Subset PBT-02, 03, 07, 08, 09 apply (pure functions + serialization round-trips). Selected operational requirements:

| ID | Requirement |
|----|-------------|
| NFR-PBT-01 | Cart math (subtotals, taxes, discounts, totals) MUST have property-based tests asserting algebraic invariants (commutativity of additions, etc.) |
| NFR-PBT-02 | Widget JSON serialization MUST have property-based round-trip tests (parse(serialize(x)) == x) |
| NFR-PBT-03 | Order state-machine transitions MUST have property tests proving no invalid transition is reachable |
| NFR-PBT-04 | Role-gate decision logic MUST have property tests covering the cross-product of (role × intent × resource) |

### 2.7 Accessibility (extension: WCAG 2.2 — Level A only)

Driven by Stage 4 Round 2 C2 = B. Level A rules apply; AA-only rules N/A:

| ID | Requirement |
|----|-------------|
| NFR-A11Y-01 | All interactive widget elements MUST be keyboard-operable (no mouse-only interactions) |
| NFR-A11Y-02 | Focus management during streaming: focus must not jump unpredictably while tokens stream in |
| NFR-A11Y-03 | Screen-reader announcements for widget renders (politeness=polite); critical confirmations (politeness=assertive) |
| NFR-A11Y-04 | All non-decorative images MUST have meaningful `alt` text |
| NFR-A11Y-05 | Form fields (auth, address) MUST have associated labels |
| NFR-A11Y-06 | Color is NOT the sole means of conveying status (e.g., low-stock badge has icon + text, not just red) |
| NFR-A11Y-07 | NO time-based auto-dismissal of important content (Level A constraint) |
| NFR-A11Y-08 | Page MUST have a meaningful `<title>` / language declaration |

### 2.8 Observability

Driven by codiste preset overridden to **hybrid lean** at BR Round 2 C2 = C:

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-OBS-01 | Sentry (free tier) — error tracking | BR § 2.3 |
| NFR-OBS-02 | OTel traces + self-hosted Grafana — APM (replaces Datadog) | BR § 2.3 |
| NFR-OBS-03 | Full trace per message: orchestrator → agent calls → DB writes; each span tags `request_id`, `user_id`, `role`, `agent_name`, `model_name` | PRD § 9 |
| NFR-OBS-04 | Structured JSON logs with codiste-preset required fields (timestamp, level, message, service, version, request_id, user_id, trace_id, span_id, environment) | profile |
| NFR-OBS-05 | LLM cost telemetry surface (NFR-AIML-07) — daily / weekly / cumulative | derived |

### 2.9 Maintainability & Operability

| ID | Requirement |
|----|-------------|
| NFR-MAINT-01 | Code style enforced by stack-appropriate linter (ESLint + Prettier for FE / BE Node; ruff for Python; etc.) |
| NFR-MAINT-02 | All dependencies MIT / Apache only (no AGPL / GPL); pre-commit hook or CI check enforces |
| NFR-MAINT-03 | CI: GitHub Actions; per-stack `scripts/ci.sh` invoked from workflow files |
| NFR-MAINT-04 | Single Postgres owns all core data; Redis Streams carry inter-agent events |

---

## 3. User scenarios (happy / edge / error)

### 3.1 Happy paths (Greenfield depth: enumerate 6)

| # | Scenario | Source |
|---|----------|--------|
| HP-01 | Shopper describes need ("running shoes under $100") → carousel rendered → adds to cart → checkout (simulated) → order confirmation | PRD § 6.2 |
| HP-02 | Shopper asks "where's my last order?" → tracking widget rendered with timeline | PRD § 6.2 |
| HP-03 | Merchant logs in → dashboard digest rendered (today's orders + low stock) | PRD § 6.3 |
| HP-04 | Merchant adds product conversationally → preview card → confirms → product live | PRD § 6.3 |
| HP-05 | Merchant says "Refund order #1234 and tag customer as refund_requested" → Order Agent + Customer Agent coordinate → confirmation widget | PRD § 6.3 |
| HP-06 | Merchant says "Add 50 products: …" → Product Agent processes conversational batch → preview list → confirms | Stage 4 Q10 = A |

### 3.2 Edge cases

| # | Scenario | Expected behavior |
|---|----------|-------------------|
| EC-01 | Shopper tries to add out-of-stock variant | Cart Agent refuses with clear message + suggests in-stock variant |
| EC-02 | Shopper sends ambiguous query ("a thing for my mom") | Product Agent asks one clarifying question instead of low-relevance results |
| EC-03 | Merchant tries to delete a customer with active orders | Customer Agent renders confirmation prompt explaining consequence |
| EC-04 | Multi-agent turn partial failure (e.g., refund issued but customer-tag write fails) | Orchestrator surfaces the partial-success state honestly; no silent rollback |
| EC-05 | LLM provider rate-limits or 5xx | Orchestrator retries with bounded backoff (NFR-RELI-01); user sees a polite "give me a moment" message |
| EC-06 | Shopper attempts to invoke merchant-only intent ("show me all customers") | Role gate blocks at orchestrator (NFR-SEC-06); shopper gets a redirect to allowed actions |

### 3.3 Error scenarios

| # | Scenario | Expected behavior |
|---|----------|-------------------|
| ERR-01 | Auth token expired mid-session | Auto-refresh via rotation; transparent to user; logged |
| ERR-02 | DB write timeout | Idempotent retry; if still fails, agent surfaces "I couldn't save that — please try again" |
| ERR-03 | Vector store retrieval failure | Fallback to keyword search with explicit "I couldn't do semantic search; here are keyword matches" message |
| ERR-04 | Prompt-injection attempt detected | Orchestrator refuses; logs event; does not execute the requested action |

---

## 4. Quality attributes (cross-cut)

| Attribute | Approach |
|-----------|---------|
| Testability | Per-agent eval suites (NFR-AIML-02); subset PBT (§ 2.6); integration tests in Stage 14 Build & Test |
| Internationalization | Out-of-scope for MVP (en-IN only); architectural placeholder (i18n key stubs) |
| Documentation | OpenAPI 3.1 for Core API contract (codiste preset); per-widget JSON schema; README per service |
| Observability | See § 2.8 |
| Operability | Single deployment unit per stack; runbook produced at Stage 18 Production Readiness |

---

## 5. Cross-Reference Matrix

| Requirement / item | Source |
|--------------------|--------|
| Chat surface, role detection | PRD § 6.1, FR-CHAT-01/02 |
| 5-agent inventory | PRD § 7, FR-AGT-* |
| 11+1 widget inventory | PRD § 8 + Stage 4 Q9 (notification_inbox) |
| Auth model (email + argon2id) | Stage 4 Q5 = A, FR-AUTH-* |
| Pilot user volume | Stage 4 Q6 = A, NFR-PERF-04 |
| Transcript persistence | Stage 4 Q7 = A, FR-CHAT-06 |
| Streaming transport (SSE) | Stage 4 Q8 = A, FR-CHAT-07 |
| Notifications (in-app only) | Stage 4 Q9 = A, FR-NOTIF-* |
| Bulk uploads (conversational only) | Stage 4 Q10 = A, FR-AGT-PROD-05 |
| Security Baseline (full) | Stage 4 Q1 = B → C1 = A; NFR-SEC-* |
| AI/ML Lifecycle (full) | Stage 4 Q2 = A; NFR-AIML-* |
| PBT (partial) | Stage 4 Q3 = B; NFR-PBT-* |
| Accessibility (Level A) | Stage 4 Q4 = B → C2 = B; NFR-A11Y-* |
| Data classification (Strict) | BR § 2.8, Round 1 Q3 = A; NFR-SEC-01..03 |
| Data retention (Conservative) | BR § 2.11, Round 1 Q6 = A; NFR-PRIV-03 |
| Observability (hybrid lean) | BR Round 2 C2 = C; NFR-OBS-* |
| Tier (Greenfield, Comprehensive) | tier.md |

---

## 6. Open Questions Carried Forward to Stage 6 / 11

| # | Topic | Revisit at |
|---|-------|------------|
| 1 | Cloud target & specific lean alternatives (Hetzner / Vultr / OCI / self-hosted) | Stage 11 Stack Selection |
| 2 | LLM provider selection + tier (OpenAI / Anthropic / managed-OSS) | Stage 11 Stack Selection (cost projection required) |
| 3 | Vector store choice (pgvector vs Pinecone vs Qdrant) | Stage 11 Stack Selection |
| 4 | Frontend framework confirmation (Next.js per preset vs alternative) | Stage 11 Stack Selection |
| 5 | Backend framework confirmation (NestJS per preset vs alternative) | Stage 11 Stack Selection |
| 6 | Payment provider choice — only re-engages on external rollout (out of MVP) | Future (post-MVP) |
| 7 | Multi-modal input (photo upload "find me something like this") | v1.1 (deferred, PRD § 16 Q4) |
| 8 | Analytics agent | v1.1 (deferred, PRD § 16 Q7) |
| 9 | Product image quality strategy (carousel + zoom modal vs thumbnails) | Stage 6 Application Design |
| 10 | Shopper onboarding (guest vs account-required) | Stage 6 Application Design |

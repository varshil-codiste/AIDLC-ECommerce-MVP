# Business Requirements — Chat-Native E-Commerce Platform (Multi-Agent MVP)

**Project**: ECommmer-AIDLC
**Tier**: Greenfield
**Created**: 2026-05-04
**Sources**: see `sources/manifest.md`
**Status**: Pending Gate #1 sign-off

---

## 1. Problem & Outcome

### 1.1 Problem statement

Two pain points on opposite sides of the same marketplace:

- **Shoppers** are tired of navigating cluttered storefronts, filters, and multi-step checkouts when they just want to describe what they need.
- **Merchants** waste hours inside admin dashboards clicking through screens to do things a sentence could describe.

A single conversational surface — chat as the only UI — solves both. The platform replaces traditional storefront pages and admin panels with a unified chat that renders rich inline widgets (product cards, cart summaries, order trackers, payment prompts).

> Source: PRD § 1, § 3.

### 1.2 Target users / personas

| Persona | Description | Source |
|---------|-------------|--------|
| **Shopper — "Chat-native Chloe"** | Comfortable with ChatGPT / WhatsApp shopping / concierge services. Values speed and natural interaction over browsing. Willing to trust AI to surface the right products. | PRD § 5 |
| **Merchant — "Operator Olivia"** | Running a small DTC brand (apparel, home goods, specialty food). Overwhelmed by traditional admin panels. Manages the store from her phone while doing other things. 2–5 person team. | PRD § 5 |

Both personas use the **same** chat UI; the orchestrator detects role from the user record and adapts available agents, suggested prompts, and widget types.

### 1.3 Business goals

**Primary goal**: validate the chat-native commerce thesis. The MVP is a focused proof that an end-to-end conversational commerce surface (no traditional storefront, no admin UI) can deliver a usable shopping + merchant-ops experience.

Revenue is **not** a goal of this MVP. Learning is.

The product is positioned as **internal / demo only** during MVP — Codiste runs the only store as an R&D installation. There are no external merchants, no real shoppers, and no live payments.

> Source: Round 1 Q1 = A; Round 2 C1 = C.

### 1.4 Success metrics (3 months post-launch)

| Metric | Target | Source |
|--------|--------|--------|
| Shopper message-to-cart conversion rate | ≥ 15% | PRD § 13 |
| Shopper cart-to-purchase conversion rate | ≥ 40% | PRD § 13 |
| Merchant onboarding completion (first product live) | ≥ 70% | PRD § 13 |
| Agent command success rate | ≥ 85% | PRD § 13 |
| Median messages to complete a purchase | ≤ 6 | PRD § 13 |
| Median messages to complete a merchant CRUD op | ≤ 3 | PRD § 13 |
| Merchant-reported time saved per week | ≥ 3 hours | PRD § 13 |

> **Caveat**: because monetization model = internal/demo, "merchant" and "shopper" in these metrics refer to **internal pilot users**, not paying customers. Metric instrumentation is still required to validate the thesis.

### 1.5 Out-of-scope (MVP)

Explicit non-goals:

- Traditional storefront or admin UI
- Multi-tenant (multiple merchants on one deployment)
- Native mobile app (responsive web chat only)
- Voice interface
- Multi-currency, multi-language
- Review moderation, analytics, marketing agents (deferred to v1.1+)
- Payment-provider implementation choice (deferred — see Open Questions § 5)
- **Closed beta with 5 external merchants and real shoppers** — PRD § 14 M6 is **REMOVED from MVP scope** as a result of the Q5 → Internal/demo decision

> Source: PRD § 4 + Round 2 C1.

---

## 2. Constraints & Context

### 2.1 Target platforms

**Responsive web only.** The chat surface lives at `chat.ourhub.com` (placeholder URL). Same codebase, same UI shell renders both shopper and merchant flows; differences are agent capabilities and tone.

> Source: PRD § 4 Non-Goals + § 6.1.

### 2.2 Expected scale

| Dimension | Target |
|-----------|--------|
| Concurrent chat sessions | 1,000 (single-tenant store) |
| First-token latency | < 1.5 s |
| Widget render time | < 3 s from user message to fully-rendered widget |
| Availability | 99.5% uptime |

> Source: PRD § 9.

### 2.3 Budget

**Lean — under $25,000 total** for build + first 6 months of runtime.

Operations posture is **hybrid lean** (deviating from codiste preset):

| Tooling | Codiste preset | This project (lean override) |
|---------|----------------|-------------------------------|
| CI | GitHub Actions | GitHub Actions ✅ |
| Error tracker | Sentry | Sentry (free tier) ✅ |
| APM | Datadog | **OTel + self-hosted Grafana** (preset overridden) |
| IaC | Terraform | Terraform ✅ |
| State backend | Terraform Cloud | **S3 + DynamoDB** (or local-only for demo) |
| Cloud target | AWS (default) | **Deferred to Stage 11 Stack Selection** — likely Hetzner / Vultr / OCI free tier rather than AWS |

> Source: Round 1 Q2 = A; Round 2 C2 = C.

### 2.4 Timeline

17 weeks across 7 milestones (PRD § 14):

| Phase | Weeks | Deliverable |
|-------|-------|-------------|
| M1 — Foundations | 1–3 | Auth, DB schema, role system, Core API scaffolding |
| M2 — Chat Shell + Orchestrator | 4–6 | Chat UI with streaming, role-aware routing, widget renderer framework |
| M3 — Merchant Path | 7–9 | Product + Order + Customer agents (merchant mode) |
| M4 — Shopper Path | 10–12 | Product agent (shopper mode) + Cart + Checkout + Order (shopper mode) |
| M5 — Polish & Widgets | 13–14 | All 11 widget types, confirmation flows, audit log, error states |
| ~~M6 — Closed Beta~~ | ~~15–16~~ | **CUT** — internal/demo only, no external shoppers or merchants |
| M7 — Public Launch | 17 | **REPLACED by**: Internal demo readiness milestone (single hosted demo store, internal users only) |

### 2.5 Stakeholders

| Role | Person | Email | Notes |
|------|--------|-------|-------|
| Tech Lead | Chintan Bhai | chintan.p@codiste.com | Pod signer for all gates |
| Dev | Varshil | varshil.g@codiste.in | Pod signer for all gates |
| Stakeholder (out-of-band) | (none) | — | Not a gate signer |

> Source: `pod.md` (populated from Q01-profile-setup.md).

### 2.6 Regulatory / compliance

| Concern | Posture |
|---------|---------|
| **GDPR** | "GDPR-ready" architecture (data export + anonymization endpoints) per PRD § 9. Not active because launch market is India only — but built-in for future EU expansion. |
| **Indian DPDP Act 2023** | Applies (operative since Q4 2025). Currently not load-bearing because monetization = internal/demo (no external data subjects). Re-engages immediately if any external user is onboarded. |
| **PCI** | Fully offloaded to payment provider; **no card data ever stored on platform**. PCI scope = zero. |
| **Audit log** | Required for ALL writes. Immutable / append-only. |

> Source: PRD § 9, Round 1 Q3 = A, Round 2 C1.

### 2.7 External integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| **Payment provider** | TBD — Stripe Checkout vs. Elements vs. hosted Link (PRD § 16 Q1 deferred) | Decision in Stage 6 Application Design or Stage 11 Stack Selection. **Not load-bearing in MVP** because monetization = internal/demo (no live payments). |
| **LLM provider** | Required — orchestrator + 5 agents | Provider choice deferred to Stage 11 Stack Selection. Lean budget likely favours a managed API on a flat-rate or low-volume tier. |
| **Email / SMS** | Implied (order confirmations) but not explicitly listed in PRD | Will be revisited in Stage 4 Requirements Analysis. |

### 2.8 Data classification — Strict

| Data class | Handling rule |
|------------|---------------|
| **PII** (shopper email, address, phone) | Encrypted at rest with separate KMS key (or equivalent envelope-encryption pattern in lean alt) |
| **Conversation transcripts** | Treated as PII (same encryption + retention rules) |
| **Audit log** | Immutable / append-only; protected from operator deletion |
| **Merchant business data** | Segregated at storage layer from shopper PII (separate schema or table family) |

> Source: Round 1 Q3 = A.

### 2.9 Launch market & locale

**India — English (en-IN).** Single market, single language. No multi-locale support in MVP.

> Source: Round 1 Q4 = A.

### 2.10 Monetization model

**Internal / demo only.** Codiste runs the single store as an R&D / demo installation. No external merchants, no real shoppers, no live payments in MVP.

This is a deliberate scope reduction from the PRD (which assumed a closed-beta with 5 merchants in M6) — taken at Round 2 C1 to keep the legal-review and accessibility postures viable for a lean MVP.

> Source: Round 2 C1 = C.

### 2.11 Data retention — Conservative

| Data class | Retention |
|------------|-----------|
| PII | 12 months after last activity |
| Conversation transcripts | 6 months |
| Audit log | 1 year |
| Agent traces | 30 days |
| Embedding vectors | Rebuilt on schedule (no long-term store) |

> Source: Round 1 Q6 = A.

---

## 3. AI-product specifics

### 3.1 AI/ML usage scope

**LLM-heavy product.** Every interaction touches the LLM stack:

- **Orchestrator** = LLM with role gate (auth + role-aware intent routing + cross-role abuse blocking)
- **5 agents** (Product, Cart, Order, Customer, Checkout) = stateless LLM functions with scoped tools (each tool is a typed API endpoint)
- **Semantic product search** uses an embedding-based retriever backed by a vector store (pgvector by default per codiste preset; subject to Stage 11 review)

No first-party model training in MVP. AI/ML extension will be **considered** at Stage 4 Requirements Analysis (likely opt-in given LLM-heavy posture).

> Source: PRD § 7 + § 10; codiste preset; Round 1 Q1.

### 3.2 Brand assets

**Ready.** Logo, color palette, fonts, and tone guide already exist and will be supplied at Stage 2 Design Intake (Figma MCP or screenshots).

> Source: Round 1 Q7 = A.

### 3.3 Existing IP / OSS posture

**No special inheritance; standard MIT / Apache OSS only.** No copyleft (AGPL / GPL) anywhere. No pre-existing internal helpers to reuse. Stage 11 Stack Selection will hard-filter all dependencies against this rule.

> Source: Round 1 Q8 = A.

### 3.4 Accessibility

**WCAG 2.2 — Level A only** (partial enforcement). Updated at Stage 4 Round 2 C2 = B; supersedes the BR Round 2 C3 = A "no formal target" stance.

Operationally:
- The accessibility extension full rule file is loaded; only Level A rules become **blocking** at Functional Design, Code Generation, Code Review, Build & Test, Production Readiness
- AA-only rules are marked **N/A** with rationale (preserved for a future bump)
- Stage 13 Gate #4 will BLOCK on Level-A non-compliance (focus management, keyboard navigation, basic contrast, ARIA labelling for streaming chat + widget renders)

Trigger to revisit: any decision to expose the platform to external users (escalate to full AA).

> Source: Round 1 Q9 = D, Round 2 C3 = A (superseded), **Stage 4 Round 1 Q4 = B + Round 2 C2 = B (current)**.

### 3.5 Legal review

**No public TOS / Privacy Policy required for MVP** because monetization = internal/demo. No external user signups → no TOS / PP needed in MVP.

**Hard gate to re-engage legal review**: any future decision to onboard an external merchant or real shopper REQUIRES drafted TOS + Privacy Policy + DPDP-compliant data-export / anonymization endpoints BEFORE go-live.

> Source: Round 1 Q10 = D, Round 2 C1.

---

## 4. Cross-Reference Matrix

| Requirement / item | Source |
|--------------------|--------|
| Problem statement | sources/ecommerce-ops-hub-prd.md § 3 |
| Target personas | sources/ecommerce-ops-hub-prd.md § 5 |
| 5-agent inventory | sources/ecommerce-ops-hub-prd.md § 7 |
| 11-widget inventory | sources/ecommerce-ops-hub-prd.md § 8 |
| NFRs (latency, availability) | sources/ecommerce-ops-hub-prd.md § 9 |
| System architecture | sources/ecommerce-ops-hub-prd.md § 10 |
| Data model (12 entities) | sources/ecommerce-ops-hub-prd.md § 11 |
| User stories (12) | sources/ecommerce-ops-hub-prd.md § 12 |
| Success metrics | sources/ecommerce-ops-hub-prd.md § 13 |
| MVP milestones | sources/ecommerce-ops-hub-prd.md § 14 |
| Risks & assumptions | sources/ecommerce-ops-hub-prd.md § 15 |
| Open questions (PRD's own) | sources/ecommerce-ops-hub-prd.md § 16 |
| Tier (Greenfield) | tier.md |
| Business goals | Round 1 Q1 = A; Round 2 C1 = C |
| Budget | Round 1 Q2 = A; Round 2 C2 = C |
| Data classification | Round 1 Q3 = A |
| Launch market | Round 1 Q4 = A |
| Monetization | Round 2 C1 = C |
| Data retention | Round 1 Q6 = A |
| Brand assets | Round 1 Q7 = A |
| OSS posture | Round 1 Q8 = A |
| Accessibility | Round 1 Q9 = D; Round 2 C3 = A (risk accepted) |
| Legal review | Round 1 Q10 = D |

---

## 5. Open Questions Carried Forward

The pod is signing off knowing these decisions are deferred to later stages. Each is tied to a named revisit point.

| # | Topic | Revisit at | Source |
|---|-------|-----------|--------|
| 1 | Payment integration choice (Stripe Checkout / Elements / Link) | Stage 11 Stack Selection (post-pivot to internal/demo, this is no longer a launch blocker) | PRD § 16 Q1 |
| 2 | Product image quality strategy (carousel + zoom modal vs thumbnails) | Stage 6 Application Design | PRD § 16 Q2 |
| 3 | Shopper onboarding flow (guest chat with upsell vs account-required) | Stage 4 Requirements Analysis | PRD § 16 Q3 |
| 4 | Multi-modal input (photo upload — "find me something like this") | Stage 4 (likely deferred past MVP) | PRD § 16 Q4 |
| 5 | Merchant bulk upload (CSV attachment vs purely conversational) | Stage 4 Requirements Analysis | PRD § 16 Q5 |
| 6 | Async push notifications for merchants (new order / low stock) | Stage 4 Requirements Analysis | PRD § 16 Q6 |
| 7 | Analytics agent — when does it join the lineup? | v1.1 (deferred per PRD § 4 Non-Goals) | PRD § 16 Q7 |
| 8 | Cloud target & lean alternatives | Stage 11 Stack Selection | C2 = C |
| 9 | LLM provider selection | Stage 11 Stack Selection | (implicit) |

---

## 6. Risk Register (carried into all subsequent stages)

| ID | Risk | Severity | Mitigation / Acceptance |
|----|------|----------|-------------------------|
| R1 | Discovery UX in chat is unproven at scale; shoppers may abandon if product discovery feels slower than a traditional grid | Medium | Acceptance: this is exactly the thesis the MVP is validating. Internal-demo scope reduces real exposure. |
| R2 | LLM latency & cost — every interaction touches orchestrator + ≥ 1 agent | Medium-High (cost) | Lean budget makes LLM cost a hard constraint. Stage 11 Stack Selection will pick provider tier; consider caching + smaller models for some agents. |
| R3 | Role confusion — a merchant testing as shopper or vice versa may expect different behaviors | Medium | Orchestrator-layer role gate per PRD § 10. Clear role-switch UI. |
| R4 | Rich-widget complexity — essentially rebuilding UI primitives inside chat | Medium | Use a typed widget contract (PRD § 8); render is structured JSON, not HTML. |
| R5 | **Pivot from external pilot → internal-only** removes the planned validation loop with real shoppers/merchants | Medium-High | Internal pilot users (Codiste team) instrument the same metrics. Revisit external rollout after internal validation. |
| R6 | **Partial accessibility (Level A only)** — *was* "no formal target" at Gate #1; upgraded to Level A at Stage 4 Round 2 C2 = B | Low (in MVP scope) | Level A WCAG 2.2 rules are now blocking at Gate #4; AA-only rules N/A. Trigger to escalate to full AA: external exposure decision. |
| R7 | **No public TOS / Privacy Policy** | Low (in MVP scope) / Critical (if exposed externally) | Hard gate: any external onboarding REQUIRES legal review first. |
| R8 | **Lean budget vs LLM-heavy product** | High | Stage 11 will require explicit cost projection per agent / per message before approving the LLM provider. |

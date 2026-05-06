# Business Requirements Checklist — Greenfield Tier

**Tier**: Greenfield
**Generated**: 2026-05-04T00:04:00Z
**Source**: PRD `sources/ecommerce-ops-hub-prd.md` v0.3 (2026-04-17)

Items marked `[x]` were resolved from the PRD with citation. Items marked `[ ]` are open and will be answered in `business-requirements-followup-questions.md`.

---

## Section A — Problem & Outcome

- [x] **Problem statement** — Shoppers find cluttered storefronts/forms tiresome; merchants waste hours in admin dashboards on operations a sentence could describe. Single conversational surface solves both. *(see PRD § 3 Problem Statement)*
- [x] **Target users / personas** — Two: Shopper persona "Chat-native Chloe" (comfortable with ChatGPT/WhatsApp shopping, prefers natural interaction, trusts AI to surface products) and Merchant persona "Operator Olivia" (DTC brand operator, 2–5 person team, manages from phone). *(see PRD § 5)*
- [x] **Success metrics** — 7 quantitative KPIs at 3 months: shopper message-to-cart ≥ 15%, cart-to-purchase ≥ 40%, merchant onboarding completion ≥ 70%, agent command success rate ≥ 85%, ≤ 6 messages to complete purchase, ≤ 3 messages per merchant CRUD op, ≥ 3 hours saved per week per merchant. *(see PRD § 13)*
- [x] **Out-of-scope items** — Traditional storefront/admin UI, multi-tenant, mobile native app, voice, multi-currency/multi-language, review/analytics/marketing agents (deferred to v1.1+), payment-provider implementation choice (deferred). *(see PRD § 4 Non-Goals)*
- [x] **Business goals** — **Validate the chat-native commerce thesis** — focused MVP to prove that an end-to-end conversational commerce surface (no traditional storefront, no admin UI) can deliver a usable shopping + merchant-ops experience. Revenue is *not* a goal; learning is. Per Round 1 Q1 = A. Per Round 2 C1 = C, the validation is **internal/demo-only** (no external merchants, no real shoppers).

## Section B — Constraints & Context

- [x] **Target platforms** — Responsive Web only (chat at `chat.ourhub.com`). No native mobile app in MVP. *(see PRD § 4 Non-Goals + § 6.1)*
- [x] **Expected scale** — 1,000 concurrent chat sessions in MVP (single-tenant store). First token < 1.5 s; widget render < 3 s. *(see PRD § 9)*
- [x] **Budget range** — **Lean — under $25K** total for build + first 6 months runtime. Operations posture switches from codiste preset to **hybrid lean**: Sentry (free tier) + GitHub Actions retained; Datadog APM dropped in favor of OTel + self-hosted Grafana; cloud target deferred to Stage 11 Stack Selection (likely Hetzner / Vultr / OCI free tier rather than AWS). Per Round 1 Q2 = A; Round 2 C2 = C (hybrid).
- [x] **Timeline** — 17 weeks across M1–M7: M1 Foundations (W 1–3), M2 Chat Shell (W 4–6), M3 Merchant Path (W 7–9), M4 Shopper Path (W 10–12), M5 Polish & Widgets (W 13–14), M6 Closed Beta (W 15–16), M7 Public Launch (W 17). *(see PRD § 14)*
- [x] **Stakeholders** — Tech Lead = Chintan Bhai; Dev = Varshil; Stakeholder = none (out-of-band). *(see `pod.md`)*
- [x] **Regulatory / compliance** — GDPR-ready (data export + anonymization required). PCI offloaded entirely to payment provider (no card data on platform). Audit log required for all writes. *(see PRD § 9 + § 11)*
- [x] **External integrations** — Payment provider (TBD — Stripe Checkout vs. Elements vs. hosted link, deferred decision per PRD § 16 Q1). LLM provider for orchestrator + 5 agents. Email/SMS notifications implied for order confirmations (not explicitly listed; will revisit). *(see PRD § 7.5, § 9, § 10, § 16)*
- [x] **Data classification** — **Strict**: PII encrypted at rest with separate KMS key; conversation transcripts treated as PII; audit log immutable (append-only); merchant business data segregated from shopper PII at storage layer. Per Round 1 Q3 = A.
- [x] **Launch markets / locales** — **India — English (en-IN)**. Indian DPDP Act 2023 applies (operative from Q4 2025). No other markets in MVP. Per Round 1 Q4 = A.
- [x] **Monetization model** — **Internal / demo only** (Round 2 C1 = C). Codiste runs the only store as a demo / R&D installation. No external merchants onboarded, no real shoppers, no live payments in MVP. PRD § 14 M6 *Closed Beta with 5 merchants + real shoppers* is **out of scope** as a result. (Round 1 Q5 = A had said "free pilot with external DTC merchant"; reverted to internal-only at C1 to keep Q10 = D viable.)

## Section C — AI-product specifics

- [x] **AI/ML usage scope** — LLM-heavy. Orchestrator + 5 agents are LLM functions with scoped tools; semantic product search uses an embedding-based retriever (vector store). No first-party model training in MVP. *(see PRD § 7, § 10)*
- [x] **Data retention policy** — **Conservative**: PII 12 months after last activity; conversation transcripts 6 months; audit log 1 year; agent traces 30 days; embeddings rebuilt on schedule (no long-term store). Per Round 1 Q6 = A.
- [x] **Brand assets availability** — **Ready** — logo, color palette, fonts, and tone guide already exist; will be supplied in Stage 2 Design Intake (Figma MCP or screenshots). Per Round 1 Q7 = A.
- [x] **Existing IP / open-source dependencies** — **None to inherit; standard MIT/Apache OSS only**. No copyleft (AGPL/GPL) anywhere. No pre-existing internal helpers to reuse. Stage 11 Stack Selection will hard-filter dependencies on this rule. Per Round 1 Q8 = A.
- [x] **Accessibility commitment** — **WCAG 2.2 — Level A only** (partial enforcement). Updated at Stage 4 Round 2 C2 = B (supersedes BR Round 2 C3 = A). The accessibility extension full rule file is loaded; only Level A rules block at Stage 13 Gate #4. AA-only rules are marked N/A with rationale.
- [x] **Legal review status** — **Internal-only / no public TOS** — applies because Q5 was reverted to Internal/demo at Round 2 C1 = C. No external user signups → no TOS or Privacy Policy required for MVP. **Trigger to revisit**: any decision to onboard an external merchant or real shopper REQUIRES legal review (drafted TOS + Privacy Policy + DPDP-compliant data-export/anonymization endpoints) BEFORE go-live. Per Round 1 Q10 = D.

---

## Modification Log
| Timestamp (ISO) | Editor | Change |
| 2026-05-04T00:04:00Z | AI-DLC | Initial generation. 11/20 items pre-resolved from PRD; 9 items pending in followup file. |
| 2026-05-04T00:06:00Z | AI-DLC | Round 1 + Round 2 answers applied. All 20 items resolved (19 [x], 1 [~] N/A for accessibility — risk-accepted-by-pod). Pivoted Monetization to Internal/demo per C1 = C. |
| 2026-05-04T00:14:00Z | AI-DLC | Stage 4 Round 2 C2 = B upgraded Accessibility from "[~] N/A risk-accepted" to "[x] Level A enforced". 20/20 [x]. R6 in BR § 6 also rewritten. Gate #1 stays signed (commitment increased, not decreased). |

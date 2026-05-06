# Business Requirements — Follow-up Questions

**Round**: 1
**Generated**: 2026-05-04T00:04:00Z
**Tier**: Greenfield
**Open items**: 9 (the PRD already covered 11/20)

Please fill in the `[Answer]:` tag for each question, save the file, and reply "done". You can mark any item N/A only with a specific reason — vague answers ("we'll figure it out") will block Gate #1.

---

## Q1 — Business goals (Section A)

What's the primary business intent driving this build? (Pick the closest; multi-select OK.)

A) **Validate the chat-native commerce thesis** — a focused MVP to prove shoppers will buy via chat
B) **Land a flagship customer** — one named DTC merchant signed on as the single tenant
C) **Internal R&D / IP build** — Codiste owns the platform; commercial model decided later
D) **Investor demo / pitch artifact** — must look launchable and tell a story
E) **Combination** — please describe in `[Answer]:`
X) Other — describe in `[Answer]:`

[Answer]:A

---

## Q2 — Budget order of magnitude (Section B)

Roughly what budget envelope are we operating in for build + first 6 months of runtime (LLM tokens, hosting, observability, etc.)? Pick the bracket closest.

A) Lean   — under $25K (self-hosted LLM where possible, minimal SaaS)
B) Modest — $25K–$75K (cloud LLM API, hosted DB, basic observability SaaS)
C) Standard — $75K–$200K (full cloud stack, Datadog/Sentry, Stripe live, etc.)
D) Generous — $200K+ (no constraint expected on tooling)
X) Other — describe

[Answer]:A

---

## Q3 — Data classification (Section B)

How should we handle the four data classes the system will hold? Pick the policy that matches your intent.

A) **Strict** — PII encrypted at rest with separate KMS key; transcripts treated as PII; audit log immutable; merchant business data segregated
B) **Standard** — PII encrypted at rest using cloud-default KMS; transcripts retained as ordinary application data; standard audit log; merchant data treated like any other tenant data
C) **Light** — encryption at rest by default, no special handling beyond GDPR export/anonymization
X) Other — describe

[Answer]: A

---

## Q4 — Launch market & locale (Section B)

PRD rules out multi-language for MVP. What's the **single** market + language for first launch?

A) India — English (en-IN)
B) United States — English (en-US)
C) European Union — English (en-GB) (note: GDPR is mandatory regardless)
D) United Arab Emirates / GCC — English (en-AE)
E) Other — specify country + language

[Answer]: A

---

## Q5 — Monetization model for the platform (Section A/B)

Per the PRD this is single-tenant — "we host one store." What's the commercial relationship around that store?

A) **Pilot — free** — one DTC merchant gets it free in exchange for feedback and a logo
B) **Paid pilot** — flat monthly fee or revenue share with the pilot merchant
C) **Internal / demo** — Codiste runs the only store; no external customer in MVP
D) **Sold as a fixed engagement** — built-and-handed-over to a client
X) Other — describe

[Answer]:A

---

## Q6 — Data retention policy (Section C)

How long do we retain each data class? (Pick a row or describe a custom policy.)

A) **Conservative**: PII 12 months after last activity; transcripts 6 months; audit log 1 year; agent traces 30 days; embeddings rebuild on schedule (no long-term store)
B) **Standard**: PII for life of account + 90 days post-deletion; transcripts 12 months; audit log 2 years; agent traces 90 days; embeddings rebuilt monthly
C) **Compliance-leaning**: PII for life of account + 30 days; transcripts 30 days; audit log 7 years (regulatory); agent traces 30 days; embeddings ephemeral (in-request only)
X) Other — describe

[Answer]:A

---

## Q7 — Brand assets (Section C)

What's the state of brand assets for the chat UI and widgets?

A) **Ready** — logo, color palette, fonts, tone guide already exist (will be supplied in Stage 2 Design Intake)
B) **In progress** — partial assets; design team is finalizing during M1–M2
C) **Greenfield design** — nothing exists; AI-DLC should produce neutral/placeholder design tokens; rebrand later
X) Other — describe

[Answer]:A

---

## Q8 — Existing IP / open-source dependencies (Section C)

Anything specific to inherit, avoid, or be aware of?

A) **None** — start clean; standard MIT/Apache OSS only; no copyleft (AGPL/GPL)
B) **Existing internal libraries** — Codiste has internal helpers we should reuse (please list in [Answer]:)
C) **License caution** — specific OSS to avoid (please list)
D) **Inherit a starter** — a specific chat-UI/agent template we should fork (please name + link)
X) Other — describe

[Answer]:A

---

## Q9 — Accessibility commitment (Section C)

What's the accessibility target?

A) **WCAG 2.2 AA** (recommended for consumer products with EU exposure)
B) WCAG 2.1 AA (older spec, common minimum)
C) WCAG 2.2 AAA (very few products meet this; high cost)
D) **No formal target** — best-effort only (note: this can become a legal exposure if launching in EU/US public sector)
X) Other — describe

[Answer]: D

---

## Q10 — Legal review status (Section C)

What's the state of privacy policy and terms-of-service documents?

A) **Drafted and reviewed** by legal — ready to publish
B) **Drafting** — legal engaged, target draft by M5
C) **Not started** — will use a SaaS template (e.g., iubenda, Termly) closer to launch
D) **Internal-only / no public TOS** — applies only if Q5 = "Internal / demo"
X) Other — describe

[Answer]:D

---

## Optional — addressing the PRD's own open questions (§ 16)

The PRD lists 7 open questions in § 16. They will be revisited later in Requirements Analysis (Stage 4) and Application Design (Stage 6) — but if you have a directional answer now, please paste below. Each is optional for Gate #1.

| PRD § 16 Q | Topic | Your direction (optional) |
|-----------|-------|---------------------------|
| 1 | Payment integration choice (Stripe Checkout / Elements / Link) | [Answer]: |
| 2 | Product image quality (carousel + zoom modal vs thumbnails) | [Answer]: |
| 3 | Shopper onboarding (guest chat with upsell vs account-required) | [Answer]: |
| 4 | Multi-modal input (photo upload "find me something like this") | [Answer]: |
| 5 | Merchant bulk upload (CSV attachment vs purely conversational) | [Answer]: |
| 6 | Async push notifications for merchants (new order, low stock) | [Answer]: |
| 7 | Analytics agent — when does it join? | [Answer]: |

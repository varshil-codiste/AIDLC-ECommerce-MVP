# Requirements Analysis — Verification Questions

**Stage**: 4 — Requirements Analysis
**Tier**: Greenfield → **Comprehensive depth** (also escalated: AI/ML-heavy + LLM-cost risk)
**Generated**: 2026-05-04T00:11:30Z

This file gathers the four extension opt-ins (mandatory) plus targeted clarifying questions on areas the BR did not nail down.

Recommendations are pre-stated based on the BR + PRD. You can override any of them.

---

# Part 1 — Extension Opt-Ins (mandatory)

These determine which rule sets become **blocking constraints** at every subsequent stage. Skipping at this point is permanent for the MVP — the pod can revisit later via `common/workflow-changes.md`.

---

## Q1 — Security Baseline Extension

Should the Security Baseline rules (15 rules, OWASP-aligned) be enforced for this project?

A) **Yes** — enforce all SECURITY rules as blocking constraints (Recommended for production-grade deliverables) ← **AI recommends A**: BR Section B.8 set "Strict" data classification with separate KMS, immutable audit log, PII encryption — these are exactly the SECURITY-* rules
B) No — skip all SECURITY rules (suitable for proof-of-concept, internal-only tools, or experimental work)
X) Other

[Answer]:B

---

## Q2 — AI/ML Lifecycle Extension

Does this project use LLMs, embeddings, RAG, fine-tuning, or any ML model?

A) **Yes** — full enforcement (prompt versioning, eval suites, RAG quality, hallucination guardrails, PII handling) ← **AI recommends A**: PRD § 7 + § 10 puts LLMs at orchestrator + 5 agents, plus embedding-based semantic search. Without these rules the project will silently accumulate tech debt around prompt management and eval infrastructure.
B) Partial — only LLM calls without RAG / fine-tuning (enforce prompt versioning + eval + hallucination guardrails; skip RAG-specific rules)
C) No — this project has no AI/ML component
X) Other

[Answer]:A

---

## Q3 — Property-Based Testing Extension

Should Property-Based Testing (PBT) rules be enforced for this project?

A) Yes — full enforcement (10 rules) for any project with business logic, data transformations, serialization, or stateful components
B) **Partial** — enforce PBT only for pure functions and serialization round-trips ← **AI recommends B**: cart math, order state machines, role-gate logic, and widget JSON serialization all benefit from PBT, but the agent layer is LLM-orchestrated and harder to property-test. Lean budget makes "Partial" the right tradeoff.
C) No — skip all PBT rules (suitable for simple CRUD, UI-only, or thin integration layers)
X) Other

[Answer]:B

---

## Q4 — Accessibility Extension (WCAG 2.2 AA)

Does this project have a UI surface (Web or Mobile) that should comply with WCAG 2.2 AA?

A) Yes — enforce all WCAG 2.2 AA rules
B) Partial — enforce only Level A rules
C) **No** — this project has no UI OR a11y is explicitly out of scope ← **AI recommends C**: this matches your earlier decision in BR Round 2 C3 = A (risk explicitly accepted by pod for MVP). Choosing A or B here would re-open that decision.
X) Other

[Answer]:B

---

# Part 2 — Functional & NFR Clarifications

The BR is comprehensive but six concrete decisions need answers before Stage 6 (Application Design) can produce a sound architecture.

---

## Q5 — Authentication model

PRD § 6.1 says "Logs in → system detects role" but does not specify how login works. Pick one (this affects schema, the Auth UoW, security baseline rules, and the pilot-user setup):

A) **Email + password (argon2id hash)** — simplest; cheapest; matches codiste convention. Good for internal/demo. ← **AI recommends A**
B) Passwordless (magic link via email) — friendlier UX; needs reliable email delivery (cost + complexity)
C) Social login (Google OAuth) — fastest to build; avoids password storage; depends on Google availability
D) JWT with shared bootstrap token (internal/demo only — every pilot user gets a token; no signup flow)
X) Other

[Answer]:A

---

## Q6 — Pilot user volume (sets the *real* scale target)

PRD § 9 says "1,000 concurrent chat sessions" — that's the design ceiling. Internal/demo MVP scale is much smaller. How many actual pilot users will we onboard during validation?

A) **5–10** users (Codiste team only) ← **AI recommends A**: matches "internal/demo" intent and aligns with lean budget
B) 10–25 users (Codiste + invited friends/family)
C) 25–50 users (Codiste + extended pilot list)
D) 50+ users (a real closed-beta despite the C1 = C decision — flag this if you pick D)
X) Other (specify number)

[Answer]:A

---

## Q7 — Conversation persistence boundary

PRD § 7.2 says "Cart persists across sessions per shopper." What about chat **transcripts**?

A) **Persist per user, indefinitely until retention cutoff (6 months per BR § 2.11)** — required for "show me my last order" / "pick up where we left off" UX ← **AI recommends A**
B) Persist only the active session; clear on logout
C) Persist for an inactivity window (e.g., 24 h) then archive
X) Other

[Answer]:A

---

## Q8 — Real-time delivery mechanism for streaming chat

PRD § 9 sets first-token latency < 1.5 s. The transport between server and chat UI matters.

A) **Server-Sent Events (SSE)** ← **AI recommends A**: simpler than WebSockets, fits HTTP + load-balancer paths, sufficient for one-way streaming. Matches typical LLM-app pattern.
B) WebSockets (full-duplex; required only if widgets need server-pushed updates outside a chat-message turn — currently not in PRD)
C) Long-polling (fallback only)
X) Other

[Answer]:A

---

## Q9 — Push notifications for merchants (PRD § 16 Q6)

PRD § 16 left this open. Worth resolving now because it affects M3 scope and a notifications service decision:

A) **Yes — in-app only** — toast / inbox-style notifications inside the chat UI for new orders / low stock; no external email/SMS in MVP ← **AI recommends A**: lean-budget friendly; no external delivery service needed
B) Yes — in-app + email — adds an SMTP / SES dependency
C) No — defer to v1.1; merchants poll via "what needs my attention?" message instead
X) Other

[Answer]:A

---

## Q10 — Bulk merchant uploads (PRD § 16 Q5)

PRD § 16 left this open:

A) **Conversational only** — "Add 50 products with these names…" merchant pastes a list, agent confirms ← **AI recommends A**: fits the chat-native thesis; no file-upload UI needed
B) CSV upload via chat attachment — adds a file-upload widget + parsing pipeline
C) Both — conversational for ≤ 10 items, CSV for more
X) Other

[Answer]:A

---

# Part 3 — Risk acknowledgments to confirm

These are not new questions — just re-confirmations of items already accepted in BR Round 2. Tick the box for each:

- [ ] **R6 confirmed** — No formal a11y target; revisit before any external launch
- [ ] **R7 confirmed** — No public TOS/Privacy Policy; revisit before onboarding any external user
- [ ] **R5 confirmed** — PRD § 14 M6 (Closed Beta with 5 external merchants) is CUT from MVP scope; replaced by internal-pilot demo

---

## Once all answers are filled

Reply "done". I'll:
1. Record extension opt-ins in `aidlc-state.md` `## Extension Configuration`
2. Load any opted-in extension full-rule file
3. Synthesize `requirements/requirements.md` (canonical Greenfield-comprehensive functional + NFR doc)
4. Then move to **Stage 5 (User Stories)** or directly to **Stage 6 (Application Design)** based on what the requirements look like

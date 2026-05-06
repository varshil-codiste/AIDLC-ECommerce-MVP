# Requirements Analysis — Clarification Round 2

**Round**: 2
**Generated**: 2026-05-04T00:13:00Z
**Reason**: Two contradictions detected between Round 1 answers and prior BR commitments. Risk confirmations also still unticked.

---

## C1 — HARD CONTRADICTION: Q1 = B (no security) vs BR § 2.8 "Strict" data classification

You answered **Q1 = B** — *Skip all SECURITY rules*.

But BR Round 1 Q3 = A pinned the data-classification policy to **Strict**:
- PII encrypted at rest with separate KMS key
- Conversation transcripts treated as PII
- Audit log **immutable / append-only**
- Merchant business data segregated at storage layer from shopper PII

That set of constraints **is** the Security Baseline rule set (rules SECURITY-01 through SECURITY-15). Without the extension enabled, those rules become unenforced suggestions — Stage 13 Code Review will not gate a BLOCK verdict on missing PII encryption, missing KMS key separation, mutable audit logs, or PII bleed across storage.

You can't keep "Strict data classification" *and* skip security enforcement. Pick one to resolve:

A) **Switch Q1 to A — enforce Security Baseline** (recommended; this is what "Strict" actually means in operational terms)
B) **Switch BR § 2.8 to "Light" or "Standard"** — and re-record `business-requirements.md` § 2.8 + the BR checklist accordingly. (This requires regenerating the BR signoff — high cost — and the audit trail will note the data-classification downgrade.)
C) **Custom partial** — keep "Strict" but enforce only a subset of SECURITY rules. Specify which subset (e.g., "PII-handling rules only; skip dependency-scan rules"). The AI will load the full rule file and mark the unselected rules N/A with rationale.
X) Other

[Answer]: A

---

## C2 — HARD CONTRADICTION: Q4 = B (Level A a11y) vs BR Round 2 C3 = A (risk-accepted, no a11y target)

You answered **Q4 = B** — *enforce Level A WCAG 2.2 rules*.

But the pod **explicitly accepted the no-a11y-target risk** in BR Round 2 C3 = A. The signed Gate #1 file lists this as risk R6 — "No formal accessibility target. Best-effort only. Risk explicitly accepted by pod."

You're now opting into Level A enforcement, which actually changes:
- Gate #4 will BLOCK on Level-A non-compliance (focus management, keyboard navigation, contrast on widgets, ARIA labelling for streaming chat)
- The accessibility extension full rule file will load and apply at Functional Design + Code Generation + Code Review + Build & Test + Production Readiness
- Risk R6 in `business-requirements.md` § 6 needs to be **rewritten** (the "risk accepted" framing no longer holds)

Pick one to resolve:

A) **Stick with the BR — switch Q4 to C** (no a11y enforcement). This honors the Round 2 C3 decision and matches "internal/demo only".
B) **Stick with Q4 = B** — opt into Level A — and accept that BR § 3.4 (Accessibility) and § 6 R6 must be **rewritten** to reflect the pivot. (I'll regenerate them; Gate #1 stays signed because the pod is *increasing* the commitment, not loosening it — but the change is logged.)
C) **Stick with Q4 = B AND escalate to Full AA** — go all the way (overkill for internal/demo MVP per the budget; only pick this if you've reconsidered the whole posture)
X) Other

[Answer]:B

---

## C3 — Risk confirmations are still unticked

The three risk re-confirmation boxes in Round 1 were all left as `[ ]`:

- R6 — No formal a11y target  ← also affected by C2 above
- R7 — No public TOS / Privacy Policy
- R5 — PRD § 14 M6 closed beta CUT from MVP

These are **not new commitments** — they were already accepted by signing Gate #1. Re-confirming here is a sanity check that nothing has changed since signing. Please tick all three:

- [x] R5 still confirmed — M6 closed beta cut from MVP
- [x] R6 still confirmed — *(only valid if C2 = A. If C2 = B or C, R6 must be rewritten and this box left unticked.)*
- [x] R7 still confirmed — no public TOS / Privacy Policy

---

## Once C1 and C2 are answered and the applicable boxes ticked

Reply "done". I'll:
1. Update `aidlc-state.md` § Extension Configuration with final opt-in choices
2. If C2 = B, regenerate `business-requirements.md` § 3.4 + § 6 R6 (Gate #1 stays signed; change logged in audit.md)
3. Load opted-in extension rule files
4. Synthesize `requirements/requirements.md`

# User Stories — Planning Questions

**Stage**: 5 — User Stories (Part 1: Planning)
**Tier**: Greenfield → Comprehensive
**Generated**: 2026-05-04T00:15:00Z

Stage 5 has two parts. **Part 1 (this file)** locks the structural choices for the story generation; **Part 2** generates `personas.md` + `user-stories.md` with acceptance criteria. Five quick questions — recommendations pre-stated.

---

## Q1 — Persona inventory

PRD § 5 names two personas. Should we use those, or expand?

A) **Two personas** — `Shopper (Chat-native Chloe)` + `Merchant (Operator Olivia)`. Internal pilot users play one of these two roles; no separate "Pilot" persona. ← **AI recommends A**: cleanest mapping; pilot is a *deployment context*, not a persona.
B) Three personas — add `Internal Pilot Tester` as a distinct persona to capture instrumentation/feedback stories
C) Other

[Answer]:A

---

## Q2 — Story grouping

How should stories be organized in `user-stories.md`?

A) **By persona, then by journey** — Shopper (discover → cart → checkout → track → return) then Merchant (onboard → catalog → fulfill → customers → notifications). Easy for the pod to read sequentially. ← **AI recommends A**
B) By feature — Auth, Chat surface, Product Agent, Cart Agent, etc.
C) By milestone — M1, M2, M3 stories grouped per the PRD § 14 timeline
X) Other

[Answer]:A

---

## Q3 — Acceptance criteria style

How should each story's acceptance criteria be expressed?

A) **Given-When-Then** (Gherkin-flavored) — *Given the shopper is logged in, When they say "show me running shoes under $100", Then a `product_carousel` widget is rendered with ≤ 8 items and prices ≤ $100*. Maps cleanly to the future test suite. ← **AI recommends A**
B) Bullet-list of conditions — simpler but less testable
C) Behavior table — overkill for MVP scale
X) Other

[Answer]:A

---

## Q4 — Estimation style

How should story effort be sized? (Affects sprint planning at Stage 7.)

A) **T-shirt sizes** — XS / S / M / L / XL — fast, low-overhead, fits a 2-person pod ← **AI recommends A**
B) Fibonacci story points — 1 / 2 / 3 / 5 / 8 / 13 — more granular but higher overhead
C) Time estimate (person-hours) — most tangible but invites endless debate
D) None — story counts only
X) Other

[Answer]:A

---

## Q5 — Story coverage scope

The PRD § 12 already lists 12 stories. Stage 4 introduced more requirements (in-app notifications, internal-pilot auth, role-gate edge cases, accessibility Level A, etc.). What scope should `user-stories.md` cover?

A) **PRD § 12 stories + new Stage-4 requirements** — net result ~25–30 stories covering everything in `requirements.md`. ← **AI recommends A**: a 1:1 traceability matrix from requirements → stories is the core of Greenfield-comprehensive depth.
B) PRD § 12 stories only — leaner; relies on `requirements.md` for the new items (less ceremony, weaker traceability)
C) Full enumeration including all 6 edge cases + 4 error scenarios from `requirements.md` § 3.2/3.3 — strongest traceability; ~40+ stories
X) Other

[Answer]:A

---

## Once filled

Reply "done". I'll:
1. Generate `story-generation-plan.md` (the populated plan file)
2. Wait for an explicit "approved" before Part 2 begins
3. Part 2 generates `personas.md` + `user-stories.md` (~25–30 stories with AC + sizes per choices above)

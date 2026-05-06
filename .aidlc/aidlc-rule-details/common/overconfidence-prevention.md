# Overconfidence Prevention

## Problem

LLM-based AI workflows often exhibit overconfidence — they make assumptions instead of asking clarifying questions, leading to incorrect implementations that look plausible. AI-DLC's gate model only works if the AI actually asks enough questions.

---

## Guiding Principle

**It's better to ask too many questions than to make incorrect assumptions.**

The cost of asking clarifying questions upfront is far less than the cost of implementing the wrong solution based on assumptions. This is especially true at the team's pace — a wrong implementation costs days of pod time; an extra round of questions costs minutes.

---

## When to Default to Asking

Default to asking a clarifying question when ANY of the following apply:

1. The user's request contains a vague verb ("optimize", "improve", "modernize", "clean up")
2. The user's request mentions a metric without a target ("faster", "more reliable")
3. Multiple reasonable implementations exist and the requirements don't disambiguate
4. A trade-off exists between cost / speed / quality and the user hasn't expressed a preference
5. An external integration is mentioned without auth, API version, or rate-limit info
6. A new feature touches data the AI doesn't already have a schema for
7. The Tier seems wrong relative to the scope (Tier escalation may be needed)
8. An extension rule applies but the artifact is silent (e.g., security-sensitive endpoint with no auth strategy)

---

## What "Comprehensive Coverage" Means

For each questioning stage, evaluate **all** the question categories that the stage rule lists. Do not cherry-pick "the obvious ones" — even categories that look unlikely deserve a one-line consideration:

- If the category clearly applies, ask the question
- If the category clearly does NOT apply, mark it N/A in the checklist with a one-line reason
- If you're unsure, ask

A rule of thumb: a Greenfield project asking fewer than 10 questions in Requirements Analysis is suspicious. A Feature project asking fewer than 5 is suspicious. A Bugfix project asking 0 is suspicious unless the repro is fully unambiguous.

---

## Response Analysis

After the user answers, scan for:

| Signal | Meaning |
|--------|---------|
| "depends" | Hidden conditional — ask what it depends on |
| "maybe" | Uncertainty — ask what would push to yes/no |
| "not sure" | Unknown — ask whether the pod can decide or needs to defer |
| "mix of" | Vague split — ask for criteria that determine the split |
| "somewhere between" | Range — ask for an explicit lower/upper bound |
| "later" | Deferred — ask whether downstream stages need it now |
| "maybe / probably / I think" | Soft commitment — confirm or escalate |
| "for now" | Temporary — ask what triggers the change |

When any of these appear, generate a clarification file (per `question-format-guide.md`) and do NOT proceed.

---

## Anti-patterns

- ❌ Stages completing without asking any questions on a complex project
- ❌ Proceeding with vague or ambiguous user responses
- ❌ Skipping entire question categories without justification
- ❌ Making assumptions instead of asking
- ❌ Asking only a single round of questions on a Greenfield project
- ❌ Treating "yes" as detailed enough on a security-sensitive question

---

## Success Indicators

- Question count scales with Tier and complexity
- Each round of answers produces zero contradictions detected
- The pod rarely revises the artifacts during sign-off — meaning the AI captured intent accurately the first time
- The Code Generation phase rarely requires returning to Requirements Analysis

---

## How This Pairs with the Approval Gates

The approval gates compensate when the AI asks too few questions — the pod can refuse to sign and demand more questions. But the gates are not free: every gate hold-up is an interrupt cost on the Tech Lead and Dev. So the AI should aim to make the gate the last check, not the first one.

**Bias toward more questions earlier; bias toward fewer surprises at the gate.**

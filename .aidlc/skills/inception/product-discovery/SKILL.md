---
name: product-discovery
description: |
  Use when ingesting business requirements at AI-DLC Stage 1 (Business Requirements Intake) to surface unstated assumptions, missing success metrics, hidden out-of-scope items, and stakeholder gaps. Reads the user's raw input (text, PDF, Doc, ticket) plus the active Tier from aidlc-state.md, and produces a discovery-questions.md and a stakeholder-map.md that fill gaps before the BR checklist runs. In scope only when Tier is Greenfield or Feature; skip for Bugfix.
aidlc:
  sensitive: false
---

# Product Discovery

## When to Use (AI-DLC context)

This skill fires at **Stage 1 — Business Requirements Intake** (`../../aidlc-rule-details/inception/business-requirements.md`), specifically at Step 4 of that stage's loop. After the Tier is detected and sources are ingested, but BEFORE the tiered checklist runs, this skill reads the ingested sources and surfaces:

- Unstated assumptions ("we'll figure out auth later" — the AI flags this)
- Missing or hand-wavy success metrics ("get more users" — flagged for quantification)
- Implicit out-of-scope items ("v1 doesn't support enterprise SSO" if mentioned anywhere)
- Stakeholder gaps (who is missing from `pod.md`?)

It writes its findings to `aidlc-docs/inception/business-requirements/discovery-questions.md` so the pod can answer them as additional clarifying-question rounds. It also writes `aidlc-docs/inception/business-requirements/stakeholder-map.md` listing every named or implied stakeholder and what they need to approve.

## What It Does

Reads `business-requirements/sources/*.md` plus `tier.md` and produces:
1. A list of **gap questions** in `discovery-questions.md` (multiple-choice format per `common/question-format-guide.md`)
2. A **stakeholder map** identifying decision-makers, reviewers, and out-of-band influencers
3. A short **assumptions log** capturing every assumption the AI made when interpreting the input

## Inputs

- `aidlc-docs/inception/business-requirements/sources/*.md` (ingested BR sources)
- `aidlc-docs/inception/business-requirements/tier.md`
- `aidlc-docs/aidlc-state.md` (for Tier and stack context)

## Outputs

- `aidlc-docs/inception/business-requirements/discovery-questions.md`
- `aidlc-docs/inception/business-requirements/stakeholder-map.md`
- `aidlc-docs/inception/business-requirements/assumptions-log.md`

## Governance

- **Free-roam invocation**: invocation appended to `aidlc-docs/audit.md` per `skill-policy.md` § 1
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature (skipped for Bugfix — the focused checklist is enough)

## Team Conventions Applied

- Question file uses the team's mandatory format: A/B/C/D/E + `X) Other` + `[Answer]:` tags (per `common/question-format-guide.md`)
- Stakeholder map uses the the `pod.md` schema (Tech Lead, Dev, out-of-band stakeholders); proposes additions but never overwrites pod.md
- Every assumption logged with a citation into the source it derived from
- Output adapts to Tier: Greenfield gets ~10 gap questions, Feature gets ~5

## Tier-Specific Behavior

- **Greenfield**: produce a thorough sweep — typically 8–12 gap questions across business / technical / stakeholder / scope
- **Feature**: focused on the feature's scope only — 3–6 gap questions
- **Bugfix**: skip entirely (return early with a one-line note in audit.md)

## See Also

- Upstream skill: `./upstream/SKILL.md` (vendored from Dean Peters' product-discovery skill bundle)
- AI-DLC stage rule: `../../aidlc-rule-details/inception/business-requirements.md`
- Question format: `../../aidlc-rule-details/common/question-format-guide.md`
- Compliance hooks: none (extensions don't apply at this stage)

## Trigger-test prompts (for the eval harness)

1. "Using AI-DLC, build a customer support summarizer SaaS." (should trigger at Stage 1 after sources ingested)
2. "Using AI-DLC, here's the PDF brief for our new mobile shopping app." (should trigger after PDF is ingested)
3. "What clarifying questions should I ask before approving this BR?" (should trigger if invoked at Stage 1)
4. "Using AI-DLC, fix the typo on the homepage." (should NOT trigger — Bugfix Tier)
5. "Run the lint check on this Python file." (should NOT trigger — wrong stage entirely)

---
name: invest-story-writer
description: |
  Use when converting AI-DLC requirements into INVEST-shaped user stories at Stage 5 (User Stories). Reads requirements.md, personas.md (if it exists), and the active Tier; produces stories.md and personas.md (if missing) with stories that pass INVEST checks (Independent, Negotiable, Valuable, Estimable, Small, Testable). For full-stack projects, every story carries cross-stack notes (FE / BE / Mobile breakdown). Auto-skips on Bugfix Tier where stories aren't required.
aidlc:
  sensitive: false
---

# INVEST Story Writer

## When to Use (AI-DLC context)

This skill fires at **Stage 5 — User Stories** (`../../aidlc-rule-details/inception/user-stories.md`), Part 2 — Generation. The stage rule already defines the two-part Plan → Generate flow; this skill executes Part 2 once the planning answers exist.

The skill reads `requirements.md` and the answers in `story-planning-questions.md`, then produces stories that satisfy the INVEST criteria and follow the team's cross-stack-notes convention.

## What It Does

1. Identifies personas from requirements (or reads the Stage-5 planning answers if pod has named them explicitly)
2. Groups requirements by persona × user journey
3. Drafts user stories with format: "As a `<persona>`, I want `<action>`, so that `<benefit>`."
4. Writes acceptance criteria using the style chosen at planning time (Given-When-Then / bullet list / behavior table)
5. Estimates relative effort (XS / S / M / L / XL — fibonacci-ish)
6. Adds **cross-stack notes** when the project is full-stack (FE / BE / Mobile breakdown per story)
7. Runs INVEST self-check on each story; flags violations for the pod to revise

## Inputs

- `aidlc-docs/inception/requirements/requirements.md`
- `aidlc-docs/inception/user-stories/story-planning-questions.md` (Part 1 answers)
- `aidlc-docs/inception/user-stories/story-generation-plan.md`
- `aidlc-docs/aidlc-state.md` (for Tier and detected stacks)

## Outputs

- `aidlc-docs/inception/user-stories/personas.md` (created or updated)
- `aidlc-docs/inception/user-stories/stories.md`
- `aidlc-docs/inception/user-stories/story-map.md` (optional — generated on Comprehensive depth only, per Tier)

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature (skipped at Bugfix per `../../aidlc-rule-details/inception/user-stories.md` § When to Execute)

## Team Conventions Applied

- **Specific personas, not "as a user"**: skill rejects generic "user" personas and prompts for a concrete role (Marketer, Anonymous Visitor, Admin, etc.)
- **Cross-stack breakdown** on every full-stack story: FE component touched, BE endpoint, Mobile screen — under a `## Cross-stack notes` heading
- **Maps to requirements** every story explicitly references the FR-XXX / NFR-XXX IDs it implements (traceability)
- **INVEST self-check** runs before output is finalized; violations surfaced as a `## INVEST findings` section the pod must resolve
- **Tier-1 / Tier-2 / Tier-3** ranking on every story (MVP critical / important / nice-to-have)
- **Effort estimation in t-shirt sizes** (XS/S/M/L/XL) — never raw story points, never hours

## Tier-Specific Behavior

- **Greenfield**: produce full persona set + comprehensive stories + story-map.md visualization
- **Feature**: focus on personas affected by the feature; minimal new persona authoring; story count scoped to the feature
- **Bugfix**: skip entirely (per stage rule)

## INVEST self-check details

For each story the skill verifies:

| Criterion | Pass condition |
|-----------|----------------|
| Independent | No story references another story by ID in its acceptance criteria |
| Negotiable | Story isn't over-specified to a single implementation |
| Valuable | "so that …" clause names a stakeholder benefit (not a tech outcome) |
| Estimable | Effort field is set |
| Small | Effort ≤ L; XL stories must be split (skill flags and proposes a split) |
| Testable | Each acceptance criterion is binary (verifiable yes/no) |

Violations are reported in `stories.md` § "INVEST findings" — the pod resolves before approving the stage.

## See Also

- Upstream skill: `./upstream/README.md` (vendored from Dean Peters product/user-stories bundle)
- AI-DLC stage rule: `../../aidlc-rule-details/inception/user-stories.md`
- Tier behavior: `../../aidlc-rule-details/common/tiered-mode.md`
- Compliance hooks: extensions/accessibility (when enabled, stories with UI elements get a11y acceptance criteria added)

## Trigger-test prompts

1. "Using AI-DLC, generate user stories from the requirements." (should trigger Stage 5)
2. "Create INVEST stories for our greenfield SaaS." (should trigger)
3. "Convert FR-001 through FR-014 into stories with cross-stack notes." (should trigger)
4. "Fix the typo in stories.md." (should NOT trigger — that's a bugfix on the artifact, not story authoring)
5. "Run the property-based test suite." (should NOT trigger — wrong stage)

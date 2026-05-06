# User Stories

**Stage**: 5 (conditional)
**Purpose**: Translate requirements into INVEST-shaped user stories with acceptance criteria. Two parts: **Story Planning → Story Generation**.

**Skills invoked at this stage**: `invest-story-writer` (Greenfield + Feature Tiers) — runs at Part 2 (Story Generation) once planning answers are in. Performs INVEST self-check, cross-stack notes (FE/BE/Mobile), Tier-1/2/3 ranking. See `.aidlc/skills/inception/invest-story-writer/SKILL.md`.

---

## When to Execute

**Execute IF** (any):
- New user-facing features or workflows
- Multi-persona system
- Customer-facing API or service changes
- Cross-functional team collaboration required
- Greenfield Tier (default execute)
- Feature Tier with user-visible impact

**Skip IF**:
- Bugfix Tier with no user-visible behavior change (mark `[~] N/A`)
- Pure infrastructure / build / tooling work
- Internal refactor with no behavior change

When unsure, default to executing — team-pace iteration benefits from stories more than it suffers from extra ceremony.

---

## Prerequisites

- Stage 4 (Requirements Analysis) complete
- `requirements.md` includes the user scenarios section

---

## Part 1 — Story Planning

### Step 1: Plan File

Create `aidlc-docs/inception/user-stories/story-generation-plan.md`:

```markdown
# Story Generation Plan

**Tier**: <…>
**Depth**: <…>

## Plan
- [ ] Identify personas (build personas.md)
- [ ] Group requirements by persona × user journey
- [ ] Draft user stories with INVEST criteria
- [ ] Write acceptance criteria for each story
- [ ] Estimate relative effort (XS/S/M/L/XL — fibonacci-ish)
- [ ] Order stories within each persona's journey

## Open Questions
<questions about persona names, journey priority, etc.>
```

### Step 2: Planning Questions

Create `story-planning-questions.md` per `common/question-format-guide.md` covering:
- Persona Identification — how many personas? primary vs secondary?
- Story Grouping — by feature / by persona / by journey?
- Acceptance Criteria Style — Given-When-Then / bullet-list / behavior table
- Estimation Style — t-shirt sizes / story points / story counts only

Wait for answers. Validate. Generate clarifications if needed.

### Step 3: Plan Approval

Present the populated plan and wait for pod approval. NOT a Gate (no signoff file required), but the AI must wait for explicit "approved" before Part 2.

---

## Part 2 — Story Generation

### Step 4: Generate `personas.md`

```markdown
# Personas

## Persona 1: <Name>
**Role**: <…>
**Goals**: <…>
**Pain points**: <…>
**Tech savviness**: <Low | Medium | High>
**Devices**: <Web / Mobile / Both>
**Sources**: requirements.md § <ref>; BR § <ref>

## Persona 2: <Name>
…
```

### Step 5: Generate `stories.md`

For each story:

```markdown
## Story US-001 — <Short Title>

**Persona**: <Name>
**Tier-1 / Tier-2**: <Tier-1 = MVP critical | Tier-2 = important | Tier-3 = nice-to-have>
**Effort**: <XS | S | M | L | XL>

**As a** <persona>,
**I want** <action / capability>,
**so that** <benefit>.

### Acceptance Criteria
- [ ] <Given X, When Y, Then Z>  (or bullet list, per planning answer)
- [ ] <…>
- [ ] <…>

### Cross-stack notes (only if full-stack)
- FE: <what FE must do>
- BE: <what BE must do>
- Mobile: <what Mobile must do>

### Maps to requirements
- FR-XXX, FR-YYY, NFR-ZZZ
```

INVEST check per story (in stage checklist):
- **I**ndependent — implementable without strict dependence on other stories
- **N**egotiable — scope can flex
- **V**aluable — user-facing or stakeholder-facing benefit
- **E**stimable — effort is sized
- **S**mall — fits in a single bolt (hours/days)
- **T**estable — acceptance criteria are concrete

### Step 6: Generate Story-Map

Optionally (Comprehensive depth), generate `story-map.md` — a 2D map of personas × user journey phases, with stories placed in each cell. Mermaid `flowchart LR` works for simple cases.

### Step 7: Stage Checklist

Generate `user-stories-checklist.md`. Items include INVEST check per story, persona coverage, requirement traceability.

### Step 8: Completion Message

```markdown
# User Stories — Complete ✅

- **Personas**: <count>
- **Stories**: <count> (Tier-1: <n>, Tier-2: <n>, Tier-3: <n>)
- **All stories pass INVEST**: <yes/no — if no, list violations>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to <Application Design | Workflow Planning>
```

---

## Anti-patterns

- ❌ Stories without explicit acceptance criteria
- ❌ Mixing two personas in one story
- ❌ Stories that span > 1 bolt without being split
- ❌ "As a user" personas — be specific (Marketer, Admin, Anonymous Visitor)
- ❌ Skipping cross-stack notes on full-stack stories

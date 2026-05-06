# Workflow Planning

**Stage**: 7 (always-execute)
**Gate**: Gate #2 (pod sign-off)
**Purpose**: Decide which downstream stages execute, at what depth, and in what order. Produce a single canonical execution plan the pod signs before any construction begins.

---

## Prerequisites

- Stage 4 (Requirements Analysis) complete
- Stage 5 (User Stories) complete or skipped
- Stage 6 (Application Design) complete or skipped

---

## Execution Steps

### Step 1: Load All Upstream Context

Load:
- `business-requirements.md`, `tier.md`
- `branding.md`, `design-tokens.md`, `screen-flow-map.md` (if Design Intake produced them)
- All Reverse Engineering artifacts (if brownfield)
- `requirements.md`
- `personas.md`, `stories.md` (if User Stories ran)
- `application-design.md`, `components.md`, etc. (if Application Design ran)
- `aidlc-state.md` § Tier, § Detected Stacks, § Extension Configuration

### Step 2: Scope & Impact Analysis

Build a structured analysis:

```markdown
## Scope

- **Stacks affected**: <FE | BE-Node | BE-Python | BE-Go | Mobile | combinations>
- **Files affected (brownfield only)**: <count or list>
- **Stories included**: <list of story IDs>

## Change Impact

- **User-facing changes**: <yes/no — list>
- **API contract changes**: <yes/no — list>
- **Schema changes**: <yes/no — list>
- **NFR changes**: <perf / security / scalability — list>
- **Breaking changes**: <yes/no — list with migration plan>

## Risk Assessment

- **Risk level**: <Low | Medium | High | Critical>
- **Top three risks** with mitigation per risk

## Multi-Module Coordination (full-stack only)

- **Stack hand-offs**: <e.g., "BE schema change → FE codegen update → Mobile model regeneration">
- **Sequencing constraints**: <e.g., "Database migration must ship before BE deploy must ship before FE deploy">
- **Cross-stack contract update plan**
```

Save as the top of `execution-plan.md` (created in Step 6).

### Step 3: Stage Selection

For each downstream stage (8–18), decide:
- **Execute or Skip**
- If Execute, **Depth** (Minimal / Standard / Comprehensive — default from Tier per `common/depth-levels.md`)

Default decisions from Tier × content:

| Stage | Greenfield | Feature | Bugfix |
|-------|-----------|---------|--------|
| 7b Units Generation | Execute if multi-service or if multiple cross-stack UoWs | Rare | Skip |
| 8 Functional Design | Execute per UoW | Execute if logic changes | Skip |
| 9 NFR Requirements | Execute Comprehensive | Execute Standard | Skip unless NFR regression |
| 10 NFR Design | Execute if 9 ran | Execute if 9 ran | Skip |
| 11 Stack Selection | Execute per UoW | Execute for new UoWs | Skip — use existing |
| 12 Code Generation | Execute Comprehensive plan | Execute Standard plan | Execute Minimal plan |
| 13 Code Review | Execute (always — Gate #4 cannot be skipped) | Execute | Execute (tests scoped to fix) |
| 14 Build & Test | Full suite | Full unit + integration | Regression-focused |
| 15 Deployment Guide | Execute | Execute | Only if hotfix release |
| 16 IaC | Execute if cloud target | Execute if infra changed | Skip |
| 17 Observability Setup | Execute | Execute if changed | Skip |
| 18 Production Readiness | Execute (Gate #5) | Execute (Gate #5) | Light-form Gate #5 |

The pod can override any default before signing Gate #2.

### Step 4: Unit Execution Order (full-stack only)

If Application Design suggests multiple UoWs spanning FE / BE / Mobile, propose an order. Heuristics:

1. **Schema-first**: shared schemas / contracts before consumers
2. **Backend before Frontend** when FE depends on BE APIs
3. **Backend before Mobile** when Mobile depends on BE APIs
4. **High-risk UoWs first** to surface issues earlier
5. **Demo-driveable UoWs first** for stakeholder feedback if BR mentions a specific demo date

Produce a numbered list under `## Unit Execution Order`.

### Step 5: Generate Mermaid Visualization

A Mermaid `flowchart TD` showing only the stages that will execute (skipped stages omitted), with the per-UoW loop expanded if multi-UoW.

Validate per `common/content-validation.md`. Provide text alternative.

### Step 6: Generate `execution-plan.md`

```markdown
# Execution Plan

**Tier**: <…>
**Generated at**: <ISO>
**Stacks affected**: <list>

## Scope, Change Impact, Risk
<from Step 2>

## Stage Decisions
| # | Stage | Execute? | Depth | Notes |
|---|-------|----------|-------|-------|
| 7b | Units Generation | Execute | Standard | <count UoWs> |
| 8 | Functional Design | Execute per UoW | Standard | <…> |
| ... | ... | ... | ... | ... |

## Unit Execution Order
1. <unit-1-name> — <stack list> — <stories> — <rationale>
2. <unit-2-name> — ...

## Workflow Visualization
<Mermaid + text alternative>

## Extension Compliance Plan
| Extension | Where it applies |
|-----------|------------------|
| Security baseline | Stages 9, 10, 12, 13 |
| PBT | Stages 8, 12, 13 |
| AI/ML lifecycle | Stages 8, 9, 12, 13 |
| Accessibility | Stages 8, 12, 13 |

## Estimates (rough order of magnitude — informational only)
- Inception remaining: <hours/days>
- Construction: <hours/days>
- Operations: <hours/days>
```

### Step 7: Generate Stage Checklist

`workflow-planning-checklist.md` — items for each decision in Step 3, the Mermaid validation, and Gate #2 prerequisites.

### Step 8: Generate Gate #2 Signoff Template

Per `common/approval-gates.md` § Gate #2. Pre-fill artifacts referenced + compliance summary table.

### ⛔ GATE #2: Wait for Pod Signatures

Validate per `common/approval-gates.md` § Validation Rules. Do NOT proceed with any `[ ]` signature.

### Step 9: Update State and Proceed

Update `aidlc-state.md`:
- `## Stage Status` — Stage 7 COMPLETE; PENDING for first-decided stage
- `## Unit Execution Order` — populated
- `## Stage Decisions` — copy of Step 3 table

Present completion message:

```markdown
# Workflow Planning — Complete ✅

- **Tier**: <…>
- **Stages to execute**: <count>
- **UoWs**: <count> (execution order shown in execution-plan.md)
- **Gate #2**: signed by <Tech Lead> and <Dev>

> **🚀 WHAT'S NEXT?**
>
> ✅ Proceed to <Units Generation | first Construction stage>
```

If Units Generation is the next stage (multi-UoW), invoke `inception/units-generation.md`. Otherwise, jump into the per-UoW Construction loop.

---

## Anti-patterns

- ❌ Producing an execution plan without a Mermaid + text-alternative diagram
- ❌ Skipping Gate #2 — never permitted regardless of Tier
- ❌ Sequencing UoWs that creates impossible dependencies (e.g., FE before its BE schema)
- ❌ Setting all stages to "Comprehensive" when Tier is Bugfix
- ❌ Forgetting to plan for opted-in extensions in the Extension Compliance Plan

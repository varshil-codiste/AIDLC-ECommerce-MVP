# Adaptive Depth

**Purpose**: Explain how AI-DLC adapts the level of detail produced within each executing stage.

## Core Principle

**When a stage executes, ALL its defined artifacts are created. The "depth" refers to the level of detail and rigor *within* those artifacts, which adapts to problem complexity and Tier.**

## Stage Selection vs Detail Level

### Stage Selection (binary)
- **Workflow Planning** decides EXECUTE or SKIP for each conditional stage
- **Tier** (set by BR Intake) influences which stages execute — see `tiered-mode.md`
- **If EXECUTE**: stage runs and creates ALL its defined artifacts
- **If SKIP**: stage doesn't run at all

### Detail Level (adaptive)
- **Minimal**: concise artifacts with essential detail
- **Standard**: normal depth with full standard artifacts
- **Comprehensive**: deep, traceable, exhaustive artifacts for complex / high-risk projects

## Default Depth by Tier

| Tier | Default depth |
|------|---------------|
| Bugfix | Minimal |
| Feature | Standard |
| Greenfield | Comprehensive |

The pod can override depth in Workflow Planning (Stage 7) before signing Gate #2.

## Factors Influencing Detail Level

The model considers these when picking depth:

1. **Tier** — primary driver
2. **Request clarity** — fuzzy requests need more questions and deeper documentation
3. **Problem complexity** — intricate state machines need more depth
4. **Scope** — single file vs full system
5. **Risk** — irreversible changes need Comprehensive depth regardless of Tier
6. **Available context** — greenfield has nothing to build from; brownfield reuses RE artifacts
7. **User preferences** — if pod requests brevity, honor it (within Tier guardrails)

## Example: Requirements Analysis

All scenarios create the same artifacts:
- `requirement-verification-questions.md` (if needed)
- `requirements.md`
- `requirements-checklist.md`

But detail varies:

### Minimal (bugfix)
- One round of clarifying questions
- One-page `requirements.md` listing the bug, repro, and acceptance test

### Standard (feature)
- Two rounds of questions
- Functional + a focused NFR section
- INVEST-ready acceptance criteria

### Comprehensive (greenfield)
- Three or more rounds of questions
- Full functional + NFR + business + technical + quality-attribute requirements
- Traceability matrix from BR sources → requirements
- Risk register with mitigation per requirement

## Example: Application Design

All scenarios create the same artifacts:
- `application-design.md`
- `components.md`
- `component-methods.md`
- `services.md`

But detail varies:

### Minimal
- A few key components, minimal method signatures, no design pattern discussion

### Standard
- Full component list with responsibilities, method signatures with input/output types

### Comprehensive
- Full design with alternatives considered, design patterns named, ADR-style rationale, dependency rationale, sequence diagrams

## Guiding Principle for the Model

**"Create exactly the detail needed for the problem at hand — no more, no less."**

- Don't artificially inflate simple problems with unnecessary detail
- Don't shortchange complex problems by omitting critical detail
- Tier is the starting point; complexity and risk are the modifiers
- All required artifacts are always created when a stage executes

## When Depth Overrides Tier

The default depth from Tier can be **upgraded** when:
- Risk is high (data loss, security, public API break)
- Reversibility is low (migrations, schema changes, customer-facing contract)
- Multiple teams will hand off this work

The default depth should NOT be **downgraded** below Tier baseline. A Greenfield project does not get Minimal depth.

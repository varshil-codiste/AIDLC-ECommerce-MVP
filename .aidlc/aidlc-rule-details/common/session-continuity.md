# Session Continuity

**Purpose**: Allow AI-DLC to resume work cleanly across sessions, IDE restarts, and pod hand-offs.

---

## Detection on Workflow Start

When the user invokes "Using AI-DLC, ..." the workflow MUST first check for an existing project before treating the request as new:

1. Check for `aidlc-docs/aidlc-state.md`
2. If found → resume flow (see "Welcome Back Prompt" below)
3. If not found → new project flow (run Workspace Detection from scratch)

---

## Welcome Back Prompt Template

When existing state is detected, present this prompt (placed in `aidlc-docs/welcome-back.md`):

```markdown
# Welcome back! AI-DLC project detected

**Project**: <project name from aidlc-state.md>
**Tier**: <greenfield | feature | bugfix>
**Pod**: Tech Lead <name>, Dev <name>
**Current phase**: <INCEPTION | CONSTRUCTION | OPERATIONS>
**Current stage**: <Stage name>
**Last completed**: <Last completed artifact>
**Next step**: <Concrete next action>

## What would you like to do today?

A) Continue where you left off — <next step description>
B) Review a previously completed stage — <show available stages>
C) Restart current stage (current artifacts will be archived as `.backup.<ts>`)
D) Restart from an earlier stage (will warn about cascading rework)
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

---

## MANDATORY: Loading Previous Stage Artifacts

Before resuming any stage, automatically read all relevant artifacts from previous stages. Never resume "blind".

### Mandatory loads by current stage

| Resuming at... | Must load... |
|----------------|--------------|
| Business Requirements (mid-stage) | Tier question file, BR sources, partial checklist |
| Design Intake | Latest BR artifacts, signoff #1 |
| Reverse Engineering | Workspace state |
| Requirements Analysis | BR + Design artifacts (if produced), RE artifacts (if brownfield) |
| User Stories | Requirements + BR |
| Application Design | Requirements + Stories + RE |
| Workflow Planning | All Inception artifacts to date |
| Units Generation | execution-plan.md + Application Design |
| Functional Design (per unit) | Requirements + Stories + Application Design + UoW assignment |
| NFR Requirements | Functional Design (this unit) |
| NFR Design | NFR Requirements (this unit) |
| Stack Selection | NFR Requirements (this unit), `tech-stack-decisions.md` (if any) |
| Code Generation Part 1 | All design artifacts for this unit |
| Code Generation Part 2 | Codegen plan + Gate #3 signoff |
| Code Review | Generated source for this unit + lint config + test config + opted-in extension rules |
| Build & Test | All UoW codegen artifacts + generated source code + Gate #4 verdicts (per unit) |
| Operations stages | Build artifacts + tech stack decisions |
| Production Readiness | Operations artifacts |

### Smart Context Loading by Stage Type

- **Early Stages** (Workspace Detection, BR, Design Intake, RE): load workspace analysis only
- **Requirements/Stories**: load RE + BR + Design
- **Design Stages**: load Requirements + Stories + Architecture + prior Design
- **Code Stages**: load ALL upstream artifacts + existing source files
- **Operations**: load all generated source + Build & Test artifacts

---

## State File Format (aidlc-state.md)

```markdown
# AI-DLC State

**Project**: <project name>
**Created**: <ISO timestamp>
**Last updated**: <ISO timestamp>
**Tier**: <greenfield | feature | bugfix>
**Workspace root**: <absolute path>

## Pod
See pod.md.

## Welcome Shown
- [x] Welcome message displayed at <ISO timestamp>

## Current Position
**Phase**: <INCEPTION | CONSTRUCTION | OPERATIONS>
**Stage**: <Stage name>
**Sub-step**: <if mid-stage>

## Stage Status

| # | Stage | Status | Depth | Artifacts |
|---|-------|--------|-------|-----------|
| 0 | Workspace Detection | COMPLETE | — | aidlc-state.md, audit.md |
| 1 | Business Requirements | COMPLETE | — | tier.md, business-requirements.md, signoff #1 |
| 2 | Design Intake | SKIPPED | — | (skip reason: no design assets yet) |
| ... | ... | ... | ... | ... |

## Extension Configuration
| Extension | Enabled | Configured at |
|-----------|---------|---------------|
| Security baseline | true | <ISO> |
| Property-based testing | false | <ISO> |
| AI/ML lifecycle | true | <ISO> |
| Accessibility (WCAG 2.2 AA) | true | <ISO> |

## Unit Execution Order (Construction phase)
1. <unit-1-name>
2. <unit-2-name>
3. <unit-3-name>

## Locale Preferences
- Artifact language: English
- Other notes: <if any>
```

---

## Resumption Protocol

1. **Validate state**: confirm `aidlc-state.md` is well-formed; if corrupted see `error-handling.md`
2. **Validate artifacts**: confirm every stage marked COMPLETE has its expected artifact files
3. **Validate signoffs**: confirm every gate marked passed has a valid signoff file (per `approval-gates.md` validation rules)
4. **Load incrementally**: load artifacts stage-by-stage, validating each
5. **Present Welcome Back prompt** in `welcome-back.md`
6. **Wait** for the user's choice
7. **Log resume** in `audit.md` with timestamp
8. **Provide a brief context summary** so the user knows what was loaded

---

## Best Practices

- ALWAYS ask resume questions in `.md` files (per `question-format-guide.md`), never in chat
- If a previously-passed gate's signoff file fails validation now (e.g., signature ages), prompt for re-sign rather than silently proceeding
- If artifacts and state disagree (state says complete but file missing), see `error-handling.md` for reconciliation
- Document every resume action in `audit.md`

## Error Handling

If artifacts are missing or corrupted during session resumption, see `error-handling.md` for recovery procedures.

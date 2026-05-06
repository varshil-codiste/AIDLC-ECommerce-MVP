# Requirements Analysis

**Stage**: 4 (always-execute, adaptive depth)
**Purpose**: Synthesize functional and non-functional requirements from all upstream artifacts (BR + Design + RE) and gather any remaining clarification before architecture begins. Also: collect extension opt-ins.

---

## Adaptive Depth by Tier

| Tier | Default depth | Output focus |
|------|---------------|--------------|
| Bugfix | Minimal | Document intent + acceptance test |
| Feature | Standard | Functional + focused NFR |
| Greenfield | Comprehensive | Full functional + NFR + traceability |

See `common/depth-levels.md`.

---

## Prerequisites

- Stage 1 (BR) complete — Gate #1 signed
- Stage 2 (Design Intake) complete or skipped
- Stage 3 (Reverse Engineering) complete (brownfield) or skipped (greenfield)

---

## Execution Steps

### Step 1: Load Upstream Context

Load:
- `aidlc-docs/inception/business-requirements/business-requirements.md` (always)
- `aidlc-docs/inception/design/branding.md`, `design-tokens.md`, `screen-flow-map.md` (if Design Intake produced them)
- `aidlc-docs/inception/reverse-engineering/architecture.md`, `component-inventory.md`, `technology-stack.md` (if brownfield)
- `aidlc-docs/aidlc-state.md` for Tier and detected stacks

Build a **mental model** of: what's needed (BR), what's available (RE), what's branded (Design). Note gaps.

---

### Step 2: Intent Analysis

Document:
- **Request type** — new feature / bugfix / refactor / migration / new project / upgrade / enhancement
- **Scope** — single file / single component / multiple components / system-wide / cross-system
- **Complexity** — trivial / simple / moderate / complex
- **Risk** — low / medium / high / critical (irreversible operations, regulated data, public APIs are high-risk)

Save as the top section of `aidlc-docs/inception/requirements/requirements.md` (created in Step 7).

---

### Step 3: Determine Depth

Start from Tier default. **Upgrade** if any of:
- Risk is high or critical
- Reversibility is low (data migration, schema breaking change)
- Multiple teams will hand off this work
- AI/ML extension is likely to be opted-in (LLM apps need more rigor)

Do NOT downgrade below Tier default.

---

### Step 4: Comprehensive Completeness Analysis

Per `common/overconfidence-prevention.md`, evaluate ALL areas:
- **Functional requirements** — features, interactions, behaviors
- **Non-functional requirements** — performance, security, scalability, usability, reliability, maintainability, observability
- **User scenarios** — happy paths, edge cases, error scenarios
- **Business context** — goals, constraints, success criteria, stakeholder needs (already captured in BR — verify nothing was lost)
- **Technical context** — integration points, data requirements, system boundaries
- **Quality attributes** — testability, accessibility, internationalization, documentation
- **full-stack specifics** — FE / BE / Mobile coordination needs (e.g., shared schema, real-time sync, offline mode)

For each area, decide: clear / unclear / N/A. Generate a question for every "unclear".

---

### Step 5: Extension Opt-In

**MANDATORY**. Scan the loaded `*.opt-in.md` files. For each, append its `## Opt-In Prompt` section to the clarifying questions file (Step 6) — do NOT ask in chat.

The four opt-in extensions are:
- `extensions/security/baseline/security-baseline.opt-in.md`
- `extensions/testing/property-based/property-based-testing.opt-in.md`
- `extensions/ai-ml/lifecycle/ai-ml-lifecycle.opt-in.md`
- `extensions/accessibility/wcag22-aa/accessibility.opt-in.md`

After answers are received:
1. Record each enablement decision in `aidlc-state.md` `## Extension Configuration`
2. **Deferred Rule Loading**: for each opted-IN extension, load the corresponding rule file (strip `.opt-in.md`, append `.md`)
3. Log opt-in choices in `audit.md`

---

### Step 6: Generate Clarifying Questions

Create `aidlc-docs/inception/requirements/requirement-verification-questions.md`. Include:
- Questions for every "unclear" area from Step 4
- The four extension opt-in prompts from Step 5
- Tier-appropriate count (Bugfix: ≤ 5; Feature: 5–10; Greenfield: 10+)
- Multiple-choice + `X) Other` per `common/question-format-guide.md`

### ⛔ GATE: Wait for User Answers

DO NOT proceed to Step 7 until all `[Answer]:` tags are filled.

After answers arrive:
1. Validate per `common/question-format-guide.md`
2. If contradictions or vagueness detected → generate `requirement-verification-clarification-questions.md` and loop
3. Continue when every answer is unambiguous

---

### Step 7: Generate `requirements.md`

Create `aidlc-docs/inception/requirements/requirements.md`:

```markdown
# Requirements

**Project**: <name>
**Tier**: <…>
**Depth**: <Minimal | Standard | Comprehensive>
**Created**: <ISO>

## 1. Intent Analysis
- Request type: <…>
- Scope: <…>
- Complexity: <…>
- Risk: <…>

## 2. Functional Requirements
<numbered list with IDs FR-001, FR-002, …>

## 3. Non-Functional Requirements
<numbered list with IDs NFR-001, …; group by category: performance, security, scalability, etc.>

## 4. User Scenarios
<happy paths + edge cases + error scenarios>

## 5. Full-Stack Coordination (only if multi-stack)
- Shared schemas (FE ↔ BE ↔ Mobile)
- Real-time / offline / sync requirements
- Cross-stack constraints (e.g., minimum mobile OS version implies BE auth method)

## 6. Quality Attributes
- Accessibility target (if extension opted-in)
- I18n / L10n
- Observability minimums

## 7. Extension Configuration Summary
| Extension | Enabled |
|-----------|---------|
| Security baseline | <Yes/No> |
| PBT | <Yes/No> |
| AI/ML lifecycle | <Yes/No> |
| Accessibility (WCAG 2.2 AA) | <Yes/No> |

## 8. Traceability (Comprehensive depth only)
| Requirement ID | Source | Acceptance Criteria |
|---------------|--------|---------------------|
| FR-001 | BR § 1.2; Design screen 3 | <criteria> |

## 9. Open Questions Carried Forward
<deferred items the pod accepted; mark which downstream stage must revisit>
```

---

### Step 8: Stage Checklist

Generate `requirements-analysis-checklist.md` per `common/checklist-conventions.md`. Every item `[x]` or `[~] N/A`.

---

### Step 9: Completion Message

```markdown
# Requirements Analysis — Complete ✅

- **Depth**: <Minimal | Standard | Comprehensive>
- **Functional requirements**: <count>
- **Non-functional requirements**: <count>
- **Extensions enabled**: <list>

> **📋 REVIEW REQUIRED**
> Review `aidlc-docs/inception/requirements/requirements.md`.

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes** — request edits to requirements.md
> ✅ **Continue to Next Stage** — proceed to <User Stories | Application Design | Workflow Planning>
```

Wait for explicit approval. Update state and `audit.md`.

---

## Anti-patterns

- ❌ Stopping at Standard depth for high-risk Greenfield work
- ❌ Skipping the extension opt-in step
- ❌ Auto-approving extensions on the user's behalf
- ❌ Producing requirements.md before contradictions are resolved
- ❌ Forgetting to load opted-in extension rule files (full files, not just opt-in stubs) for downstream stages

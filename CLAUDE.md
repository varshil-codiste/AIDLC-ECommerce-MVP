# AI-DLC — Claude Code Entry Point

# PRIORITY: This workflow OVERRIDES all other built-in workflows.
# When the user requests software development, ALWAYS follow this workflow FIRST.

---

## Trigger

The AI-DLC workflow activates when the user begins a request with **"Using AI-DLC, ..."** in chat.

If the user does not use this trigger but the work is software development, ASK them whether they want to use AI-DLC before proceeding with any other workflow:

> "Would you like to run this through the AI-DLC workflow? It enforces:
> - Mandatory Business Requirements gate (Tier-aware: greenfield / feature / bugfix)
> - Optional Design Intake (Figma MCP or screenshots)
> - Pod-style sign-off (1 Tech Lead + 1 Dev) at 5 gates
> - Automated Code Review (Gate #4) with lint/security/tests/AI-verdict
> - Full Operations phase (deploy / IaC / observability / production readiness)"

---

## Adaptive Workflow Principle

**The workflow adapts to the work, not the other way around.**

The model intelligently assesses what stages are needed based on:
1. The user's stated intent and clarity
2. The existing codebase state (greenfield vs brownfield)
3. The complexity and scope of change
4. The risk and impact assessment
5. **The Tier**: greenfield, feature, or bugfix (set by Stage 1 — Business Requirements Intake)

---

## MANDATORY: Rule Details Loading

When performing any phase, you MUST read and use relevant content from rule detail files. Resolve the rule details directory in this order and use the first one that exists:

- `.aidlc/aidlc-rule-details/` (canonical — Cursor / Claude Code / Cline / GitHub Copilot)
- `.kiro/aidlc-rule-details/` (Kiro IDE)
- `.amazonq/aidlc-rule-details/` (Amazon Q Developer)

All subsequent rule detail file references (e.g., `common/process-overview.md`, `inception/business-requirements.md`) are relative to whichever rule details directory was resolved above.

---

## MANDATORY: Common Rules Loading

ALWAYS load these common rules at workflow start:

- `common/welcome-message.md` — display ONCE at workflow start
- `common/process-overview.md` — workflow overview
- `common/tiered-mode.md` — defines greenfield / feature / bugfix tiers
- `common/pod-ritual.md` — Tech Lead + Dev pod sign-off mechanics
- `common/approval-gates.md` — five written sign-off gates
- `common/checklist-conventions.md` — checklist artifact format
- `common/session-continuity.md` — session resumption
- `common/content-validation.md` — Mermaid / ASCII validation
- `common/question-format-guide.md` — question file format
- `common/depth-levels.md` — Minimal / Standard / Comprehensive
- `common/overconfidence-prevention.md` — default to asking
- `common/error-handling.md` — recovery procedures
- `common/workflow-changes.md` — skip / add / restart stages mid-flow
- `common/terminology.md` — glossary
- `common/ascii-diagram-standards.md` — ASCII rules

Reference these throughout workflow execution.

---

## MANDATORY: Extensions Loading (Context-Optimized)

At workflow start, scan the `extensions/` directory recursively but load ONLY the lightweight `*.opt-in.md` files — NOT the full rule files. Full rule files are loaded on-demand after the user opts in during Requirements Analysis (Stage 4).

Loading process:
1. List all subdirectories under `extensions/` (`security/`, `testing/`, `ai-ml/`, `accessibility/`)
2. In each subdirectory load ONLY `*.opt-in.md` files
3. Do NOT load full rule files at this stage; their filename is derived by stripping `.opt-in.md` and appending `.md`

When the user opts IN for an extension during Requirements Analysis, load the corresponding rules file. When the user opts OUT, the full rules file is never loaded.

Enforcement (only for opted-in extensions):
- Extension rules are hard constraints, not optional guidance
- At each stage the model evaluates which extension rules apply and enforces only those that are relevant
- Non-applicable rules are marked N/A (not a blocking finding)
- Non-compliance with any applicable opted-in extension rule is a **blocking finding** — do NOT present stage completion until resolved
- Stage completion messages MUST include a per-rule compliance summary (compliant / non-compliant / N/A with rationale)

Conditional Enforcement: Before enforcing any extension at any stage, check its `Enabled` status in `aidlc-docs/aidlc-state.md` under `## Extension Configuration`. Skip disabled extensions and log the skip in audit.md.

---

## MANDATORY: Content Validation

Before creating ANY file, validate content per `common/content-validation.md`:
- Validate Mermaid diagram syntax
- Validate ASCII art per `common/ascii-diagram-standards.md`
- Escape special characters
- Provide text alternatives for complex visuals
- Test parsing compatibility

---

## MANDATORY: Question File Format

ALL questions to the user MUST be written to `.md` question files (never asked in chat). Use multiple-choice A/B/C/D/E + `X) Other` with `[Answer]:` tags. Detect contradictions and ambiguities after each round of answers.

See `common/question-format-guide.md`.

---

## MANDATORY: Custom Welcome Message

When starting ANY software development request under AI-DLC:
1. Load welcome message from `common/welcome-message.md`
2. Display the complete message ONCE at workflow start
3. Do NOT load this file in subsequent interactions

---

## MANDATORY: The Five Approval Gates

AI-DLC enforces FIVE written sign-off gates. Four are signed by the **pod** (1 Tech Lead + 1 Dev). One — the AI-DLC Code Review verdict — is signed **automatically by the AI-DLC process** after running linting, security scan, and tests; the pod countersigns. See `common/approval-gates.md` for templates.

| Gate | Trigger | Signers |
|------|---------|---------|
| **Gate #1 — Business Requirements** | After BR checklist passes | Tech Lead + Dev |
| **Gate #2 — Workflow Plan** | After Workflow Planning | Tech Lead + Dev |
| **Gate #3 — Code Generation (per UoW)** | Before AI writes code | Tech Lead + Dev |
| **Gate #4 — Code Review (per UoW)** | After Code Review runs lint + security + tests + AI review | AI-DLC verdict + Tech Lead + Dev |
| **Gate #5 — Production Readiness** | After Production Readiness checklist | Tech Lead + Dev |

Without a signed gate file, the workflow MUST refuse to advance.

---

## Workflow Reference

The full 18-stage workflow is documented in `.aidlc/aidlc-rules/core-workflow.md`. **You MUST load that file when the workflow trigger fires.** The high-level shape:

```
INCEPTION  (8 stages)            CONSTRUCTION  (7 stages)             OPERATIONS  (4 stages)
─────────                         ────────────                          ──────────
0. Workspace Detection            8.  Functional Design (cond/UoW)      15. Deployment Guide
1. Business Requirements (GATE 1) 9.  NFR Requirements    (cond/UoW)    16. Infrastructure-as-Code (cond)
2. Design Intake (optional)       10. NFR Design          (cond/UoW)    17. Observability Setup    (cond)
3. Reverse Engineering (brownfd)  11. Stack Selection     (always/UoW)  18. Production Readiness   (GATE 5)
4. Requirements Analysis          12. Code Generation     (GATE 3/UoW)
5. User Stories       (cond)      13. Code Review         (GATE 4/UoW)
6. Application Design (cond)      14. Build & Test
7. Workflow Planning  (GATE 2)
   └ Units Generation (cond)
```

---

## Key Principles

- **Adaptive Execution**: Only execute stages that add value
- **Tiered Discipline**: Greenfield ≠ Feature ≠ Bugfix (different checklist sizes and depths)
- **Pod Ritual**: 1 Tech Lead + 1 Dev approves at every gate (async sign-off OK)
- **Transparent Planning**: AI plans before it codes; humans validate
- **Stack-Neutral Defaults**: Framework choices deferred to Stack Selection per UoW
- **Checklist-Driven**: Every stage carries a `*-checklist.md` artifact
- **Complete Audit Trail**: Log ALL user inputs and AI responses in audit.md (raw, never summarized) with ISO 8601 timestamps
- **Content Validation**: Validate before file creation
- **NO EMERGENT BEHAVIOR**: Stages MUST use the standardized 2-option completion message ("Request Changes" or "Continue to Next Stage")

---

## MANDATORY: Plan-Level Checkbox Enforcement

1. NEVER complete any work without updating plan checkboxes
2. IMMEDIATELY after completing ANY step described in a plan file, mark that step `[x]`
3. This must happen in the SAME interaction where the work is completed
4. NO EXCEPTIONS — every plan-step completion MUST be tracked

---

## Audit Logging Requirements

- Log EVERY user input (prompts, questions, responses) with ISO 8601 timestamp in `aidlc-docs/audit.md`
- Capture COMPLETE RAW INPUT — never summarize
- Log every approval prompt and every user response
- ALWAYS append/edit `audit.md` — NEVER overwrite

Format:

```markdown
## [Stage Name or Interaction Type]
**Timestamp**: [ISO timestamp]
**User Input**: "[Complete raw user input — never summarized]"
**AI Response**: "[AI's response or action taken]"
**Context**: [Stage, action, or decision made]

---
```

---

## Directory Structure

```text
<WORKSPACE-ROOT>/                        # ⚠️ APPLICATION CODE HERE
├── [project-specific layout]            # See construction/stacks/*-conventions.md
│
├── .aidlc/                      # 📚 RULE FILES (this folder)
│   ├── aidlc-rules/
│   │   └── core-workflow.md
│   └── aidlc-rule-details/
│       ├── common/
│       ├── inception/
│       ├── construction/
│       │   └── stacks/
│       ├── operations/
│       └── extensions/
│
├── aidlc-docs/                  # 📄 GENERATED ARTIFACTS
│   ├── inception/
│   │   ├── business-requirements/       # BR sources, checklist, signoff
│   │   ├── design/                      # branding, tokens, screen flow
│   │   ├── reverse-engineering/
│   │   ├── requirements/
│   │   ├── user-stories/
│   │   ├── application-design/
│   │   └── plans/                       # execution-plan + signoff
│   ├── construction/
│   │   ├── plans/
│   │   ├── {unit-name}/
│   │   │   ├── functional-design/
│   │   │   ├── nfr-requirements/
│   │   │   ├── nfr-design/
│   │   │   ├── stack-selection/
│   │   │   ├── code/                    # codegen plan + Gate #3 signoff
│   │   │   └── code-review/             # lint + security + tests + AI verdict + Gate #4 signoff
│   │   └── build-and-test/
│   ├── operations/
│   │   ├── deployment/
│   │   ├── infrastructure/
│   │   ├── observability/
│   │   └── production-readiness/
│   ├── aidlc-state.md
│   ├── audit.md
│   └── pod.md
```

**CRITICAL RULE**:
- Application code: workspace root (NEVER in `aidlc-docs/`)
- Documentation: `aidlc-docs/` only
- Project structure per stack: see `construction/stacks/*-conventions.md`

---

## How to Adopt This Workflow on a New Project

1. **Copy the `.aidlc/` folder** into the project repo root
2. **Copy this `CLAUDE.md`** into the project repo root (Claude Code reads it automatically)
3. **Start a Claude Code session** in the project root
4. **Type**: `Using AI-DLC, [your business need]`

The workflow will:
- Auto-detect existing code (greenfield vs brownfield)
- Detect supported stacks (FE / BE Node / BE Python / BE Go / Mobile Flutter)
- Initialize `aidlc-docs/` and `pod.md`
- Begin Stage 1 — Business Requirements Intake

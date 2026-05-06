# AI-DLC — Core Workflow

# PRIORITY: This workflow OVERRIDES all other built-in workflows.
# When the user requests software development with the trigger phrase **"Using AI-DLC, ..."**, ALWAYS follow this workflow FIRST.

---

## Trigger

The workflow activates when the user begins a request with **"Using AI-DLC, ..."** in chat. If the user does not use this trigger but the work is software development, ask them whether they want to use AI-DLC before proceeding with any other workflow.

---

## Adaptive Workflow Principle

**The workflow adapts to the work, not the other way around.**

The model intelligently assesses what stages are needed based on:
1. The user's stated intent and clarity
2. The existing codebase state (greenfield vs brownfield)
3. The complexity and scope of change
4. The risk and impact assessment
5. **The Tier**: greenfield, feature, or bugfix (set by `inception/business-requirements.md`)

---

## MANDATORY: Rule Details Loading

When performing any phase, you MUST read and use relevant content from rule detail files. Resolve the rule details directory in this order and use the first one that exists:

- `.aidlc/aidlc-rule-details/` (canonical, Cursor / Claude Code / Cline / GitHub Copilot)
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
- `common/approval-gates.md` — three written sign-off gates
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

At workflow start, scan the `extensions/` directory recursively but load ONLY the lightweight `*.opt-in.md` files — NOT the full rule files. Full rule files are loaded on-demand after the user opts in during Requirements Analysis.

Loading process:
1. List all subdirectories under `extensions/` (e.g., `extensions/security/`, `extensions/ai-ml/`, `extensions/accessibility/`, `extensions/testing/`)
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

## MANDATORY: Skills Loading (Context-Optimized)

AI-DLC ships with a curated catalog of 20 Agent Skills under `.aidlc/skills/`. Each skill is an Anthropic-standard SKILL.md package that gives the agent on-demand expertise at specific stages — see `.aidlc/skills/README.md` for the catalog and `.aidlc/skills/skill-policy.md` for governance.

At workflow start:

1. Scan `.aidlc/skills/` recursively
2. For each `SKILL.md` found, load **ONLY the YAML frontmatter** (name + description + optional `aidlc:` block) — NOT the full body or vendored upstream
3. Use description-match to invoke each skill on demand during the relevant stage; the body and resources load lazily at invocation time

This mirrors Anthropic's three-tier progressive disclosure: lightweight metadata at boot, body on trigger, resources on demand. Twenty installed skills cost negligible boot context.

**Invocation logging (mandatory)**: every skill invocation appends two entries to `aidlc-docs/audit.md` per `.aidlc/skills/skill-policy.md` § 1 — one pre-invocation entry (skill name, stage, Tier, inputs summary, sensitive flag, dry-run vs live) and one post-invocation entry (outcome, files affected, output summary). Free-roam invocation otherwise — any installed skill may be invoked at any stage; the audit log is the control.

**Sensitive skills** (currently `terraform-iac-author` for `terraform apply` to non-dev, `dockerfile-generator` for image promotion to prod, `observability-wirer` for credential rotation) require a per-action signoff at `aidlc-docs/operations/skill-actions/<ts>-<action>-signoff.md` before live mutation. The skill itself refuses to fire without a valid signoff. See `.aidlc/skills/skill-policy.md` § 2.

**IDE compatibility**: skills work across Claude Code, Cursor, GitHub Copilot, Codex CLI, Gemini CLI, Cline, Windsurf, OpenCode, and 5+ other agents. The `install-aidlc-skills.sh` script (in `.aidlc/skills/scripts/`) creates IDE-specific symlink shims so each agent finds skills at its expected path.

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

## MANDATORY: The Approval Gates

AI-DLC enforces FIVE written sign-off gates. Four are signed by the **pod** (1 Tech Lead + 1 Dev). One — the AI-DLC Code Review verdict — is signed **automatically by the AI-DLC process** after running linting, security scan, and tests; the pod countersigns. See `common/approval-gates.md` for templates.

| Gate | Location | Trigger | Signers |
|------|----------|---------|---------|
| **Gate #1 — Business Requirements** | `aidlc-docs/inception/business-requirements/business-requirements-signoff.md` | After BR checklist passes | Tech Lead + Dev |
| **Gate #2 — Workflow Plan** | `aidlc-docs/inception/plans/execution-plan-signoff.md` | After Workflow Planning | Tech Lead + Dev |
| **Gate #3 — Code Generation (per UoW)** | `aidlc-docs/construction/{unit-name}/code/{unit-name}-codegen-signoff.md` | Before AI writes code for each unit | Tech Lead + Dev |
| **Gate #4 — Code Review (per UoW)** | `aidlc-docs/construction/{unit-name}/code-review/{unit-name}-code-review-signoff.md` | After Code Generation Part 2 produces code | AI-DLC verdict + Tech Lead + Dev |
| **Gate #5 — Production Readiness** | `aidlc-docs/operations/production-readiness/production-readiness-signoff.md` | After Production Readiness checklist | Tech Lead + Dev |

Without a signed gate file, the workflow MUST refuse to advance. If signing is asynchronous (PR comment, commit), record the comment URL or commit SHA inside the signoff file.

---

# AI-DLC — Phases & Stages

```
INCEPTION                                  CONSTRUCTION                              OPERATIONS
─────────                                  ────────────                              ──────────
0. Workspace Detection         (always)    8.  Functional Design       (cond/UoW)    15. Deployment Guide       (always)
1. Business Requirements Intake (GATE #1)  9.  NFR Requirements         (cond/UoW)    16. Infrastructure-as-Code (cond)
2. Design Intake               (optional)  10. NFR Design                (cond/UoW)    17. Observability Setup    (cond)
3. Reverse Engineering         (brownfield) 11. Stack Selection & Setup  (always/UoW)  18. Production Readiness   (GATE #5)
4. Requirements Analysis       (always)    12. Code Generation          (GATE #3/UoW)
5. User Stories                (cond)      13. Code Review              (GATE #4/UoW)
6. Application Design          (cond)      14. Build & Test             (always)
7. Workflow Planning           (GATE #2)
   └─ Units Generation         (cond)
```

---

# 🔵 INCEPTION PHASE

**Purpose**: Planning, requirements, and architectural decisions. Determine WHAT to build and WHY.

## 0. Workspace Detection (ALWAYS EXECUTE)

1. **MANDATORY**: Log initial user request in audit.md with complete raw input
2. Load all steps from `inception/workspace-detection.md`
3. Execute workspace detection:
   - Check for existing `aidlc-state.md` — resume if found (follow `common/session-continuity.md`)
   - Scan workspace for code (FE / BE / Mobile signals)
   - Determine greenfield vs brownfield
   - Check for existing reverse engineering artifacts
4. Determine next stage: **Business Requirements Intake** (always next; never skip)
5. **MANDATORY**: Log findings in audit.md
6. Present completion message and proceed automatically

## 1. Business Requirements Intake (ALWAYS EXECUTE — HARD GATE)

1. **MANDATORY**: Log user input in audit.md
2. Load all steps from `inception/business-requirements.md`
3. Execute BR intake:
   - **Step 1**: Detect Tier (greenfield / feature / bugfix) via question file
   - **Step 2**: Ask user for input format (text / PDF / Doc / ticket / combination)
   - **Step 3**: Ingest and convert sources to markdown into `aidlc-docs/inception/business-requirements/sources/`
   - **Step 4**: Apply tiered checklist (greenfield ~20 / feature ~10 / bugfix ~5 items)
   - **Step 5**: HARD GATE — every checklist item must be `[x]` or `[~] N/A: <reason>`
   - **Step 6**: Generate `business-requirements.md` and `tier.md`
4. **GATE #1**: Generate `business-requirements-signoff.md` template; wait for Tech Lead + Dev signatures
5. DO NOT PROCEED until both signatures recorded
6. **MANDATORY**: Log signoff in audit.md

## 2. Design Intake (OPTIONAL)

1. **MANDATORY**: Log user input in audit.md
2. Load all steps from `inception/design-intake.md`
3. Ask user via question file: **A) Connect Figma MCP**, **B) Provide Screenshots**, **C) Skip — design later**, **X) Other**
4. Execute the chosen path:
   - **Figma MCP**: verify MCP server is configured, fetch frames, extract tokens/branding/screen flow
   - **Screenshots**: prompt user to drop multiple screenshots covering core screens, brand assets, and logos
   - **Skip**: record reason; downstream stages produce design-agnostic placeholders
5. Produce three artifacts (only if A or B chosen): `branding.md`, `design-tokens.md`, `screen-flow-map.md`
6. Present completion message and proceed automatically

## 3. Reverse Engineering (CONDITIONAL — Brownfield Only)

Execute IF: existing codebase detected AND no previous reverse-engineering artifacts.

1. **MANDATORY**: Log start in audit.md
2. Load all steps from `inception/reverse-engineering.md`
3. Generate FE / BE / Mobile inventories per the rule
4. Wait for explicit approval before proceeding
5. **MANDATORY**: Log user response in audit.md

## 4. Requirements Analysis (ALWAYS EXECUTE — Adaptive Depth)

Depth varies by Tier:
- **Bugfix Tier**: Minimal — document intent only
- **Feature Tier**: Standard — functional + NFR requirements
- **Greenfield Tier**: Comprehensive — full requirements with traceability

1. **MANDATORY**: Log user input in audit.md
2. Load all steps from `inception/requirements-analysis.md`
3. Load BR artifacts + Design artifacts (if produced) + Reverse Engineering artifacts (if brownfield)
4. **Extension Opt-In**: present `extensions/*/*.opt-in.md` prompts and record choices in `aidlc-state.md` under `## Extension Configuration`
5. Generate clarifying questions, validate for contradictions, generate `requirements.md`
6. Wait for explicit approval

## 5. User Stories (CONDITIONAL)

Same intelligent assessment as AWS AI-DLC. See `inception/user-stories.md` for triggers and skip conditions. Two parts: **Planning → Generation**.

## 6. Application Design (CONDITIONAL)

Execute IF: new components/services needed, full-stack architecture decisions required, or service layer needs definition. See `inception/application-design.md`. Generates **FE arch + BE arch + Mobile arch** when full-stack.

## 7. Workflow Planning (ALWAYS EXECUTE — GATE #2)

1. **MANDATORY**: Log user input in audit.md
2. Load all steps from `inception/workflow-planning.md`
3. Load all prior context (BR + Design + RE + Requirements + Stories + App Design)
4. Decide which downstream stages execute and at what depth
5. Generate `execution-plan.md` with Mermaid visualization
6. **GATE #2**: Generate `execution-plan-signoff.md`; wait for Tech Lead + Dev signatures
7. DO NOT PROCEED until signed
8. (Optional) Run **Units Generation** if multi-unit decomposition is needed

---

# 🟢 CONSTRUCTION PHASE

**Purpose**: Detailed design, NFR implementation, and code generation. Determine HOW to build it.

## Per-Unit Loop

For each unit of work, execute these stages in sequence (each unit is fully completed before moving to the next).

### 8. Functional Design (CONDITIONAL, per-unit)

Generates domain entities + business rules + (when full-stack) FE component tree + Mobile screens. See `construction/functional-design.md`.

### 9. NFR Requirements (CONDITIONAL, per-unit)

Adds AI/ML NFRs (eval thresholds, latency-per-token, hallucination tolerance) when AI/ML extension is enabled. See `construction/nfr-requirements.md`.

### 10. NFR Design (CONDITIONAL, per-unit)

Patterns + logical components. See `construction/nfr-design.md`.

### 11. Stack Selection & Setup (ALWAYS EXECUTE, per-unit)

**This is a team-specific stage.** No framework default is baked in — the rule asks the user (per UoW) which framework to use for each stack present in the unit:

- Node.js → NestJS / Express / Fastify / Other
- Python → FastAPI / Django / Flask / Other
- Go → stdlib + chi/echo / Gin / Fiber / Other
- Flutter → Riverpod / BLoC / Provider / Other
- Frontend → React / Next.js / Vue / Other

After selection, load the matching `construction/stacks/*-conventions.md` file. See `construction/stack-selection.md`.

### 12. Code Generation (ALWAYS EXECUTE, per-unit — GATE #3)

Two parts: **Planning → Generation**. After Part 1 produces the plan, **GATE #3** requires `{unit-name}-codegen-signoff.md` to be signed before Part 2 writes any code.

See `construction/code-generation.md`.

### 13. Code Review (ALWAYS EXECUTE, per-unit — GATE #4)

After code is generated for a unit, the AI-DLC process automatically reviews the unit's output. The review has FOUR mandatory checks and produces an automated verdict (PROCEED / BLOCK):

1. **Linting** — run the stack's linter/formatter on all generated/modified files; capture errors and warnings
2. **Code Security** — run the stack's SAST tool (e.g., npm audit, pip-audit, gosec, dart analyze + dependency scan); apply opted-in security extension rules
3. **Test Results** — run unit tests for the unit; capture pass/fail counts, coverage, and failures
4. **AI Review** — produce a structured review covering correctness, design adherence, and risk

Based on the four checks, the AI-DLC process generates a **verdict block** in `{unit-name}-code-review-signoff.md`:

- ✅ **PROCEED** — all four checks green; pod countersigns to advance to Build & Test
- ⛔ **BLOCK** — at least one check failed; the AI returns to Code Generation Part 2 to address findings, then re-runs Code Review

The pod (Tech Lead + Dev) reviews the verdict and countersigns. The AI's verdict alone is not enough — pod countersignature is required because the AI cannot judge product correctness end-to-end.

See `construction/code-review.md`.

### 14. Build & Test (ALWAYS EXECUTE — after all units complete)

Per-stack build + multi-stack integration tests. Tier influences depth (bugfix focuses on regression test for the fix; feature/greenfield run full suite). Note: per-unit unit tests already ran in Code Review (Stage 13). Build & Test focuses on **integration**, **performance**, **contract**, **e2e**, and any cross-stack tests.

See `construction/build-and-test.md`.

---

# 🟡 OPERATIONS PHASE

**Purpose**: Deploy, run, and operate the product. AI-DLC implements this phase fully (AWS leaves it as a placeholder).

## 15. Deployment Guide (ALWAYS EXECUTE)

Generates Dockerfile + CI/CD pipeline templates per stack. See `operations/deployment-guide.md`.

## 16. Infrastructure-as-Code (CONDITIONAL)

Execute IF: cloud target is AWS / GCP / Azure AND IaC is required. Choose Terraform / Pulumi / CDK based on `tech-stack-decisions.md`. See `operations/infrastructure-as-code.md`.

## 17. Observability Setup (CONDITIONAL)

Logs / metrics / traces / alerts. Sentry, Datadog, OpenTelemetry, Prometheus/Grafana. See `operations/observability-setup.md`.

## 18. Production Readiness (ALWAYS EXECUTE — GATE #5)

Final go-live checklist + runbook + sign-off. See `operations/production-readiness.md`.

---

## Key Principles

- **Adaptive Execution**: Only execute stages that add value
- **Tiered Discipline**: Greenfield ≠ feature ≠ bugfix — checklist size and depth differ
- **Pod Ritual**: 1 Tech Lead + 1 Dev approves at every gate (async OK)
- **Transparent Planning**: AI plans before it codes; humans validate
- **Stack-Neutral Defaults**: Framework choices deferred to NFR / Stack Selection per unit
- **Checklist-Driven**: Every stage carries a `*.checklist.md` artifact
- **Complete Audit Trail**: Log ALL user inputs and AI responses in audit.md (raw, never summarized) with ISO 8601 timestamps
- **Content Validation**: Validate before file creation
- **NO EMERGENT BEHAVIOR**: Stages MUST use the standardized 2-option completion message ("Request Changes" or "Continue to Next Stage")

---

## MANDATORY: Plan-Level Checkbox Enforcement

1. NEVER complete any work without updating plan checkboxes
2. IMMEDIATELY after completing ANY step described in a plan file, mark that step `[x]`
3. This must happen in the SAME interaction where the work is completed
4. NO EXCEPTIONS — every plan-step completion MUST be tracked

Two-level tracking:
- **Plan-Level**: Detailed execution within each stage
- **Stage-Level**: Overall workflow progress in `aidlc-state.md`

---

## Audit Logging Requirements

- Log EVERY user input (prompts, questions, responses) with ISO 8601 timestamp in audit.md
- Capture COMPLETE RAW INPUT — never summarize
- Log every approval prompt and every user response
- ALWAYS append/edit `audit.md` — NEVER overwrite

Audit Log Format:

```markdown
## [Stage Name or Interaction Type]
**Timestamp**: [ISO timestamp]
**User Input**: "[Complete raw user input — never summarized]"
**AI Response**: "[AI's response or action taken]"
**Context**: [Stage, action, or decision made]

---
```

### Skill Invocation Log Format

Every skill invocation appends TWO entries — one before the skill runs, one after. This is enforced by `.aidlc/skills/skill-policy.md` § 1.

```markdown
## Skill Invocation
**Timestamp**: [ISO 8601]
**Skill**: [skill-name]
**Stage**: [current AI-DLC stage]
**Tier**: [Greenfield | Feature | Bugfix]
**Inputs (summary)**: [one-line summary; never dump raw secrets/PII]
**Sensitive**: [yes | no]
**Pre-flight mode**: [dry-run | live]

---

## Skill Result
**Timestamp**: [ISO 8601]
**Skill**: [skill-name]
**Outcome**: [success | failure | blocked-by-policy]
**Files affected**: [list of relative paths or "none"]
**Output summary**: [one paragraph or relative path to the full output artifact]

---
```

If a skill aborts mid-run, the post-invocation entry is still required, with `Outcome: failure` and a one-line cause. If a sensitive skill is invoked without a valid per-action signoff, the post entry's outcome is `blocked-by-policy`.

---

## Directory Structure

```text
<WORKSPACE-ROOT>/                        # ⚠️ APPLICATION CODE HERE
├── [project-specific layout]            # See construction/stacks/*-conventions.md
│
├── aidlc-docs/                  # 📄 DOCUMENTATION ONLY
│   ├── inception/
│   │   ├── business-requirements/       # NEW: BR sources, checklist, signoff
│   │   ├── design/                      # NEW: branding, tokens, screen flow
│   │   ├── reverse-engineering/         # Brownfield only
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
│   │   │   ├── code/                    # codegen plan + Gate #3 signoff + markdown summaries
│   │   │   └── code-review/             # NEW: lint + security + tests + AI verdict + Gate #4 signoff
│   │   └── build-and-test/
│   ├── operations/
│   │   ├── deployment/
│   │   ├── infrastructure/
│   │   ├── observability/
│   │   ├── production-readiness/
│   │   └── skill-actions/                  # NEW: per-action signoffs for sensitive skills
│   ├── aidlc-state.md
│   └── audit.md
│
├── .aidlc/                         # 📚 RULE FILES + SKILLS (read-only contract)
│   ├── aidlc-rules/core-workflow.md
│   ├── aidlc-rule-details/         # 49 rule files: common/, inception/, construction/, operations/, extensions/
│   └── skills/                             # NEW: 20 Agent Skills
│       ├── README.md                       # catalog
│       ├── skill-policy.md                 # governance, sensitive-skill list
│       ├── AUTHORING.md                    # how to author new skills
│       ├── scripts/install-aidlc-skills.sh   # creates IDE shims
│       ├── scripts/lint-skills.py          # frontmatter validator (CI + --diagnose)
│       ├── inception/                      # 4 skills (Stages 1, 2, 5)
│       ├── construction/                   # 11 skills (Stages 8, 12, 13)
│       ├── operations/                     # 4 skills (Stages 15-18)
│       └── extensions/                     # 1 skill (AI/ML lifecycle)
│
├── .claude/skills → ../.aidlc/skills      # IDE discovery shims (created by install script)
├── .cursor/skills → ../.aidlc/skills
├── .github/skills → ../.aidlc/skills
└── .agents/skills → ../.aidlc/skills
```

**CRITICAL RULE**:
- Application code: workspace root (NEVER in `aidlc-docs/`)
- Documentation: `aidlc-docs/` only
- Project structure per stack: see `construction/stacks/*-conventions.md`

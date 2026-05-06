# Code Generation

**Stage**: 12 (always-execute, per-UoW)
**Gate**: Gate #3 (pod sign-off between Part 1 and Part 2)
**Purpose**: Produce the actual source code, tests, and supporting files for ONE Unit of Work. Two parts: **Plan → Generate**. The pod signs Gate #3 between the two parts so a human approves *before* code is written.

**Skills invoked at this stage** — Part 2 (Generation) invokes the matching stack-conventions skill per stack in scope, plus optional cross-cutting skills:

| Stack in scope | Skill |
|----------------|-------|
| Frontend (React / Next.js / Vue) | [`react-best-practices`](../../skills/construction/react-best-practices/SKILL.md) |
| Backend Node.js (NestJS) | [`nestjs-conventions`](../../skills/construction/nestjs-conventions/SKILL.md) |
| Backend Python (FastAPI) | [`fastapi-conventions`](../../skills/construction/fastapi-conventions/SKILL.md) |
| Backend Go | [`go-clean-architecture`](../../skills/construction/go-clean-architecture/SKILL.md) |
| Mobile Flutter (Riverpod) | [`flutter-riverpod-architecture`](../../skills/construction/flutter-riverpod-architecture/SKILL.md) |
| Cross-stack contracts | [`api-contract-designer`](../../skills/construction/api-contract-designer/SKILL.md) (runs first if Block F.1 chose OpenAPI / GraphQL / gRPC; consumed by FE/BE/Mobile codegen) |
| PBT extension enabled | [`property-based-test-generator`](../../skills/construction/property-based-test-generator/SKILL.md) (alongside example-based tests) |
| AI/ML extension enabled | [`llm-eval-harness`](../../skills/extensions/llm-eval-harness/SKILL.md) (Step 8 — scaffolds `evals/` directory + golden-set + runner) |

The matching stack convention file (`construction/stacks/<stack>-conventions.md`) is loaded by the Stack Selection stage and provides the rules each codegen skill enforces.

---

## Prerequisites

- Stage 11 (Stack Selection) complete — chosen stacks recorded
- Stage 8 (Functional Design), 9 (NFR Requirements), 10 (NFR Design) complete or explicitly skipped
- All conventions files loaded (`construction/stacks/*-conventions.md`)
- Opted-in extension rule files loaded

---

# Part 1 — Code Generation Planning

The AI produces a detailed plan; the pod approves via Gate #3. **No code is written in Part 1.**

## Step 1: Analyze Unit Context

- Read `unit-of-work.md` § <this UoW>
- Read all design artifacts for this unit (`functional-design/`, `nfr-requirements/`, `nfr-design/`, `stack-selection/`)
- Read story map: which stories does this UoW implement?
- Read dependency graph: are upstream UoWs already generated and stable?

## Step 2: Determine Code Location

Read `aidlc-state.md` for workspace root and project type.

| Project type | Layout |
|--------------|--------|
| Greenfield, single UoW | Root: `src/`, `tests/`, `app/` (FE), `lib/` (Mobile) — see stack conventions |
| Greenfield, multi-UoW microservices | Root: `<unit-name>/src/`, `<unit-name>/tests/` per UoW; shared in `shared/` |
| Greenfield, multi-UoW monolith | Root: `src/<unit-name>/`, `tests/<unit-name>/` |
| Brownfield | Modify in place — never create `*_modified.<ext>` |

NEVER write code under `aidlc-docs/`.

## Step 3: Build the Plan

Create `aidlc-docs/construction/{unit}/code/{unit}-code-generation-plan.md`:

```markdown
# Code Generation Plan — <unit>

**Tier**: <…>
**Stacks in scope**: <list>
**Stories implemented**: <US-IDs>
**Generated at**: <ISO>

## Code Location
- Workspace root: <abs path>
- Layout: <single | multi-microservices | multi-monolith | brownfield-in-place>

## Steps

### Step 1: Project Structure Setup (greenfield only)
- [ ] Initialize directory tree per stack conventions
- [ ] Create lint / formatter config files (per stack)
- [ ] Create test framework scaffolding
- [ ] Initialize package manager state (package.json / pyproject.toml / go.mod / pubspec.yaml)
- [ ] Create env-var template (.env.example)

### Step 2: Shared Contracts (only if Block F.1 chose OpenAPI / GraphQL / Protobuf)
- [ ] Create `shared/<contract-format>/` directory
- [ ] Author the contract for endpoints in this UoW
- [ ] Set up codegen pipeline (FE / BE / Mobile)

### Step 3: Domain Layer (BE side)
- [ ] Implement entities from `domain-entities.md`
- [ ] Implement business rules from `business-rules.md` (with explicit error codes)
- [ ] Unit tests for entities and rules
- [ ] Mark stories addressed: <US-IDs>

### Step 4: Persistence Layer (BE side, if data store in scope)
- [ ] Implement repository / DAO per chosen ORM
- [ ] Database migration files
- [ ] Unit tests with in-memory or testcontainers DB

### Step 5: API Layer (BE side)
- [ ] Implement endpoints (per OpenAPI / GraphQL contract)
- [ ] Apply NFR Design patterns (P-RES-001 retries, etc.)
- [ ] Apply Security baseline rules (if extension on)
- [ ] Integration tests (per endpoint)

### Step 6: Frontend (only if FE in scope)
- [ ] Generate components per `frontend-components.md`
- [ ] Wire to API client (codegen output if contract chosen)
- [ ] Apply design tokens from `inception/design/design-tokens.md` (if Design Intake ran)
- [ ] Component tests
- [ ] Add `data-testid` attributes per team convention
- [ ] Apply Accessibility extension rules (if on)

### Step 7: Mobile (only if Mobile in scope)
- [ ] Generate screens per `mobile-screens.md`
- [ ] Apply chosen state-management pattern
- [ ] Wire to API client
- [ ] Apply design tokens (if Design Intake ran)
- [ ] Widget tests + integration tests
- [ ] Add Key() per team convention

### Step 8: AI/ML Layer (only if AI/ML extension on)
- [ ] Prompt registry (versioned prompt files)
- [ ] Eval suite scaffold
- [ ] Hallucination guardrails (input/output filtering)
- [ ] RAG pipeline if applicable

### Step 9: Cross-Stack Wire-up (full-stack only)
- [ ] Confirm contract is consumed identically by FE / BE / Mobile
- [ ] e2e smoke test for one happy path

### Step 10: Documentation
- [ ] Update / create `<unit>/README.md` with run instructions
- [ ] OpenAPI / GraphQL schema published

### Step 11: Summary in `aidlc-docs/construction/{unit}/code/`
- [ ] `<unit>-code-summary.md` listing every file created or modified
- [ ] Story coverage map: each US-ID → files implementing it

## Story Traceability
| Story | Implementation files |
|-------|----------------------|
| US-001 | <list> |
| US-002 | <list> |

## Dependencies
- Upstream UoWs depended on: <list>
- External services: <list>
- Env vars required: <list>

## Estimated File Count
- Source files: ~<n>
- Test files: ~<n>
- Docs: ~<n>
```

The plan must be **executable step-by-step** — the pod should be able to read it and predict what files will appear.

## Step 4: Generate Gate #3 Signoff Template

Per `common/approval-gates.md` § Gate #3. Pre-fill:
- "What Is Being Approved" — one paragraph summary of the planned code generation
- "Artifacts Referenced" — the codegen plan + all design artifacts
- "Compliance Summary" — every opted-in extension rule, with planned-status (Compliant / N/A)
- "Open Risks" — anything the AI flagged

## ⛔ GATE #3: Wait for Pod Signatures

Validate per `common/approval-gates.md`. Do NOT proceed to Part 2 until Tech Lead AND Dev have signed.

---

# Part 2 — Code Generation Execution

## Step 5: Load the Approved Plan

Read `{unit}-code-generation-plan.md`. Identify the next `[ ]` step. Execute steps in order. Update each `[ ]` to `[x]` immediately after completion (per `core-workflow.md` § Plan-Level Checkbox Enforcement).

## Step 6: Execute Each Step

For each step:
1. **Brownfield**: locate the target file(s) using `code-structure.md`; modify in place
2. **Greenfield**: create the file at the path specified in the plan
3. **Apply conventions** from the loaded `stacks/*-conventions.md` files
4. **Apply opted-in extension rules** as the file is generated (don't post-hoc fix)
5. **Generate test alongside source** — never defer tests
6. **Mark the plan step `[x]`**
7. **Update `<unit>-code-summary.md`** with files affected

## Step 7: Team Conventions (enforced per file written)

- **Test IDs (FE)**: every interactive element has `data-testid="<component>-<role>"`
- **Test Keys (Mobile)**: every interactive widget has `Key('<component>-<role>')`
- **Error codes**: every business rule violation maps to a stable error code
- **Logging**: structured logs with request IDs / trace IDs
- **Secrets**: NEVER hardcode — read from env or secret manager
- **Imports**: follow each stack's lint rule (e.g., absolute imports for FE, alphabetical Go imports)

## Step 8: Per-Step Tests Pass Locally

Before moving to the next step, the AI MUST:
- Run the relevant unit tests for the step just executed
- If tests fail, fix the source until tests pass
- Do NOT mark the step `[x]` until tests pass

This is "tests must pass at each step" — . Code Review (Stage 13) re-runs tests as a gatekeeper, but at-step testing prevents accumulating broken state.

## Step 9: Update State and Codeg en Summary

`<unit>-code-summary.md`:

```markdown
# Code Generation Summary — <unit>

**Generated at**: <ISO>
**Files created**: <n>
**Files modified**: <n>
**Tests added**: <n>
**Story coverage**: <m of n stories>

## Files
| Path | Created/Modified | Step | Lines |
|------|------------------|------|-------|

## Tests
| Path | Type | Pass | Notes |
|------|------|------|-------|

## Outstanding
- <items deferred — must be addressed before Code Review can PROCEED>
```

Update `aidlc-state.md` `## Stage Status` for this unit:
- 12 Code Generation Part 2 → COMPLETE for <unit>

## Step 10: Stage Checklist

`{unit}-code-generation-checklist.md`:
- [ ] All plan steps `[x]`
- [ ] All per-step tests pass
- [ ] No code written under `aidlc-docs/`
- [ ] No brownfield duplicates created (`*_modified.<ext>`)
- [ ] Story coverage matches Story Traceability table
- [ ] `data-testid` / `Key` conventions applied
- [ ] No hardcoded secrets
- [ ] Lint passes locally (full lint runs at Code Review)

## Step 11: Completion Message

```markdown
# Code Generation — <unit> — Complete ✅

- **Files created**: <n>
- **Files modified**: <n>
- **Tests added**: <n>
- **Stories covered**: <m of n>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to Code Review (Stage 13) for AI-DLC verdict
```

Wait for explicit user approval, then invoke `construction/code-review.md` for this unit.

---

## Anti-patterns

- ❌ Skipping the Gate #3 wait (writing code before sign-off)
- ❌ Generating code without first loading the conventions file for each stack
- ❌ Marking a step `[x]` without running its tests
- ❌ Generating files with hardcoded secrets / API keys
- ❌ Brownfield: creating `Foo_v2.ts` instead of modifying `Foo.ts`
- ❌ Greenfield: putting application code under `aidlc-docs/`
- ❌ Forgetting to apply opted-in extension rules during generation (post-hoc fixes are wasteful)

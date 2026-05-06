---
name: lint-aggregator
description: |
  Use when running Check 1 (Linting) of the AI-DLC Stage 13 Code Review verdict (Gate #4). Detects which stacks the unit touched, runs the per-stack linter and formatter (ESLint or Biome for JS/TS, ruff check + ruff format for Python, gofmt + golangci-lint for Go, dart format + dart analyze for Dart), and produces a unified per-unit lint-report.md that becomes the Check 1 row of the Gate #4 verdict block. Pass criterion is zero errors AND zero format violations across all stacks. Warnings are surfaced but not blocking unless the Security extension promotes them.
aidlc:
  sensitive: false
---

# Lint Aggregator

## When to Use (AI-DLC context)

This skill fires at **Stage 13 — Code Review** (`../../aidlc-rule-details/construction/code-review.md`) Check 1. The Code Review stage explicitly delegates lint duty to this skill: its output becomes the Check 1 row in the Gate #4 verdict block.

It runs alongside three sibling aggregators (`sast-aggregator`, `test-runner-aggregator`, `multi-specialist-code-review`) — together they produce the four rows of the verdict.

## What It Does

1. Reads `unit-of-work.md` to discover which stacks the unit touched
2. Reads `stack-selection.md` to know exactly which lint tool was chosen per stack (Block A.4 / B.4 / C.3 / D.3 / E)
3. Reads the unit's code-summary to identify changed/created files
4. For each in-scope stack, runs the configured linter and formatter on the unit's files (or — Bugfix Tier — on changed files only)
5. Captures errors, warnings, and format violations exactly as the tool emits them
6. Emits a unified `<unit>-lint-report.md` with per-stack summary tables + verbatim findings
7. Computes the Check 1 verdict: ✅ Pass (zero errors AND zero format violations) or ❌ Fail

## Per-stack tool table

| Stack | Lint tools (per Stack Selection choices) |
|-------|------------------------------------------|
| Frontend | ESLint (flat config) + Prettier — OR — Biome — choose one per Block A.4; plus `tsc --noEmit` |
| Backend Node | Same as Frontend; plus `tsc --noEmit` |
| Backend Python | `ruff check` + `ruff format --check`; plus `mypy` (or `pyright`) |
| Backend Go | `gofmt -l` (must output empty); `go vet`; `golangci-lint run` |
| Mobile Flutter | `dart format --set-exit-if-changed`; `dart analyze --fatal-infos --fatal-warnings` |

## Inputs

- `aidlc-docs/aidlc-state.md` (Tier, detected stacks, opted-in extensions)
- `aidlc-docs/inception/units/unit-of-work.md` (unit's stacks)
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (chosen lint tools)
- `aidlc-docs/construction/{unit}/code/<unit>-code-summary.md` (file list — used for Bugfix-Tier scoping)
- The actual source tree under workspace root

## Outputs

- `aidlc-docs/construction/{unit}/code-review/<unit>-lint-report.md` (the Check 1 artifact)

Report format:

```markdown
# Lint Report — <unit>

**Generated at**: <ISO 8601>
**Tier**: <Greenfield | Feature | Bugfix>
**Files checked**: <n>
**Stacks**: <list>

## Summary
| Stack | Errors | Warnings | Format violations |
|-------|--------|----------|-------------------|
| Frontend | 0 | 3 | 0 |
| Backend Node | 0 | 0 | 0 |
| ... | ... | ... | ... |

## Findings
### Errors
<verbatim tool output: file:line:column messages>

### Warnings
<...>

### Format violations
<...>

## Verdict
- ✅ Pass — 0 errors AND 0 format violations across all stacks
  -- OR --
- ❌ Fail — <one-sentence cause>
```

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: All — but Bugfix Tier scopes execution to changed files only

## Team Conventions Applied

- **Pass criterion**: zero errors AND zero format violations across every in-scope stack. **Warnings do not block by default** — unless the Security extension promotes specific warnings (e.g., `eslint-plugin-security` warnings on a security-flagged unit).
- **Run the chosen tool** — never silently substitute Biome for ESLint or vice versa; if Block A.4 said ESLint, the report uses ESLint
- **Verbatim output preserved** — the report quotes the linter's actual output rather than summarizing, so the pod can find the exact lines flagged
- **Bugfix Tier scoping**: only files in the unit's diff (since last commit on the working branch) are linted, to keep the loop fast on small fixes
- **Configuration validation**: if a chosen lint tool isn't installed or its config is missing, the skill emits a setup error (not a lint pass) — Code Review verdict cannot be PROCEED on a setup failure

## Tier-Specific Behavior

- **Greenfield** / **Feature**: lint every file the unit created or modified
- **Bugfix**: lint only files in the unit's diff (changed in this branch since main)

## Failure modes the skill handles

- **Lint tool not installed**: emit a setup error in the report; Code Review BLOCK with "fix dev environment"
- **Config file missing** (e.g., `.eslintrc` absent): same — setup error
- **Stack-selection mismatch** (e.g., ESLint chosen but Biome config present): emit a configuration-conflict error
- **No source files in scope** (e.g., docs-only change): report `Files checked: 0` and Verdict: ✅ Pass with note "no source code touched"

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-review.md` § Check 1
- Stack conventions: `../../aidlc-rule-details/construction/stacks/*-conventions.md`
- Sibling skills: `../sast-aggregator/SKILL.md`, `../test-runner-aggregator/SKILL.md`, `../multi-specialist-code-review/SKILL.md`
- Compliance hooks: extensions/security/baseline (when enabled, certain warnings escalate to errors per SECURITY-04, SECURITY-05)

## Trigger-test prompts

1. "Using AI-DLC, run Check 1 of Code Review for the auth UoW." (should trigger Stage 13 Check 1)
2. "Lint the unit before generating the verdict block." (should trigger)
3. "Run ESLint and ruff on the changed files." (should trigger — multi-stack lint)
4. "Run the SAST scan." (should NOT trigger — that's sast-aggregator)
5. "Generate the Dockerfile." (should NOT trigger — wrong stage)

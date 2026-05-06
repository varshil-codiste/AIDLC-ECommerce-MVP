---
name: test-runner-aggregator
description: |
  Use when running Check 3 (Test Results) of the AI-DLC Stage 13 Code Review verdict (Gate #4). Detects which stacks the unit touched, runs unit tests per stack with the chosen framework (Vitest/Jest for JS/TS, pytest for Python, go test -race -cover for Go, flutter test --coverage for Dart), captures pass/fail counts and coverage, and produces a per-unit test-report.md that becomes the Check 3 row of the Gate #4 verdict block. Pass criterion is zero failing tests AND coverage at or above the NFR threshold per stack.
aidlc:
  sensitive: false
---

# Test Runner Aggregator

## When to Use (AI-DLC context)

This skill fires at **Stage 13 — Code Review** (`../../aidlc-rule-details/construction/code-review.md`) Check 3. It runs the unit's **unit tests** (not integration / e2e / contract — those run later at Stage 14 Build & Test).

The skill's output becomes the Check 3 row in the Gate #4 verdict block.

## What It Does

1. Detects which stacks are in scope from `unit-of-work.md`
2. Reads test-framework choice from Stack Selection per stack
3. Reads coverage threshold from `nfr-requirements.md` (or applies the default per Tier — see below)
4. Runs the unit-test command per stack with coverage enabled
5. Aggregates results: total / pass / fail / skip / coverage% per stack
6. Captures verbatim failure tracebacks (per failure)
7. Detects coverage shortfalls vs NFR threshold and lists files dragging coverage down
8. Computes Check 3 verdict: ✅ Pass (zero failures AND coverage ≥ threshold per stack) or ❌ Fail
9. Re-runs flaky failures up to 3× before declaring failure (per standard anti-flake convention from `code-review.md` anti-patterns)

## Per-stack test command table

| Stack | Test command (typical) |
|-------|------------------------|
| Frontend | `vitest run --coverage` / `jest --ci --coverage` (per Block A.4 / B.3) |
| Backend Node | Same as Frontend |
| Backend Python | `pytest --cov=src --cov-fail-under=<threshold>` |
| Backend Go | `go test ./... -race -cover` (race detector mandatory) |
| Mobile Flutter | `flutter test --coverage` |

## Inputs

- `aidlc-docs/aidlc-state.md` (Tier, detected stacks)
- `aidlc-docs/inception/units/unit-of-work.md`
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (test-framework choices)
- `aidlc-docs/construction/{unit}/nfr-requirements/<unit>-nfr-requirements.md` (coverage NFR if defined)
- `aidlc-docs/construction/{unit}/code/<unit>-code-summary.md` (changed-file list — used for Bugfix scoping)
- The actual source + test trees under workspace root

## Outputs

- `aidlc-docs/construction/{unit}/code-review/<unit>-test-report.md` (the Check 3 artifact)

Report shape:

```markdown
# Test Report — <unit>

**Generated at**: <ISO 8601>
**Tier**: <…>
**Tests run**: <n>

## Summary
| Stack | Suite | Total | Pass | Fail | Skip | Coverage |
|-------|-------|-------|------|------|------|----------|
| Frontend | components | 42 | 42 | 0 | 0 | 87% |
| Backend Node | unit + integration | 71 | 71 | 0 | 0 | 91% |
| Backend Python | unit | 38 | 36 | 2 | 0 | 78% |
| ... | ... | ... | ... | ... | ... | ... |

## Failures
### test_user_signup_blocks_duplicate_email (Backend Python)
<full traceback>

## Coverage Below NFR Target
- NFR-MAINT-001 requires ≥ 80% line coverage
- Backend Python at 78% — failing NFR
- Files dragging coverage down: <list>

## Flake Re-runs
- <test name> — flake detected on attempt 1, passed on attempt 2 (note in audit.md)

## Verdict
- ✅ Pass — 0 failing tests AND coverage ≥ NFR threshold for every stack
  -- OR --
- ❌ Fail — <one-sentence cause>
```

## Coverage thresholds

| Source | Threshold |
|--------|-----------|
| NFR-MAINT-001 in `nfr-requirements.md` | use that value (skill reads it) |
| Greenfield Tier default (no NFR set) | 80% line coverage |
| Feature Tier default | no regression vs prior coverage on changed files |
| Brownfield Bugfix default | no regression vs prior coverage |

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: All

## Team Conventions Applied

- **Pass criterion**: zero failing tests AND coverage at or above the NFR threshold per stack
- **Race detector required for Go** — `go test -race` is mandatory regardless of Tier; flaking races are not "tolerated"
- **Flake handling**: a failure that disappears on a clean re-run within the same invocation (max 3 attempts) is flagged in the Flake Re-runs section but doesn't fail the verdict; persistent failures count
- **Coverage tracked per stack**, not aggregated — a 95% FE + 70% BE combination still fails if BE NFR is 80%
- **Verbatim failure output** preserved for each failure so the pod can pinpoint root cause without re-running
- **Bugfix scoping**: tests run only for files in the unit's diff + their direct test files; full suite skipped to keep the loop fast

## Tier-Specific Behavior

- **Greenfield**: every test in every in-scope stack runs; full coverage reported
- **Feature**: every test in the unit's stacks runs; coverage compared against prior baseline if present
- **Bugfix**: tests scoped to changed files + their associated test files; coverage threshold relaxes to "no regression vs baseline"

## Failure modes

- **Test framework not installed / not configured**: setup error → BLOCK
- **Tests time out**: emit partial report with the timeout noted; ❌ Fail with "test timeout"
- **Coverage tool fails to produce report** (configuration issue): ❌ Fail with "coverage tool error"

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-review.md` § Check 3
- Stack conventions: `../../aidlc-rule-details/construction/stacks/*-conventions.md` (per-stack test framework rules)
- NFR rule: `../../aidlc-rule-details/construction/nfr-requirements.md` (where the coverage threshold lives)
- Sibling skills: `../lint-aggregator/SKILL.md`, `../sast-aggregator/SKILL.md`, `../multi-specialist-code-review/SKILL.md`
- Upstream: `./upstream/README.md`

## Trigger-test prompts

1. "Using AI-DLC, run Check 3 of Code Review for the auth UoW." (should trigger Stage 13 Check 3)
2. "Run unit tests with coverage and produce the test-report.md." (should trigger)
3. "Run pytest and vitest on the changed files." (should trigger — multi-stack test runner)
4. "Run integration tests across all UoWs." (should NOT trigger — that's Stage 14 Build & Test)
5. "Run the linter." (should NOT trigger — that's lint-aggregator)

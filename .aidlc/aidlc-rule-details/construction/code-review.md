# Code Review

**Stage**: 13 (always-execute, per-UoW) — **NEW team-specific stage**
**Gate**: Gate #4 — AI-DLC verdict + pod countersign
**Purpose**: Automatically validate the code generated for ONE Unit of Work before it goes to Build & Test or deployment. Run four mandatory checks (lint, security scan, tests, AI review) and emit a **PROCEED** or **BLOCK** verdict. Only on PROCEED + pod countersign does the workflow advance.

**Skills invoked at this stage** — each row of the verdict block is literally the output of one skill, making the verdict mechanically reproducible:

| Verdict row | Skill | Pass criterion |
|-------------|-------|----------------|
| Check 1 — Lint | [`lint-aggregator`](../../skills/construction/lint-aggregator/SKILL.md) | 0 errors AND 0 format violations across all in-scope stacks |
| Check 2 — Security (SAST) | [`sast-aggregator`](../../skills/construction/sast-aggregator/SKILL.md) | 0 Critical AND 0 High; every applicable Security extension rule Compliant or N/A |
| Check 3 — Tests | [`test-runner-aggregator`](../../skills/construction/test-runner-aggregator/SKILL.md) | 0 failing tests AND coverage ≥ NFR threshold per stack |
| Check 4 — AI Review | [`multi-specialist-code-review`](../../skills/construction/multi-specialist-code-review/SKILL.md) | 0 Reject findings AND ≤ 2 Concerns (else PROCEED-with-caveats or BLOCK) |

If the AI/ML lifecycle extension is enabled and an LLM eval suite exists, the [`llm-eval-harness`](../../skills/extensions/llm-eval-harness/SKILL.md) skill also fires as part of Check 3 — its pass-rate result joins the test-runner output.

---

## Why This Stage Exists

Code Generation produces a lot of code in one bolt. Without a structured review:
- Lint errors silently accumulate
- Security regressions ship
- Tests pass per-step but break in aggregate
- Subtle correctness issues slip through

AI-DLC inserts an automated review stage. The AI runs the same checks a senior engineer would, in a fixed order, and emits a deterministic verdict. The pod still countersigns because product correctness needs human judgment — but the AI catches everything mechanical first.

---

## Prerequisites

- Stage 12 (Code Generation) Part 2 complete for this unit
- All conventions files for chosen stacks loaded
- Opted-in extension rule files loaded
- Lint / test / security tooling installed (greenfield: scaffolded in Stage 12 Step 1; brownfield: pre-existing)

---

## The Four Mandatory Checks

The AI runs these in order. Output is recorded in dedicated report files under `aidlc-docs/construction/{unit}/code-review/`.

### Check 1 — Linting (`{unit}-lint-report.md`)

For each stack in scope, run the chosen linter / formatter on every file the unit touched:

| Stack | Tools |
|-------|-------|
| Frontend | ESLint / Biome (per Block A.4 choice in Stack Selection); Prettier; tsc --noEmit (TS) |
| Backend Node | ESLint + Prettier OR Biome; tsc --noEmit |
| Backend Python | ruff check + ruff format; mypy or pyright |
| Backend Go | golangci-lint OR staticcheck; gofmt -l (must be empty) |
| Mobile Flutter | dart analyze; dart format --set-exit-if-changed |

**Result format**:

```markdown
# Lint Report — <unit>

**Generated at**: <ISO>
**Files checked**: <n>

## Summary
| Stack | Errors | Warnings | Format violations |
|-------|--------|----------|-------------------|
| Frontend | 0 | 3 | 0 |
| Backend Node | 0 | 0 | 0 |
| ... | ... | ... | ... |

## Findings
### Errors
<exact tool output, file:line:column messages>

### Warnings
<…>

## Verdict
- ✅ Pass — 0 errors AND 0 format violations
- ❌ Fail — any errors OR any format violations
```

**Pass criterion**: zero errors AND zero format violations across all stacks. Warnings are surfaced but not blocking unless extension rules promote them (e.g., the Security extension may upgrade certain warnings).

### Check 2 — Code Security (`{unit}-security-report.md`)

Per stack:

| Stack | SAST tool | Dependency scan |
|-------|-----------|-----------------|
| Frontend | ESLint security plugin (`eslint-plugin-security`) | `npm audit` / `pnpm audit` / `yarn audit` |
| Backend Node | `eslint-plugin-security`; semgrep rules | `npm audit` |
| Backend Python | `bandit`; semgrep | `pip-audit` / `safety` |
| Backend Go | `gosec` | `govulncheck` |
| Mobile Flutter | `dart analyze` (security lints in analysis_options.yaml) | `dart pub outdated --mode=security` |

**Plus**: apply each opted-in **Security extension rule** (`extensions/security/baseline/security-baseline.md`) — at this stage the AI verifies SECURITY-01 through SECURITY-15 against the generated code, not just at build-time.

**Result format**:

```markdown
# Security Report — <unit>

**Generated at**: <ISO>
**SAST tools run**: <list>
**Dependency scans run**: <list>

## SAST Findings
| Severity | Count | Tool | Top examples |
|----------|-------|------|--------------|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 1 | bandit | hardcoded password placeholder in test fixture (false positive) |
| Low | 3 | … | … |

## Dependency Vulnerabilities
| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |

## Extension Rule Compliance (Security extension only — if enabled)
| Rule | Status | Notes |
|------|--------|-------|
| SECURITY-01 (Encryption at rest/transit) | ✅ Compliant | <evidence> |
| SECURITY-02 | ✅ Compliant | … |
| SECURITY-05 (Input validation) | ⚠️ Partial | <list gaps> |
| ... | ... | ... |

## Verdict
- ✅ Pass — 0 Critical AND 0 High AND every applicable extension rule is Compliant or N/A
- ❌ Fail — any Critical OR High SAST OR dep-scan finding, OR any Non-compliant extension rule
```

False positives can be marked `[~] N/A: <reason>` per `common/checklist-conventions.md`, but each one needs justification. The AI generates the marking; the pod can revoke at countersign.

### Check 3 — Test Results (`{unit}-test-report.md`)

Run the unit's tests:

| Stack | Test command (typical) |
|-------|------------------------|
| Frontend | `vitest run` / `jest --ci` / `npm test` |
| Backend Node | `vitest run` / `jest --ci` |
| Backend Python | `pytest` |
| Backend Go | `go test ./... -race -cover` |
| Mobile Flutter | `flutter test --coverage` |

**Result format**:

```markdown
# Test Report — <unit>

**Generated at**: <ISO>
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

## Verdict
- ✅ Pass — 0 failing tests AND coverage ≥ NFR threshold for every stack
- ❌ Fail — any failing test OR coverage below NFR threshold
```

If the project doesn't define a coverage NFR, the default threshold is **80% line coverage** for greenfield, **no regression vs prior coverage** for brownfield.

### Check 4 — AI Review (`{unit}-ai-review.md`)

The AI performs a structured code review against the generated code. Categories:

| Category | What's evaluated |
|----------|------------------|
| **Correctness vs Functional Design** | Does the code implement every business rule (BR-001…) listed in `business-rules.md`? Are workflows in `business-logic-model.md` faithfully implemented? |
| **Correctness vs NFR Design** | Are patterns from `nfr-design-patterns.md` implemented (retries, breakers, caches)? Are logical components from `logical-components.md` wired correctly? |
| **Cross-stack contract adherence** | Do FE / BE / Mobile use the contract identically (no drift)? |
| **team conventions** | `data-testid` / `Key` conventions applied? Error codes consistent? Structured logging? No hardcoded secrets? |
| **Risk** | Any subtle bug, race condition, off-by-one, integer-overflow, regex-DOS, SQL-injection-style risk the SAST didn't catch? |
| **Maintainability** | Functions over 50 lines, files over 400 lines, deeply nested code, magic numbers, missing error context |
| **Story coverage** | Every story listed in `unit-of-work.md` has implementing files in `<unit>-code-summary.md` |

Result format:

```markdown
# AI Review — <unit>

**Reviewing model**: <model name + version>
**Reviewed at**: <ISO>
**Files reviewed**: <n>

## Findings

### Category: Correctness vs Functional Design
- ✅ BR-001 implemented in `src/auth/signup.service.ts:42-58`
- ❌ BR-005 ("Refresh token rotates on use") — implementation rotates on issue but not on use; see `src/auth/token.service.ts:120`
- …

### Category: Correctness vs NFR Design
- …

### Category: Cross-stack contract
- …

### Category: team conventions
- …

### Category: Risk
- ⚠️ Concern: `src/payments/charge.service.ts:88` uses Decimal arithmetic but compares with `==` instead of `.equals()` — float-style equality issue
- …

### Category: Maintainability
- …

### Category: Story coverage
- ✅ US-001 implemented (auth.signup.service + auth/signup.test)
- ❌ US-007 has no implementing files — gap

## Verdict
- ✅ Approve — no Reject, ≤ 2 Concern items
- ⚠️ Concerns — > 2 Concern items but no Reject; pod review required
- ❌ Reject — any Reject finding (correctness gap, contract drift, story gap)
```

The AI Review is the most subjective check — when in doubt, the AI errs toward `Concern` rather than `Approve`.

---

## The AI-DLC Verdict (the gate output)

After all four checks complete, the AI synthesizes the verdict. Generate `aidlc-docs/construction/{unit}/code-review/{unit}-code-review-report.md` summarizing all four reports, then create `{unit}-code-review-signoff.md` per `common/approval-gates.md` § Gate #4.

**Verdict logic**:

| Check 1 (Lint) | Check 2 (Security) | Check 3 (Tests) | Check 4 (AI Review) | Verdict |
|----------------|--------------------|------------------|----------------------|---------|
| ✅ | ✅ | ✅ | ✅ Approve | **PROCEED** |
| ✅ | ✅ | ✅ | ⚠️ Concerns | **PROCEED with caveats** (pod must explicitly accept concerns at countersign) |
| ❌ | * | * | * | **BLOCK** (lint must pass) |
| * | ❌ | * | * | **BLOCK** (security must pass) |
| * | * | ❌ | * | **BLOCK** (tests must pass) |
| * | * | * | ❌ Reject | **BLOCK** (AI review reject) |

The verdict block embedded in the signoff file (per `common/approval-gates.md` § Gate #4) MUST include the four check rows + verdict + rationale + (if BLOCK) the required actions list.

---

## Step-by-Step Execution

1. **Run Check 1 (Lint)** — produce `<unit>-lint-report.md`
2. **Run Check 2 (Security)** — produce `<unit>-security-report.md`
3. **Run Check 3 (Tests)** — produce `<unit>-test-report.md`
4. **Run Check 4 (AI Review)** — produce `<unit>-ai-review.md`
5. **Synthesize report** — produce `<unit>-code-review-report.md` summarizing all four
6. **Generate verdict block** — per `common/approval-gates.md` § Gate #4
7. **Generate signoff template** — `<unit>-code-review-signoff.md` with verdict block + signature lines
8. **If verdict is BLOCK**: pause and announce. Do NOT prompt pod for countersign.
9. **If verdict is PROCEED or PROCEED-with-caveats**: announce and request pod countersign.

---

## BLOCK Loop

If the verdict is **BLOCK**:

1. The signoff file's `## AI-DLC Code Review Verdict` block lists "required actions before re-review"
2. The AI returns to Code Generation Part 2 (Stage 12b) and addresses each required action — running tests at each step per team convention
3. After all required actions are addressed, the AI re-runs Code Review from Step 1 (lint, security, tests, AI review) — producing a NEW set of report files (overwrite previous; archive prior under `<unit>-code-review-report.<ts>.bak.md`)
4. A new verdict block is emitted
5. Loop until verdict is PROCEED or PROCEED-with-caveats, OR until the pod explicitly halts the loop and escalates to NFR Design / Functional Design / Application Design

**Loop limit**: if the AI cannot reach PROCEED after **3 cycles**, it pauses and asks the pod to either (a) accept escalation, (b) loosen NFR thresholds (with sign-off), or (c) restart the unit's design.

---

## ⛔ GATE #4: Pod Countersignature

When verdict is PROCEED or PROCEED-with-caveats:

1. The signoff file is presented to the pod
2. Tech Lead reviews the four reports and the verdict; signs
3. Dev reviews same; signs
4. Validation per `common/approval-gates.md`:
   - Verdict is PROCEED or PROCEED-with-caveats (not BLOCK)
   - Verdict was generated within the last 7 days
   - Both signatures present, named pod members, ISO dates within 30 days
   - No unresolved `## Pod Override` (the pod's mechanism to dispute the AI verdict)

If the pod refuses to sign because they believe the code is wrong despite a green AI verdict, they write the issue under `## Pod Override` in the signoff. The AI must address the override and re-run Code Review. (Pod Override is rare but powerful — it represents human judgment of product correctness the AI couldn't catch.)

---

## Stage Checklist

`{unit}-code-review-checklist.md`:

```markdown
- [ ] Check 1 (Lint) ran — report file exists
- [ ] Check 2 (Security) ran — report file exists
- [ ] Check 3 (Tests) ran — report file exists
- [ ] Check 4 (AI Review) ran — report file exists
- [ ] Synthesized review report exists
- [ ] Verdict block generated and validates per common/approval-gates.md
- [ ] If verdict was BLOCK: required actions list is non-empty
- [ ] If verdict was PROCEED: pod countersignatures collected
- [ ] If pod overrode: override addressed and re-review run
- [ ] aidlc-state.md updated to STAGE 13: COMPLETE for <unit>
```

---

## Completion Message

### When verdict is PROCEED + pod has signed

```markdown
# Code Review — <unit> — Complete ✅

**Verdict**: PROCEED
**Lint**: ✅  **Security**: ✅  **Tests**: <pass/total> ✅  **AI Review**: ✅ Approve

> **🚀 WHAT'S NEXT?**
>
> ✅ Continue — proceed to <next UoW Functional Design | Build & Test (if last UoW)>
```

### When verdict is BLOCK

```markdown
# Code Review — <unit> — BLOCKED ⛔

**Verdict**: BLOCK
- Lint: <pass/fail>
- Security: <pass/fail>
- Tests: <pass/fail — count>
- AI Review: <Approve/Concerns/Reject>

Required actions before re-review (see <unit>-code-review-signoff.md):
1. <action 1>
2. <action 2>

Returning to Code Generation Part 2 to address findings.
```

---

## Bugfix Tier Considerations

For bugfix tier, all four checks still run, but Check 3 (Tests) focuses on:
- The new regression test for the bug
- Existing tests in the affected file's test suite
- Adjacent test suites flagged as regression-risk in the BR

Coverage threshold relaxes to "no regression vs prior baseline" rather than 80% absolute.

---

## Anti-patterns

- ❌ AI editing its own verdict from BLOCK → PROCEED without re-running checks
- ❌ Pod countersigning a BLOCK verdict to force progression (must address findings)
- ❌ Skipping any of the four checks (all four are mandatory, including for bugfix tier)
- ❌ Treating AI Review as optional fluff — Concern items must be either resolved or explicitly accepted by pod
- ❌ Looping >3 times without escalating — wasted compute and time, indicates a deeper design issue
- ❌ Marking a SECURITY rule N/A without a specific reason

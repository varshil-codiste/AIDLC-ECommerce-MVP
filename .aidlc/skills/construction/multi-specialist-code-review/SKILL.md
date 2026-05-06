---
name: multi-specialist-code-review
description: |
  Use when running Check 4 (AI Review) of the AI-DLC Stage 13 Code Review verdict (Gate #4). Performs a structured AI review of the unit's generated code from three specialist perspectives (bug-hunter, security-auditor, quality-reviewer) and synthesizes a single verdict (Approve, Concerns, or Reject) covering correctness vs Functional Design, NFR pattern implementation, cross-stack contract adherence, team conventions, risk, maintainability, and story coverage. Produces a per-unit ai-review.md that becomes the Check 4 row of the Gate #4 verdict block.
aidlc:
  sensitive: false
---

# Multi-Specialist Code Review

## When to Use (AI-DLC context)

This skill fires at **Stage 13 — Code Review** (`../../aidlc-rule-details/construction/code-review.md`) Check 4 — the AI Review row of the Gate #4 verdict block. It runs after lint, SAST, and test runs (Checks 1–3) so the AI Review can incorporate their findings.

It models a small panel of specialists (bug-hunter, security-auditor, quality-reviewer) inspired by the neolab/code-review skill bundle, then synthesizes their per-perspective findings into a single Approve / Concerns / Reject verdict. The pod countersign at Gate #4 reviews this output.

## What It Does

1. Loads the unit's design artifacts (`functional-design/`, `nfr-design/`, `application-design.md`, stories) — the source of truth the implementation should match
2. Loads the unit's generated code (`<unit>-code-summary.md` + actual source files)
3. Loads the Check 1–3 reports so it can cross-reference (e.g., a SAST finding becomes context, not a duplicate AI flag)
4. Runs three specialist perspectives sequentially:
   - **Bug-hunter**: race conditions, off-by-one, integer overflow, regex DoS, missing null checks, unbounded loops, error-swallowing
   - **Security-auditor**: misuse cases, IDOR, missing authz checks, dangerous deserialization, untrusted-input flows, SSRF, hardcoded paths/IPs (separate from SAST — focuses on semantic risks SAST tools miss)
   - **Quality-reviewer**: function/file size, deep nesting, magic numbers, missing context in errors, duplicated code patterns, naming consistency
5. Categorizes findings into the **seven review categories** (per `code-review.md` § Check 4)
6. Synthesizes a verdict: Approve (≤ 2 Concern items, no Reject), Concerns (> 2 Concerns, no Reject), or Reject (any Reject finding)
7. Writes `<unit>-ai-review.md` and emits the Check 4 row for the verdict block

## The seven review categories

(matches `../../aidlc-rule-details/construction/code-review.md` § Check 4 categories)

| Category | What's evaluated |
|----------|------------------|
| Correctness vs Functional Design | Every business rule from `business-rules.md` is implemented; workflows in `business-logic-model.md` are faithful |
| Correctness vs NFR Design | Patterns from `nfr-design-patterns.md` are wired (retries, breakers, caches); logical components from `logical-components.md` are present |
| Cross-stack contract adherence | FE / BE / Mobile use the same contract identically (no schema drift) |
| team conventions | `data-testid` (FE) / `Key()` (Mobile), error codes, structured logging, no hardcoded secrets |
| Risk | Subtle correctness bugs SAST didn't catch (race conditions, off-by-one, etc.) |
| Maintainability | Functions ≤ 50 lines, files ≤ 400 lines, readable nesting, no magic numbers, error context preserved |
| Story coverage | Every story listed in `unit-of-work.md` has implementing files in `<unit>-code-summary.md` |

## Inputs

- `aidlc-docs/inception/units/unit-of-work.md` (story list)
- `aidlc-docs/inception/user-stories/stories.md`
- `aidlc-docs/inception/application-design/application-design.md`
- `aidlc-docs/construction/{unit}/functional-design/*.md`
- `aidlc-docs/construction/{unit}/nfr-design/*.md`
- `aidlc-docs/construction/{unit}/code/<unit>-code-summary.md`
- `aidlc-docs/construction/{unit}/code-review/<unit>-lint-report.md` (Check 1)
- `aidlc-docs/construction/{unit}/code-review/<unit>-security-report.md` (Check 2)
- `aidlc-docs/construction/{unit}/code-review/<unit>-test-report.md` (Check 3)
- The actual source tree

## Outputs

- `aidlc-docs/construction/{unit}/code-review/<unit>-ai-review.md` (the Check 4 artifact)

Report shape:

```markdown
# AI Review — <unit>

**Reviewing model**: <model name + version>
**Reviewed at**: <ISO 8601>
**Files reviewed**: <n>

## Findings

### Category: Correctness vs Functional Design
- ✅ BR-001 implemented in `src/auth/signup.service.ts:42-58`
- ❌ BR-005 ("Refresh token rotates on use") — implementation rotates on issue but not on use; see `src/auth/token.service.ts:120`

### Category: Correctness vs NFR Design
- ⚠️ Concern: P-RES-001 retry policy implemented but breaker thresholds don't match NFR-AVAIL-001
- ...

### Category: Cross-stack contract
- ✅ FE generated client matches BE OpenAPI; no drift detected
- ...

### Category: team conventions
- ❌ `signup-form-submit` button missing `data-testid` in `app/auth/signup/page.tsx:88`

### Category: Risk
- ⚠️ Concern: `src/payments/charge.service.ts:88` uses Decimal but compares with `==` instead of `.equals()` — float-style equality issue

### Category: Maintainability
- ⚠️ Concern: `summarizer.service.ts:processChunk` is 92 lines — recommend extracting validation
- ...

### Category: Story coverage
- ✅ US-001 implemented (auth.signup.service + auth/signup.test)
- ❌ US-007 has no implementing files — gap

## Verdict
- ✅ Approve — no Reject, ≤ 2 Concern items
  -- OR --
- ⚠️ Concerns — > 2 Concern items, no Reject; pod review required
  -- OR --
- ❌ Reject — <one-sentence cause: which Reject finding>
```

## Verdict synthesis logic

Following `code-review.md` § Verdict logic table:

| Result table | AI Review row |
|--------------|---------------|
| 0 Reject AND ≤ 2 Concern | ✅ Approve |
| 0 Reject AND > 2 Concern | ⚠️ Concerns (Gate #4 verdict becomes PROCEED-with-caveats; pod must explicitly accept) |
| ≥ 1 Reject | ❌ Reject (Gate #4 BLOCK) |

When in doubt, the skill **errs toward Concern rather than Approve** — the pod's countersign is the safety net.

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no (read-only analysis)
- **Tier scope**: All — Bugfix scopes the seven categories to changed files (story coverage check still runs in full since a bugfix doesn't add stories)

## Team Conventions Applied

- **Three specialists run sequentially**, not as one giant prompt — keeps each perspective focused; their outputs are the inputs to the synthesis step
- **Cross-references Check 1–3 reports** so the AI Review doesn't duplicate findings (a SAST finding is acknowledged in the AI Review with "(see security-report.md)" rather than re-flagged)
- **Story-coverage check is mechanical** — every US-ID in the UoW is searched for in the code-summary's "Stories addressed" sections; missing IDs are Reject findings
- **Pod Override mechanism honored**: the Code Review stage rule documents that the pod can refuse to sign even on PROCEED if they spot something the AI missed; this skill notes "Pod Override possible at signoff" in its output footer

## Tier-Specific Behavior

- **Greenfield**: all three specialists, all seven categories, full review depth
- **Feature**: all three specialists, all seven categories, scoped to feature surface (existing untouched code not reviewed)
- **Bugfix**: bug-hunter + quality-reviewer (security-auditor optional unless Security extension on); seven categories scoped to changed files

## Failure modes

- **Required upstream artifact missing** (e.g., `business-rules.md` doesn't exist): emit a setup error → BLOCK with "ensure prior stages produced their artifacts"
- **No code generated yet** (skill called before Codegen Part 2): refuse to run; redirect to Stage 12 Part 2

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-review.md` § Check 4
- Sibling skills: `../lint-aggregator/SKILL.md`, `../sast-aggregator/SKILL.md`, `../test-runner-aggregator/SKILL.md`
- Compliance hooks: extensions/security/baseline (when on, security-auditor specialist gets the SECURITY-01..15 rules as additional context)
- Upstream: `./upstream/README.md` (neolab/code-review)

## Trigger-test prompts

1. "Using AI-DLC, run Check 4 of Code Review for the auth UoW." (should trigger Stage 13 Check 4)
2. "Generate the AI Review for the orders UoW after Checks 1-3 ran." (should trigger)
3. "Run the multi-specialist review and synthesize the verdict." (should trigger)
4. "Run the linter and security scan." (should NOT trigger — those are sibling skills)
5. "Update the rollback plan." (should NOT trigger — wrong stage)

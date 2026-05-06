---
name: sast-aggregator
description: |
  Use when running Check 2 (Code Security) of the AI-DLC Stage 13 Code Review verdict (Gate #4). Runs the per-stack SAST tooling (eslint-plugin-security + npm audit for JS/TS, bandit + semgrep + pip-audit for Python, gosec + govulncheck for Go, dart analyze + dart pub outdated for Dart) PLUS verifies every applicable rule of the Security baseline extension (SECURITY-01..15) against the unit's generated code. Produces a per-unit security-report.md that becomes the Check 2 row of the Gate #4 verdict block. Pass criterion is zero Critical or High findings AND every applicable extension rule is Compliant or N/A.
aidlc:
  sensitive: false
---

# SAST Aggregator

## When to Use (AI-DLC context)

This skill fires at **Stage 13 — Code Review** (`../../aidlc-rule-details/construction/code-review.md`) Check 2. It is the security gatekeeper of the Code Review verdict block: a single Critical or High finding forces Gate #4 to BLOCK.

It composes with the **Security Baseline extension** when that extension is opted-in: in addition to running per-stack SAST and dependency scans, the skill verifies every applicable rule SECURITY-01 through SECURITY-15 against the actual generated code, producing a Compliance Summary table that the Gate #4 signoff embeds.

## What It Does

1. Reads the unit's stacks and extension configuration from state
2. Runs **SAST** per stack on the unit's files
3. Runs **dependency vulnerability scan** per stack
4. If Security extension is enabled: walks SECURITY-01..15, marks each Compliant / Non-compliant / N/A with cited evidence
5. Aggregates findings into a unified `<unit>-security-report.md`
6. Computes the Check 2 verdict: ✅ Pass (zero Critical, zero High, no Non-compliant extension rules) or ❌ Fail

## Per-stack tool table

| Stack | SAST tool | Dependency scan |
|-------|-----------|-----------------|
| Frontend | `eslint-plugin-security` (when running ESLint) | `npm audit` / `pnpm audit` / `yarn audit` |
| Backend Node | `eslint-plugin-security`; semgrep rules | `npm audit` |
| Backend Python | `bandit`; `semgrep` | `pip-audit` (preferred) or `safety` |
| Backend Go | `gosec` | `govulncheck` |
| Mobile Flutter | `dart analyze` (security lints in `analysis_options.yaml`) | `dart pub outdated --mode=security` |

## Inputs

- `aidlc-docs/aidlc-state.md` (Tier, detected stacks, **Extension Configuration**)
- `aidlc-docs/inception/units/unit-of-work.md`
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md`
- `aidlc-docs/construction/{unit}/code/<unit>-code-summary.md`
- `../../aidlc-rule-details/extensions/security/baseline/security-baseline.md` (the 15 rules — only loaded if extension opted in)
- The actual source tree under workspace root

## Outputs

- `aidlc-docs/construction/{unit}/code-review/<unit>-security-report.md` (the Check 2 artifact)

Report shape:

```markdown
# Security Report — <unit>

**Generated at**: <ISO 8601>
**SAST tools run**: <list>
**Dependency scans run**: <list>
**Security extension enabled**: <yes | no>

## SAST Findings
| Severity | Count | Tool | Top examples |
|----------|-------|------|--------------|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 1 | bandit | hardcoded password placeholder in test fixture (false positive marked N/A) |
| Low | 3 | ... | ... |

## Dependency Vulnerabilities
| Severity | Count | Examples |
|----------|-------|----------|

## Extension Rule Compliance (only if Security extension enabled)
| Rule | Status | Notes |
|------|--------|-------|
| SECURITY-01 (Encryption at rest/transit) | Compliant | <evidence: file:line> |
| SECURITY-02 | Compliant | ... |
| SECURITY-05 (Input validation) | Non-compliant | <gap details + remediation> |
| ... | ... | ... |

## Verdict
- ✅ Pass — 0 Critical AND 0 High AND every applicable extension rule Compliant or N/A
  -- OR --
- ❌ Fail — <one-sentence cause>
```

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no (read-only analysis)
- **Tier scope**: All — Bugfix scopes SAST to changed files; the extension-rule compliance walk runs in full regardless of Tier (since the rules apply to the existing surface, not just the diff)

## Team Conventions Applied

- **Pass criterion**: zero Critical AND zero High in SAST and dep-scan combined; every applicable Security extension rule Compliant or N/A
- **N/A reasons must be specific** — "no payments in scope → SECURITY-01 N/A on Stripe-related rules" is OK; bare "N/A" is rejected per `common/checklist-conventions.md`
- **False positives** can be marked `[~] N/A: <reason>` per the same convention; the skill auto-detects common false positives (e.g., hardcoded password placeholder in a test fixture file) but the pod can revoke any auto-marking at countersign
- **Default-deny on uncertain evidence**: per `extensions/security/baseline/security-baseline.md` § Defaults — the skill does NOT auto-mark Compliant without cited evidence; it errs toward Non-compliant + remediation suggestion
- **The Compliance Summary table is the source of truth** for the Gate #4 verdict's compliance reporting; this skill's table is what the signoff embeds

## Tier-Specific Behavior

- **Greenfield**: full SAST + dep-scan + extension rule walk
- **Feature**: same — security gates don't relax for features
- **Bugfix**: SAST scoped to changed files; dep-scan and extension-rule walk still run in full (a bugfix could regress a security rule that was Compliant before)

## Failure modes

- **SAST tool not installed**: setup error → BLOCK; the verdict cannot be PROCEED on missing tooling
- **Dep-scan times out / network unavailable**: emit a partial report with the network failure noted; verdict ❌ Fail with the cause "dep-scan incomplete"
- **Security extension config inconsistent** (e.g., state says enabled but rule file missing): emit a setup error

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-review.md` § Check 2
- Security extension: `../../aidlc-rule-details/extensions/security/baseline/security-baseline.md`
- Sibling skills: `../lint-aggregator/SKILL.md`, `../test-runner-aggregator/SKILL.md`, `../multi-specialist-code-review/SKILL.md`
- Upstream skill: `./upstream/README.md` (trailofbits/static-analysis, trailofbits/audit-context-building, trailofbits/insecure-defaults)

## Trigger-test prompts

1. "Using AI-DLC, run Check 2 of Code Review for the orders UoW." (should trigger Stage 13 Check 2)
2. "Run the security scan and produce the security-report.md." (should trigger)
3. "Run bandit, gosec, and the Security extension rules on the unit." (should trigger)
4. "Run the lint check." (should NOT trigger — that's lint-aggregator)
5. "Set up Datadog dashboards." (should NOT trigger — wrong stage)

---
name: production-readiness-checker
description: |
  Use when validating the Production Readiness checklist at AI-DLC Stage 18 (Production Readiness, Gate #5). Mechanically walks all 12 sections (A-L) of the production-readiness-checklist.md and verifies each item against actual artifacts in the project rather than relying on the pod marking it x by hand. Auto-marks items with cited evidence; surfaces items that need human verification; refuses to mark anything Compliant without specific evidence. Produces production-readiness-validation.md that the pod uses to confidently sign Gate #5.
aidlc:
  sensitive: false
---

# Production Readiness Checker

## When to Use (AI-DLC context)

This skill fires at **Stage 18 — Production Readiness** (`../../aidlc-rule-details/operations/production-readiness.md`) Step 1, after the readiness checklist has been generated. Instead of the pod ticking 100+ items by hand and risking false positives, the skill walks each item, finds evidence, and marks `[x]`, `[~] N/A: <reason>`, or leaves `[ ]` for manual verification.

It is the **mechanical verifier** that makes Gate #5 honest.

## What It Does

For each of the 12 sections (A–L) in `production-readiness-checklist.md`, the skill:

1. Maps the item to one or more concrete checks against the project artifacts
2. Runs the check
3. Marks the item:
   - `[x]` with citation if the check passes (e.g., "see `<unit>-test-report.md` line 12 — coverage 91%")
   - `[~] N/A: <specific reason>` if the item genuinely doesn't apply (e.g., "no payments in scope")
   - `[ ]` if the item requires human verification and the AI cannot confidently infer (e.g., "manual screen-reader test on critical flow")
4. Lists items left as `[ ]` in a "Manual verification required" section so the pod knows exactly where to focus

## Per-section evidence sources

| Section | Verification approach |
|---------|------------------------|
| A. Code & Build | Reads all `<unit>-code-review-signoff.md` files (Gate #4 verdicts), `build-and-test-summary.md`; verifies all PROCEED with countersignatures |
| B. Configuration & Secrets | Greps the source tree for hardcoded secrets, scans Dockerfiles + IaC for env-var loading; runs gitleaks/trufflehog dry-run on git history |
| C. Database & Data | Verifies `migrations/` exists per stack with forward+rollback; reads BR data-retention policy and confirms it appears in code |
| D. Infrastructure | Reads `<env>-outputs.md` from terraform-iac-author; verifies multi-AZ flag, auto-scaling bounds, TLS cert validity |
| E. Observability | Reads `wiring-summary.md`, `dashboards/*.json`, `alerts.yaml`; verifies test alert was fired |
| F. Reliability | Greps for `/health` and `/ready` endpoints per service; verifies SIGTERM handler, retry/breaker patterns from NFR Design |
| G. Security | Reads `<unit>-security-report.md` files (Gate #4 Check 2 outputs); confirms every applicable Security extension rule is Compliant or N/A |
| H. Mobile | Verifies App Store Connect / Play Console assets exist; privacy policy URL valid; ATT/Data Safety form artifacts present |
| I. AI/ML (extension on) | Reads `llm-eval-harness` outputs; verifies eval pass rate ≥ NFR threshold on production prompts; verifies guardrails enabled |
| J. Accessibility (extension on) | Reads accessibility-test outputs; verifies axe / a11y-checker zero violations; pod confirms manual-pass artifact exists |
| K. Compliance & Legal | Verifies privacy-policy / ToS URLs in BR are reachable; cookie banner code present if relevant |
| L. Documentation & Handover | Verifies README updated; runbook + rollback-plan exist; pod roster current |

## Inputs

- `aidlc-docs/operations/production-readiness/production-readiness-checklist.md` (template + populated items)
- All upstream artifacts: signoffs, test reports, security reports, build-and-test-summary, observability outputs, IaC outputs
- `aidlc-docs/aidlc-state.md` (extension config, Tier)

## Outputs

- `aidlc-docs/operations/production-readiness/production-readiness-validation.md` (the mechanical-verification report — the pod reads this alongside the checklist before signing Gate #5)
- Inline updates to `production-readiness-checklist.md` with `[x]` / `[~] N/A` / `[ ]` markings + citations

Validation report shape:

```markdown
# Production Readiness Validation — <project>

**Generated at**: <ISO 8601>
**Tier**: <…>

## Auto-marked Compliant
| Item | Evidence |
|------|----------|
| A.1 Every UoW has Gate #4 signed | auth-code-review-signoff.md, orders-code-review-signoff.md, … |
| ... | ... |

## Auto-marked N/A
| Item | Reason |
|------|--------|
| H.1 App Store Connect listing | Project has no Mobile UoW — N/A by scope |
| ... | ... |

## Manual verification required
| Item | Why AI cannot infer |
|------|----------------------|
| J.2 Manual screen-reader test on critical flow | Requires human-in-the-loop testing |
| K.1 Privacy policy live + linked from product | URL reachable but content review needed by Legal |
| ... | ... |

## Items the AI tried to mark but could not find evidence
| Item | Suggested remediation |
|------|------------------------|
| F.4 Rate limiting active and tested | No load-test artifact found showing rate-limit behavior — request load test |
| ... | ... |

## Verdict
- ✅ All sections have at minimum [x] or [~] N/A — checklist ready for pod signoff
- ⚠️ X items remain [ ] — pod must address before Gate #5
- ❌ Y items have insufficient evidence — checklist is not yet ready for Gate #5
```

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no (read-only verification + checklist marking)
- **Tier scope**: All — Bugfix tier may use light-form per `tiered-mode.md`

## Team Conventions Applied

- **No silent passes**: every `[x]` carries an explicit citation pointing at the artifact and section/line that proves it
- **No vague N/A**: reasons must be specific per `common/checklist-conventions.md` (e.g., "no payments in scope" not just "N/A")
- **Default-deny on uncertain evidence**: when an item could be interpreted multiple ways, the skill leaves it `[ ]` and lists it under "Manual verification required" — the pod fills it in
- **Cross-references the verdict block**: Gate #4 Code Review verdicts are the ground truth for Section A; Section G compliance summary copies from Check 2 outputs
- **Reads but does not modify** signoff files or any sub-stage artifact — the skill only updates the readiness checklist + writes its own validation report

## Tier-Specific Behavior

- **Greenfield**: full 12-section walk; every section evaluated; manual-verification list comprehensive
- **Feature**: full walk but sections H/I/J may be auto-N/A if scope didn't add Mobile / AI/ML / new UI
- **Bugfix**: light-form per `tiered-mode.md` (Sections A, B, F, G, L always apply; rest can be auto-N/A)

## Failure modes

- **Required upstream artifact missing** (e.g., `<unit>-code-review-signoff.md` not found for a UoW): emit "checklist cannot be validated — Stage 14 prerequisites not met" and refuse to mark anything Compliant
- **Production-readiness-checklist.md not generated yet**: refuse, point user to `production-readiness.md` Step 1
- **Pod countersign attempted on a checklist with `[ ]` items**: per `common/approval-gates.md`, the gate validation refuses; this skill's report is what the pod uses to drive resolution

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/operations/production-readiness.md`
- Universal checklist convention: `../../aidlc-rule-details/common/checklist-conventions.md`
- Gate validation rules: `../../aidlc-rule-details/common/approval-gates.md`
- Sibling skills: `../observability-wirer/SKILL.md`, `../terraform-iac-author/SKILL.md`
- Code Review aggregators (sources of truth for Section A & G): `../../skills/construction/multi-specialist-code-review/SKILL.md`, `../../skills/construction/sast-aggregator/SKILL.md`

## Trigger-test prompts

1. "Using AI-DLC, validate the production-readiness checklist." (should trigger Stage 18)
2. "Walk every section of the readiness checklist and mark items with citations." (should trigger)
3. "Check whether we're ready to sign Gate #5." (should trigger)
4. "Sign the BR signoff." (should NOT trigger — that's a pod action, not a skill)
5. "Wire up Sentry." (should NOT trigger — that's observability-wirer)

# Production Readiness

**Stage**: 18 (always-execute) — final stage of the workflow
**Gate**: Gate #5 (pod sign-off)
**Purpose**: Verify the project is genuinely ready to go live. Produce a go-live checklist + runbook + rollback plan, then collect Gate #5 sign-off. After Gate #5 the workflow is complete.

**Skills invoked at this stage**: [`production-readiness-checker`](../../skills/operations/production-readiness-checker/SKILL.md) (not sensitive). Mechanically walks all 12 sections (A–L) of the readiness checklist, marks each item `[x]` with citation / `[~] N/A: <reason>` / `[ ]` (manual verification required). Default-deny on uncertain evidence — no silent passes. The pod uses the skill's validation report alongside the checklist to confidently sign Gate #5.

---

## Prerequisites

- Stage 14 (Build & Test) complete with overall PASS
- Stage 15 (Deployment Guide) complete
- Stage 16 (IaC) complete or N/A
- Stage 17 (Observability Setup) complete or N/A
- All Gate #4 (Code Review) signoffs collected for every UoW

---

## Execution Steps

### Step 1: Generate the Production Readiness Checklist

Generate `aidlc-docs/operations/production-readiness/production-readiness-checklist.md` per `common/checklist-conventions.md`. Use the comprehensive template below; mark items N/A only with specific reasons (per `common/checklist-conventions.md`).

```markdown
# Production Readiness Checklist

**Tier**: <…>
**Project**: <…>
**Generated at**: <ISO>

## A. Code & Build
- [ ] Every UoW has Gate #4 signed (PROCEED verdict + pod countersign)
- [ ] Stage 14 (Build & Test) overall status = PASS
- [ ] All NFRs from `nfr-requirements.md` met in test results
- [ ] No critical or high vulnerabilities in security reports
- [ ] Lint / type-check / format clean across all stacks

## B. Configuration & Secrets
- [ ] Production env vars documented in `.env.example` per stack
- [ ] All secrets loaded from a secret manager (not env files in container images)
- [ ] No secrets in git history (run a scanner like gitleaks / trufflehog)
- [ ] CORS allow-list explicit for production domains
- [ ] Feature flags configured for the launch (kill-switch in place)

## C. Database & Data
- [ ] Migration plan documented (forward + rollback)
- [ ] Migrations rehearsed against staging with prod-like data volume
- [ ] Backup configured + tested (point-in-time recovery if applicable)
- [ ] Data retention policy implemented per BR § "data retention"
- [ ] Index strategy reviewed for the expected query patterns

## D. Infrastructure
- [ ] IaC applied to production environment
- [ ] Production resources sized per NFR-SCAL targets
- [ ] Multi-AZ enabled (if NFR-AVAIL ≥ 99.9%)
- [ ] Auto-scaling configured (min/max per NFR)
- [ ] Load balancer health checks pointing at app `/health` endpoints
- [ ] DNS records configured (with low TTL for the launch window)
- [ ] TLS certificates valid (≥ 30 days remaining)
- [ ] WAF rules enabled (if Security extension on; SECURITY-04 / -07)

## E. Observability
- [ ] Logs flowing into the observability platform
- [ ] Metrics dashboard live for every service
- [ ] Traces propagating across services
- [ ] Error tracker (Sentry / equivalent) receiving events
- [ ] Alerts firing into the chosen channel; tested with a synthetic incident
- [ ] Dashboards bookmarked / shared with the on-call rotation

## F. Reliability
- [ ] Health endpoints implemented per service (/health, /ready)
- [ ] Graceful shutdown implemented (SIGTERM handler)
- [ ] Retry / circuit breaker patterns from NFR Design verified at runtime
- [ ] Rate limiting active and tested
- [ ] DLQ configured for every queue with alerts on growth

## G. Security
- [ ] Security extension rules: every Compliant or N/A (no Non-compliant)
- [ ] HTTPS-only on every public endpoint
- [ ] Authn / Authz reviewed by Tech Lead (or Security review if the team has one)
- [ ] Audit log captures auth events, privileged actions, data access (per data classification)
- [ ] Dependency scan re-run within last 7 days (prod images)
- [ ] No default credentials (e.g., postgres user 'postgres' with default password) in production

## H. Mobile (only if Mobile in scope)
- [ ] App Store Connect / Play Console listing complete
- [ ] Privacy policy linked
- [ ] App-tracking-transparency / Play Data Safety form completed accurately
- [ ] App icons + splash screens for all required densities
- [ ] Deep links / universal links tested
- [ ] Push notification certificates / FCM keys provisioned
- [ ] Beta testers / TestFlight / Play Internal testers added

## I. AI/ML (only if AI/ML extension on)
- [ ] Eval suite passing on the production model + prompts
- [ ] Prompt registry version pinned for production
- [ ] Hallucination guardrails enabled and tested
- [ ] PII scrubbing on inputs verified
- [ ] Cost monitoring + budget alerts in place
- [ ] Fallback behavior on LLM provider outage

## J. Accessibility (only if Accessibility extension on)
- [ ] axe-core / pa11y / Flutter a11y test reports zero violations
- [ ] Manual screen-reader test on at least one critical flow per stack
- [ ] Keyboard-only navigation verified on web

## K. Compliance & Legal
- [ ] Privacy policy live + linked from the product
- [ ] Terms of Service live + linked
- [ ] Cookie banner / consent management (if applicable)
- [ ] GDPR / data-subject-request workflow ready (if applicable)
- [ ] Industry-specific compliance items per BR (HIPAA / PCI / SOC 2)

## L. Documentation & Handover
- [ ] README updated with run / deploy / debug instructions
- [ ] Runbook (next section) written and reviewed
- [ ] Rollback plan written and reviewed
- [ ] On-call rotation defined and the pod members onboarded
- [ ] Stakeholder demo done (if required by BR)
- [ ] Customer success / sales briefed (if applicable)

## Modification Log
| Timestamp (ISO) | Editor | Change |
```

Pre-fill items from upstream artifacts where evidence exists (e.g., "Stage 14 PASS" can mark item A2 `[x]` automatically with a citation). Items that require manual verification stay `[ ]` until a human ticks them.

---

### Step 2: Generate the Runbook

`aidlc-docs/operations/production-readiness/runbook.md`:

```markdown
# Runbook

## Service Topology
<Mermaid showing services, dependencies, data flow — derived from Application Design + IaC outputs>

## Deployments
- How to deploy: <CI workflow name + tagging convention>
- How to roll back: <see rollback-plan.md>
- Maintenance window policy: <…>

## Health Checks
| Service | Endpoint | Expected response |
|---------|----------|-------------------|
| frontend | https://app.example.com/api/health | 200 OK |
| backend-node | https://api.example.com/health | 200 OK |
| ... | ... | ... |

## Common Operations
### Restart a service
- <command / cloud console steps>

### Scale a service
- <…>

### Rotate secrets
- <…>

### Run database migration
- <…>

## Common Incidents

### High error rate on backend-node
1. Check the dashboard: <link>
2. Check Sentry for top errors: <link>
3. Common causes:
   - DB connection exhausted → check pool metrics
   - External API down → check breaker status
   - Bad deploy → check the last deploy time vs error onset
4. Mitigations:
   - Roll back: <command>
   - Scale up DB pool: <…>
   - Disable feature flag: <…>

### LLM provider outage (AI/ML extension)
1. Check provider status page
2. Activate fallback (cached responses / second provider)
3. Inform users via banner

### <more incident types per service / per NFR>

## Escalation
- L1: on-call engineer (PagerDuty rotation)
- L2: Tech Lead (named in pod.md)
- L3: engineering leadership (severity-1 only)

## Useful Links
- Dashboards: <list>
- Logs: <link>
- Sentry: <link>
- Cloud console: <link>
- IaC repo: <link>
```

---

### Step 3: Generate the Rollback Plan

`aidlc-docs/operations/production-readiness/rollback-plan.md`:

```markdown
# Rollback Plan

## When to Roll Back
- Error rate > 5x baseline for 10+ minutes
- p95 latency > 3x NFR target for 10+ minutes
- Severity-1 functional bug discovered in production
- Data corruption detected
- Pod-led judgment call (Tech Lead authority)

## Rollback Mechanics by Layer

### Application code (containers)
1. Identify the previous-good image tag in registry
2. Re-deploy via CI or directly:
   - GitHub Actions: re-run the release workflow with the prior tag
   - kubectl / ECS / Cloud Run: `<exact command per platform>`
3. Verify health checks pass on the rolled-back version
4. Run a quick smoke test

### Database migration
- Forward migration is reversible: `<rollback command>`
- Forward migration is destructive: rollback requires restore from backup → see "DB restore" below
- Migrations that drop columns / tables MUST be 2-step: ship code that doesn't depend on the column → drop column in a follow-up release

### Configuration / Feature flags
- Toggle the flag off via the flag manager (LaunchDarkly / DevCycle / homemade)
- Communication: post in #announcements within 5 min of toggling

### DB restore (last resort)
1. Stop writes (pause queue consumers; serve maintenance page)
2. Restore from latest snapshot or PITR to a new instance
3. Cut over via DNS / connection string
4. Replay missing writes if recoverable
5. Resume traffic

## Communication Plan
- Internal: Slack #incidents, mention pod
- External: status page update; customer email if outage > 30 min
- Post-mortem: writeup within 5 business days, blameless, action items tracked

## Rehearsal
- Rollback was rehearsed on staging on: <ISO date>
- Rehearsal duration: <minutes>
- Issues found during rehearsal: <list>
```

---

### Step 4: Generate Gate #5 Signoff Template

Per `common/approval-gates.md` § Gate #5 / Production Readiness. Pre-fill:
- "What Is Being Approved" — one-paragraph statement covering scope of go-live
- "Artifacts Referenced" — checklist + runbook + rollback plan + dashboard links
- "Compliance Summary" — final check across every opted-in extension; every rule must be Compliant or N/A
- "Open Risks / Caveats" — any unresolved issues the pod is accepting

For **bugfix Tier light-form**: combined Gate #2 + Gate #5 sign-off allowed in BR signoff per `common/tiered-mode.md`.

### ⛔ GATE #5: Wait for Pod Signatures

Validate per `common/approval-gates.md`. The Production Readiness checklist must have zero `[ ]` items remaining. Items marked `[~] N/A` must have specific reasons.

### Step 5: Update State and Close Workflow

Once Gate #5 is signed:

1. Update `aidlc-state.md`:

```markdown
## Stage Status
| 18 | Production Readiness | COMPLETE |

## Workflow Status
**State**: COMPLETE — ready to release at <ISO timestamp>
```

2. Generate `aidlc-docs/operations/production-readiness/release-record.md`:

```markdown
# Release Record

**Project**: <…>
**Tier**: <…>
**Released at**: <ISO>
**Gate #5 signed by**: Tech Lead <name>, Dev <name>
**Build artifacts**: <image tags / version>
**Cloud target**: <…>
**Rollback contact**: <Tech Lead name + reach>

## Final Compliance Summary
| Extension | Status |
|-----------|--------|
| Security baseline | Compliant |
| PBT | Compliant |
| AI/ML lifecycle | Compliant |
| Accessibility | Compliant |

## Post-release Watch Window
- First 2 hours: synchronous Tech Lead + Dev attention; dashboards open
- First 24 hours: alerts at warning threshold; on-call engaged
- First 7 days: monitor NFR adherence; weekly review

This file marks the formal end of the AI-DLC workflow for this project.
```

3. Log Gate #5 pass + workflow completion in `audit.md`.

### Step 6: Completion Message

```markdown
# Production Readiness — Complete ✅
# AI-DLC workflow complete for this project 🚀

- **Tier**: <…>
- **Gates passed**: 5/5
- **All extensions**: Compliant
- **Release record**: see operations/production-readiness/release-record.md

> **🚀 WHAT'S NEXT?**
>
> ✅ Release at the planned time. Use runbook.md and rollback-plan.md as your operational guides.
> If a future Bolt / Feature / Bugfix needs AI-DLC, start a new workflow with "Using AI-DLC, ..."
```

No further stages — this is the workflow terminus.

---

## Tier-Specific Notes

### Bugfix Tier
- Sections marked "(only if applicable)" can be N/A more aggressively, but Sections A, B, F, G, L are always applicable
- Light-form Gate #5 allowed (combined with BR signoff per `tiered-mode.md`)

### Feature Tier
- Skip sections that don't apply to the feature scope (e.g., a backend-only feature can N/A Section H Mobile)
- Full Gate #5 required

### Greenfield Tier
- Every section applies; no N/A without strong justification
- Full Gate #5 required
- Include a customer-launch communication plan in addition to the internal release record

---

## Anti-patterns

- ❌ Pod signing Gate #5 with `[ ]` items remaining
- ❌ Marking items N/A en masse without specific reasons
- ❌ Skipping the rollback rehearsal
- ❌ Going live without alerts wired up
- ❌ Releasing on a Friday afternoon (team convention: avoid Fri 4pm+ launches unless emergency)
- ❌ Leaving the post-release watch window unstaffed
- ❌ Combining Gates #2 + #5 outside Bugfix Tier (light-form is bugfix-only)

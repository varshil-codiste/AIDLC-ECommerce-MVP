---
name: observability-wirer
description: |
  Use when wiring observability at AI-DLC Stage 17 (Observability Setup). Detects which stacks are present and which observability platform was chosen at Stage 17 (Datadog, OTel-Grafana, cloud-native, or Sentry-only), then wires structured JSON logging, RED/USE metrics, OpenTelemetry tracing, error tracking via Sentry per stack, and dashboards-as-code plus alert definitions tied to NFRs. For LLM-using projects with the AI/ML extension enabled, additionally wires LLM-specific metrics (prompt latency p50/p95/p99, tokens-in/out, eval pass rate, hallucination guardrail trigger rate, token cost). Sensitive sub-action - rotating credentials in a managed observability platform - requires per-action signoff.
aidlc:
  sensitive: true
  blast-radius: secrets
  countersign-required-at: per-action-signoff
---

# Observability Wirer

## When to Use (AI-DLC context)

This skill fires at **Stage 17 — Observability Setup** (`../../aidlc-rule-details/operations/observability-setup.md`) Step 2 (Wire Each Stack). It instruments every detected stack to emit logs / metrics / traces / errors per the platform chosen in the stage's question file.

For LLM-using projects (AI/ML extension enabled), it also wires the LLM-specific metrics required by the AI/ML lifecycle extension.

## What It Does

### Sub-action 1: Wire stacks (read-write, NOT sensitive)

Per stack:

| Stack | Logs | Metrics | Tracing | Errors |
|-------|------|---------|---------|--------|
| Frontend | `@datadog/browser-logs` or RUM | OTel | OTel | Sentry browser SDK |
| Backend Node | `pino` + `pino-http`; secret redaction | OTel SDK + autoinstrumentation | OTel | Sentry Node SDK (NestJS / Express / Fastify variant per Stack Selection) |
| Backend Python | `structlog` or stdlib + `python-json-logger` | OTel SDK | OTel SDK | Sentry Python SDK (FastAPI / Django / Flask / Celery variant) |
| Backend Go | `log/slog` JSON handler; request-ID middleware | OTel SDK + `otelhttp` | OTel SDK | Sentry Go SDK |
| Mobile Flutter | `logger` package + Sentry RUM | (Datadog or Sentry RUM) | (RUM trace) | Sentry Flutter SDK (iOS + Android + Web) |

Required structured-log fields enforced per stack: `timestamp`, `level`, `message`, `service`, `version`, `request_id`, `user_id` (if authenticated), `trace_id`, `span_id`, `environment`.

### Sub-action 2: Generate dashboards-as-code (read-write, NOT sensitive)

Per UoW + a top-level project dashboard. Saved to `aidlc-docs/operations/observability/dashboards/`:

- `<project>-overview.json` (Datadog) or `.json` (Grafana) — service health, error rate, p95 latency, active users
- `<unit>.json` per UoW — endpoint RED metrics, top errors, dependency latency
- `mobile.json` (when Mobile in scope) — crash-free sessions, ANR rate, network errors, app-launch time
- `ai-ml.json` (when AI/ML extension on) — prompt latency, eval pass rate, hallucination guardrail rate, token cost

### Sub-action 3: Generate alert definitions (read-write, NOT sensitive)

Per NFR target in `nfr-requirements.md`, an alert is generated:

- NFR-AVAIL-001 (uptime SLO) → 5xx-rate alert
- NFR-PERF-001 (p95 latency) → p95 alert
- NFR-MLQ-001 (eval pass rate) → eval-regression alert
- DB / queue / mobile-specific alerts

Output: `aidlc-docs/operations/observability/alerts.yaml` (machine-applyable via the platform's API or IaC).

### Sub-action 4: Rotate credentials in managed platform (SENSITIVE)

When the skill needs to rotate credentials in Datadog / Sentry / cloud-monitoring (e.g., regenerating an ingest key after a leak):

1. Refuses to run if no `<ts>-observability-secret-rotate-signoff.md` at `aidlc-docs/operations/skill-actions/`
2. Validates per `skill-policy.md` § 2
3. If validation fails: blocked-by-policy audit entry, refusal
4. If valid: performs rotation, captures both old + new key fingerprints in the apply history; never logs the secret values themselves

## Inputs

- `aidlc-docs/aidlc-state.md` (Tier, detected stacks, **Extension Configuration**)
- `aidlc-docs/operations/observability/observability-questions.md` (platform choice, error tracker, retention, alerting channel)
- `aidlc-docs/construction/{unit}/nfr-requirements/<unit>-nfr-requirements.md` (alert thresholds)
- `aidlc-docs/inception/units/unit-of-work.md`
- For sub-action 4: `aidlc-docs/operations/skill-actions/<ts>-observability-secret-rotate-signoff.md`

## Outputs

For sub-actions 1–3:
- Source-tree edits per stack to wire logs/metrics/traces/errors
- `aidlc-docs/operations/observability/dashboards/*.json`
- `aidlc-docs/operations/observability/alerts.yaml`
- `aidlc-docs/operations/observability/wiring-summary.md`

For sub-action 4:
- Rotation history entry in `aidlc-docs/operations/observability/credential-rotation-history.md`
- Two audit.md entries

## Governance

- **Free-roam invocation** for sub-actions 1–3
- **Sensitive flag**: yes for sub-action 4 (credential rotation)
- **Blast radius**: secrets
- **Countersign required at**: per-action-signoff
- **Tier scope**: Greenfield, Feature; Bugfix when adding observability is the fix

## Team Conventions Applied

- **Required log fields enforced** per stack (timestamp, level, message, service, version, request_id, user_id, trace_id, span_id, environment)
- **PII redaction** in log middleware — matches data classification from BR; full request bodies never logged in production
- **Trace propagation across services** uses W3C Trace Context headers
- **Alerts always carry a runbook link** pointing back to `operations/production-readiness/runbook.md`
- **Sampling rates configured per env** — production traces typically sampled at 10–25% (head-based) for high-traffic services to control cost
- **Mobile observability is mandatory** when Mobile is in scope — Sentry/RUM is not optional
- **AI/ML metrics enforced** when extension on — prompt latency p50/p95/p99, token counts, eval pass rate, hallucination rate, token cost
- **Secrets via env** — Datadog API keys / Sentry DSN never hardcoded; loaded from secret manager at runtime

## Tier-Specific Behavior

- **Greenfield**: full wiring across every stack; every dashboard; every alert
- **Feature**: scope to changed services and any new endpoints; existing dashboards updated additively
- **Bugfix**: skip unless adding observability is the fix; in that case scope to the specific service touched

## Per-action signoff template (sub-action 4)

```
aidlc-docs/operations/skill-actions/<ISO-timestamp>-observability-secret-rotate-signoff.md
```

Per `skill-policy.md` § 2 universal template:

```markdown
# Skill Action Signoff — Rotate observability credential

**Skill**: observability-wirer
**Stage**: 17 — Observability Setup
**Action summary**: Rotate <platform> <credential-name> for <env>
**Plan output (dry-run)**: ./<ts>-rotate-plan.md (current key fingerprint, target rotation method)
**Tier**: <…>
**Sensitive flag**: yes — blast-radius=secrets

- [ ] Tech Lead: ____________  Date: ____________  (ISO 8601)
- [ ] Dev:       ____________  Date: ____________  (ISO 8601)

## Plan summary
<key fingerprint, rotation steps, services that depend on this key, expected downtime>

## Risk acknowledgement
<one paragraph: what could fail, what the rollback is, who's notified>
```

## Failure modes

- **Platform credentials unavailable**: setup error → refusal pointing to secret-manager config
- **Stack-mismatch on integration package** (e.g., Sentry Express SDK chosen for a Fastify project): emit a clear remediation note before wiring
- **Alert API rate-limited**: queue + retry; if persistent, escalate to setup error
- **Sub-action 4 signoff missing/stale**: blocked-by-policy

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/operations/observability-setup.md`
- Sensitive-skill governance: `../../skills/skill-policy.md` § 2
- AI/ML extension: `../../aidlc-rule-details/extensions/ai-ml/lifecycle/ai-ml-lifecycle.md` (for LLM-specific metrics)
- Sibling skills: `../dockerfile-generator/SKILL.md`, `../terraform-iac-author/SKILL.md`
- Upstream: `./upstream/README.md`

## Trigger-test prompts

1. "Using AI-DLC, wire Sentry across all stacks for the project." (should trigger Stage 17 sub-action 1)
2. "Generate the Datadog dashboards for every UoW." (should trigger sub-action 2)
3. "Create alert definitions matching every NFR target." (should trigger sub-action 3)
4. "Rotate the Datadog API key for production." (should trigger sub-action 4 — SENSITIVE; refuses without signoff)
5. "Run lint on the FE." (should NOT trigger — wrong skill)

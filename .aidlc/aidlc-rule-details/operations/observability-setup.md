# Observability Setup

**Stage**: 17 (conditional)
**Purpose**: Wire logs, metrics, traces, and alerts so the team can operate the project in production. Tool choice depends on the team — common picks: Sentry (errors), Datadog (everything), OpenTelemetry + Grafana stack (open-source), CloudWatch / Cloud Monitoring / Application Insights (cloud-native).

**Skills invoked at this stage**: [`observability-wirer`](../../skills/operations/observability-wirer/SKILL.md). Sub-actions 1–3 (wire stacks, generate dashboards, generate alerts) are not sensitive. Sub-action 4 (rotate credentials in a managed observability platform — e.g., regenerating a leaked Datadog API key) is **sensitive** — refuses without a per-action signoff per `.aidlc/skills/skill-policy.md` § 2. When the AI/ML lifecycle extension is enabled, the wiring includes LLM-specific metrics (prompt latency p50/p95/p99, tokens-in/out, eval pass rate, hallucination guardrail rate, token cost) on the `ai-ml.json` dashboard.

---

## When to Execute

**Execute IF**:
- Greenfield Tier (default)
- Feature Tier when the feature changes service surface
- Existing observability is missing for new services / endpoints

**Skip IF**:
- Internal tool with no production surface
- Bugfix Tier without operational delta

---

## Prerequisites

- Stage 15 (Deployment Guide) complete
- Stage 16 (Infrastructure-as-Code) complete or skipped (some observability resources may live in IaC)
- NFR Requirements `## Observability` section captured the SLOs / log verbosity / alerting expectations

---

## Execution Steps

### Step 1: Choose the Stack

Generate `observability-questions.md`:

```markdown
## Question 1
Primary observability platform?

A) Datadog — unified logs / metrics / traces (Recommended for production projects)
B) OpenTelemetry → Grafana stack (Loki / Mimir / Tempo) — open-source, self-hosted
C) Cloud-native — CloudWatch (AWS) / Cloud Monitoring (GCP) / Azure Monitor
D) Sentry only (error monitoring) — minimal observability footprint
E) New Relic / Honeycomb / Lightstep
X) Other

[Answer]:

## Question 2
Error tracking specifically?

A) Sentry (Recommended — easy integration across all stacks)
B) Datadog Errors
C) Bugsnag / Rollbar
D) Cloud-native (CloudWatch Logs Insights / Cloud Error Reporting)
X) Other

[Answer]:

## Question 3
Log retention requirement?

A) 30 days
B) 90 days (Recommended for production)
C) 1 year
D) 7 years (regulated workloads)
X) Other

[Answer]:

## Question 4
Alerting channel?

A) Slack (Recommended — team default)
B) PagerDuty / Opsgenie (for severity-1)
C) Email
D) Combination — Slack for warnings, PagerDuty for critical
X) Other

[Answer]:
```

Wait for answers. Validate.

### Step 2: Wire Each Stack

For each stack in scope, generate the integration code + config. Place under `<stack-or-service>/src/observability/` or equivalent.

#### Logs (structured, JSON, with correlation IDs)

| Stack | Library | Config |
|-------|---------|--------|
| Frontend | `@datadog/browser-logs` / `@sentry/browser` for errors | sample rate per env |
| Backend Node | `pino` + `pino-http` | JSON, child loggers per request, redact secrets |
| Backend Python | `structlog` or stdlib `logging` + `python-json-logger` | JSON, contextvars for request ID |
| Backend Go | `log/slog` JSON handler | request-ID middleware via context |
| Mobile Flutter | `logger` package + Sentry / Datadog RUM | structured local logs; remote send for errors only |

Required fields in every log line:
- `timestamp` (ISO 8601)
- `level` (error / warn / info / debug)
- `message`
- `service` (e.g., "backend-node-auth")
- `version` (semver from build env)
- `request_id` (UUID per request)
- `user_id` (if authenticated)
- `trace_id` / `span_id` (when tracing is on)
- `environment` (dev / staging / prod)

#### Metrics (RED for HTTP, USE for queues)

For HTTP services — instrument the **R**ate / **E**rrors / **D**uration:

| Stack | Approach |
|-------|----------|
| Backend Node | OpenTelemetry SDK + auto-instrumentation OR Datadog tracer |
| Backend Python | OpenTelemetry SDK (`opentelemetry-instrumentation-fastapi` etc.) |
| Backend Go | OpenTelemetry SDK + `otelhttp` middleware |

For queues / workers — instrument **U**tilization / **S**aturation / **E**rrors.

For LLM apps (AI/ML extension on) — additional metrics:
- Prompt latency p50/p95/p99
- Tokens-in / tokens-out per call
- Eval-suite pass rate (rolling)
- RAG retrieval latency + retrieval-recall
- Hallucination guardrail trigger rate

#### Traces (OpenTelemetry default)

- All HTTP requests get a trace
- Database calls + outbound HTTP calls get child spans
- Background jobs get their own root span (not auto-correlated to a request)
- Trace propagation via W3C Trace Context headers

OpenTelemetry collector config (sketch) in `infra/otel-collector.yaml`:

```yaml
receivers:
  otlp: { protocols: { grpc: {}, http: {} } }
processors:
  batch: {}
  memory_limiter: { check_interval: 1s, limit_mib: 512 }
exporters:
  otlp/datadog: { endpoint: "${DD_INTAKE_URL}", headers: { "DD-API-KEY": "${DD_API_KEY}" } }
service:
  pipelines:
    traces:  { receivers: [otlp], processors: [memory_limiter, batch], exporters: [otlp/datadog] }
    metrics: { receivers: [otlp], processors: [memory_limiter, batch], exporters: [otlp/datadog] }
    logs:    { receivers: [otlp], processors: [memory_limiter, batch], exporters: [otlp/datadog] }
```

### Step 3: Dashboards

Generate one dashboard per UoW + a top-level project dashboard. Save the dashboard-as-code (Datadog JSON / Grafana JSON) under `operations/observability/dashboards/`:

| Dashboard | Panels |
|-----------|--------|
| Project overview | Service health (per-stack), error rate, latency p95, active users |
| Per UoW | Endpoint RED metrics, top errors, dependency latency (DB, cache, queue, external APIs) |
| Mobile (if in scope) | Crash-free sessions, ANR rate, network errors, app-launch time |
| AI/ML (if extension on) | Prompt latency, eval pass rate, hallucination guardrail rate, token cost |

### Step 4: Alerts

Generate alert definitions tied to NFRs:

| NFR | Alert |
|-----|-------|
| NFR-AVAIL-001 (99.9% uptime) | Service down / 5xx rate > 1% over 5 min |
| NFR-PERF-001 (p95 ≤ 250ms) | p95 latency > target × 1.5 over 5 min |
| NFR-MLQ-001 (eval pass rate ≥ 0.95) | Eval pass rate < 0.93 over 1 hour |
| Database | Connection pool exhausted, replica lag > X seconds, low free storage |
| Queue | DLQ growth > N, processing lag > N seconds |
| Mobile | Crash-free session rate < 99.5% on latest version |

Each alert specifies:
- Trigger condition + threshold + duration
- Severity (critical = page, warning = Slack)
- Runbook link (back to `operations/production-readiness/runbook.md`)
- Tags (`service`, `env`, `team`)

Save as `operations/observability/alerts.md` (description) + `operations/observability/alerts.yaml` (machine-readable, applyable via the chosen tool's API or IaC).

### Step 5: Local & Staging Wiring

- Local: docker-compose adds the OTel collector + a local Grafana stack OR a Datadog agent if using Datadog
- Staging: full observability mirror of prod (same dashboards, alerts at warning level only)
- Prod: full observability with alerts wired to chosen channel(s)

### Step 6: Stage Checklist

`observability-setup-checklist.md`:
- [ ] Logs structured (JSON) per stack with required fields
- [ ] Metrics: RED for every HTTP endpoint, USE for every queue/cache
- [ ] Tracing wired across services (W3C trace context preserved across hops)
- [ ] Error tracker (Sentry / equivalent) wired in every stack including Mobile
- [ ] Dashboards: project overview + per-UoW + AI/ML (if extension on)
- [ ] Alerts: one per NFR with measurable target
- [ ] Runbook references in every alert
- [ ] Secrets (API keys, ingest URLs) loaded from env / secret manager
- [ ] Log retention configured per Question 3 answer
- [ ] PII redaction in logs (matches data classification from BR)

### Step 7: Completion Message

```markdown
# Observability Setup — Complete ✅

- **Platform**: <…>
- **Error tracker**: <…>
- **Stacks wired**: <list>
- **Dashboards**: <count>
- **Alerts**: <count>
- **Log retention**: <…>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to Production Readiness (Stage 18 — Gate #5)
```

---

## Anti-patterns

- ❌ Logging without `request_id` — can't correlate
- ❌ Logging full request bodies (potential PII leak)
- ❌ Alerts without runbook links — pages without instructions are useless
- ❌ Alerts on noisy metrics (e.g., raw error count rather than error rate)
- ❌ Sampling traces at 100% in production for high-traffic services (cost spike)
- ❌ Mobile observability skipped (Sentry / RUM is mandatory for any Mobile UoW)
- ❌ AI/ML extension on but no LLM-specific metrics

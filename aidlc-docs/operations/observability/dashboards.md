# Dashboard Definitions — ECommmer-AIDLC

**Platform**: Grafana 11.4 (self-hosted)
**Datasources**: Loki (logs), Prometheus (metrics), Tempo (traces)

---

## Dashboard: Project Overview

**File**: `infra/grafana/dashboards/project-overview.json` (provisioned via Grafana)

| Panel | Query | Type |
|-------|-------|------|
| API health | `up{job="api"}` | Stat (green/red) |
| Web health | `up{job="web"}` | Stat (green/red) |
| Request rate (all endpoints) | `sum(rate(http_server_request_duration_seconds_count[5m]))` | Time series |
| 5xx error rate | `rate(http_server_request_duration_seconds_count{status_code=~"5.."}[5m])` | Time series |
| p95 latency | `histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket[5m])) by (le))` | Gauge |
| Recent errors (Loki) | `{service="api"} \| level="error"` | Logs |

---

## Dashboard: Auth Module (UoW-02)

**File**: `infra/grafana/dashboards/auth.json`

| Panel | Query / Source | Type |
|-------|----------------|------|
| Login success rate | Loki: `count_over_time({event="auth.login"}[5m])` | Time series |
| Login failure rate | Loki: `count_over_time({service="api"} \|= "auth.invalid_credentials" [5m])` | Time series |
| Lockouts triggered | Loki: `count_over_time({service="api"} \|= "lockout:login" [1h])` | Stat |
| Token reuse events | Loki: `{event="auth.refresh.reuse_detected"}` | Logs |
| Logout events | Loki: `count_over_time({event="auth.logout"}[5m])` | Time series |
| Auth denied (role gate) | Loki: `{event="authz.denied"}` | Logs |
| Login p95 latency | Prometheus: argon2 verify timing histogram (available post-UoW-04) | Gauge |

---

## Dashboard: AI/ML (UoW-04+)

**File**: `infra/grafana/dashboards/ai-ml.json` — provisioned but empty until UoW-04

| Panel | Metric | Notes |
|-------|--------|-------|
| LLM prompt latency p50/p95/p99 | `llm_request_duration_seconds` histogram | UoW-04 |
| Tokens in/out per agent | `llm_tokens_total{agent, model, role}` counter | UoW-04 |
| LLM cost (USD/day) | `llm_cost_usd_total` counter | UoW-04 |
| Eval pass rate (rolling 1h) | `eval_pass_rate` gauge | UoW-06+ |
| Hallucination guardrail rate | `guardrail_triggered_total / llm_requests_total` | UoW-06+ |
| RAG retrieval latency | `rag_retrieval_duration_seconds` histogram | UoW-11+ |

---

## Trace Exploration

Available via **Grafana → Explore → Tempo** datasource once UoW-04 ships OTel instrumentation:
- Search by `service.name = api`, `http.route`, `status.code`
- Trace-to-logs correlation: clicking a span opens the Loki logs for that `trace_id`

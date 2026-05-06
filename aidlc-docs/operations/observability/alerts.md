# Alert Definitions — ECommmer-AIDLC

**Platform**: Grafana Alerting (email delivery)
**Alert email**: configured via `GF_SMTP_*` env vars in `docker-compose.observability.yml`
**Retention**: 30 days (Loki + Prometheus + Tempo)

---

## Alert Rules

| ID | Name | Condition | Duration | Severity | Runbook |
|----|------|-----------|----------|----------|---------|
| ALT-01 | API down | `up{job="api"} == 0` | 1 min | Critical | See runbook §1 |
| ALT-02 | API 5xx rate high | `rate(http_server_request_duration_seconds_count{status_code=~"5.."}[5m]) / rate(http_server_request_duration_seconds_count[5m]) > 0.01` | 5 min | Warning | See runbook §2 |
| ALT-03 | Auth login p95 latency high | `histogram_quantile(0.95, rate(http_server_request_duration_seconds_bucket{http_route="/api/v1/auth/login"}[10m])) > 2` | 10 min | Warning | See runbook §3 |
| ALT-04 | Redis unavailable | Loki query: `count_over_time({service="api"} |= "redis.unavailable" [5m]) > 0` | 2 min | Critical | See runbook §4 |
| ALT-05 | Postgres connection failures | Loki query: `count_over_time({service="api"} |= "PrismaClientKnownRequestError" [5m]) > 5` | 5 min | Warning | See runbook §5 |
| ALT-06 | Sentry error spike (via Sentry alerts) | Error rate > 10 events/hour for any issue | — | Warning | Sentry dashboard |
| ALT-07 | Disk usage >80% on VPS | Node exporter metric (Stage 16+ concern) | — | Warning | Check docker volumes |

---

## Grafana Alert Configuration

All alerts configured in Grafana UI under **Alerting → Alert rules**. Email contact point:

```yaml
# Grafana contact point (provisioning — future)
apiVersion: 1
contactPoints:
  - orgId: 1
    name: email-ops
    receivers:
      - uid: email-ops
        type: email
        settings:
          addresses: ${ALERT_EMAIL}
          singleEmail: false
```

---

## Deferred Alerts (UoW-04+)

| Alert | Requires |
|-------|---------|
| LLM prompt latency p95 > 3s | UoW-04 cost meter + OTel instrumentation |
| LLM token cost > $X/day | UoW-04 cost meter |
| Eval pass rate < 0.93 | AI/ML eval suite (UoW-06+) |
| Hallucination guardrail trigger rate > 5% | AI/ML guardrails (UoW-06+) |

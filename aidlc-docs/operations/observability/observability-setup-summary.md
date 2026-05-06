# Observability Setup Summary — Stage 17

**Generated at**: 2026-05-05T11:20:00Z

---

## Stack

| Layer | Tool | Hosting |
|-------|------|---------|
| Logs | Grafana Loki 3.3 | Self-hosted on VPS |
| Metrics | Prometheus 3.1 | Self-hosted on VPS |
| Traces | Grafana Tempo 2.7 | Self-hosted on VPS |
| Dashboards / Alerting | Grafana 11.4 | Self-hosted on VPS, port 3100 |
| OTel ingestion | OTel Collector contrib 0.116 | Self-hosted on VPS |
| Error tracking | Sentry free tier | sentry.io hosted |

---

## Wired Stacks

| Stack | Sentry | OTel (traces/metrics) | Structured logs |
|-------|--------|----------------------|-----------------|
| API (NestJS) | ✅ `@sentry/nestjs` | Infrastructure ready; app code in UoW-04 | ✅ pino JSON |
| Web (Next.js) | ✅ `@sentry/nextjs` | Infrastructure ready; app code in UoW-04 | Next.js default |

---

## Artifacts Generated

| File | Purpose |
|------|---------|
| `docker-compose.observability.yml` | Observability stack overlay (Grafana, Loki, Prometheus, Tempo, OTel Collector) |
| `infra/otel-collector.yaml` | OTLP receiver → Loki + Prometheus + Tempo exporters |
| `infra/loki/loki-config.yaml` | Loki with 30-day retention |
| `infra/prometheus.yaml` | Prometheus scrape config |
| `infra/tempo.yaml` | Tempo trace storage (30-day retention) |
| `infra/grafana/provisioning/datasources/` | Loki + Prometheus + Tempo datasource provisioning |
| `infra/grafana/provisioning/dashboards/` | Dashboard auto-discovery provisioning |
| `api/src/observability/sentry.ts` | Sentry init (NestJS, no-op if SENTRY_DSN unset) |
| `web/sentry.{client,server,edge}.config.ts` | Sentry init per runtime |
| `web/next.config.mjs` | Wrapped with `withSentryConfig` |

---

## Alerts

7 alert rules defined covering:
- API + service availability (ALT-01)
- 5xx error rate (ALT-02)
- Auth login latency (ALT-03)
- Redis + Postgres connectivity (ALT-04, ALT-05)
- Sentry error spike (ALT-06)

Delivery: **Email** via Grafana SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL` env vars).

---

## Log Retention

| Store | Retention | Config |
|-------|-----------|--------|
| Loki | 30 days | `limits_config.retention_period: 720h` |
| Prometheus | 30 days | `--storage.tsdb.retention.time=30d` |
| Tempo | 30 days | `compactor.compaction.block_retention: 720h` |

---

## Required Env Vars (new)

| Var | Where | Purpose |
|-----|-------|---------|
| `SENTRY_DSN` | API + Web server | Sentry error reporting |
| `NEXT_PUBLIC_SENTRY_DSN` | Web client (browser) | Sentry browser SDK |
| `SENTRY_ORG` | CI (release.yml) | Source map upload |
| `SENTRY_PROJECT` | CI (release.yml) | Source map upload |
| `SENTRY_AUTH_TOKEN` | CI (release.yml) | Source map upload |
| `GRAFANA_USER` / `GRAFANA_PASSWORD` | VPS `.env.prod` | Grafana admin |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | VPS | Email alerts |
| `ALERT_EMAIL` | VPS | Alert recipient |

---

## Deferred to UoW-04

- OTel SDK in API (`@opentelemetry/sdk-node`, `@opentelemetry/instrumentation-nestjs-core`, Prisma instrumentation)
- `request_id` and `trace_id` correlation in pino log lines
- AI/ML cost meter metrics (`llm_tokens_total`, `llm_cost_usd_total`)

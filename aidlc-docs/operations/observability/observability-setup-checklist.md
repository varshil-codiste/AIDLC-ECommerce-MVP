# Observability Setup Checklist — Stage 17

**Generated at**: 2026-05-05T11:20:00Z

---

- [x] Platform selected: OpenTelemetry → self-hosted Grafana stack (Loki/Prometheus/Tempo)
- [x] Error tracker: Sentry free tier (hosted at sentry.io)
- [x] Log retention configured: 30 days (Loki `retention_period: 720h`; Prometheus `--storage.tsdb.retention.time=30d`; Tempo `block_retention: 720h`)
- [x] Alerting channel: Email via Grafana SMTP (GF_SMTP_* env vars)
- [x] Grafana docker-compose overlay (`docker-compose.observability.yml`) — Grafana, Loki, Prometheus, Tempo, OTel Collector
- [x] OTel Collector config (`infra/otel-collector.yaml`) — OTLP gRPC/HTTP receivers, Loki/Prometheus/Tempo exporters
- [x] Loki config with 30-day retention (`infra/loki/loki-config.yaml`)
- [x] Grafana datasource provisioning (`infra/grafana/provisioning/datasources/`)
- [x] Dashboard provisioning directory (`infra/grafana/provisioning/dashboards/`)
- [x] Sentry wired into API (`api/src/observability/sentry.ts`, `api/src/main.ts`)
- [x] Sentry wired into Web (`web/sentry.client.config.ts`, `web/sentry.server.config.ts`, `web/sentry.edge.config.ts`, `web/next.config.mjs`)
- [x] PII redaction in Sentry: `beforeSend` strips `request.data`; `beforeBreadcrumb` strips `xhr/fetch` body
- [x] Secrets loaded from env vars only — no DSNs or SMTP credentials hardcoded
- [x] API typecheck and lint pass after observability wiring (0 errors)
- [x] Alert rules defined for all measurable NFRs: ALT-01 through ALT-06 (`alerts.md`)
- [x] Dashboards defined: Project Overview + Auth (UoW-02) + AI/ML placeholder (`dashboards.md`)
- [x] Logs structured (pino JSON) with `service`, `event`, `userId`, `environment` already present (UoW-02)

**Deferred (noted — not blocking):**
- [ ] `request_id` and `trace_id` fields in pino log lines — wired in UoW-04 when OTel SDK added
- [ ] Deep OTel app instrumentation (HTTP spans, Prisma spans) — UoW-04
- [ ] AI/ML metrics (LLM cost, eval pass rate, hallucination rate) — UoW-04 + UoW-06
- [ ] In-browser axe-core accessibility alerting — UoW-05 Playwright setup
- [ ] Node exporter on VPS for disk/CPU/memory alerts (ALT-07) — Stage 16+ concern

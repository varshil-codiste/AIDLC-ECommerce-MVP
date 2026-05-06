# Observability Setup — Questions
# Stage 17 · Round 1

**Generated at**: 2026-05-05T11:10:00Z
**Pod**: Chintan Bhai (Tech Lead) + Varshil (Dev)

Q1 and Q2 are pre-answered from the Application Design (ADR, component diagram) — no confirmation needed unless you want to change them.

---

## Q1: Primary Observability Platform

**Pre-answered from Application Design**: OpenTelemetry SDK in BE → self-hosted Grafana stack (Loki for logs, Mimir/Prometheus for metrics, Tempo for traces).

> Evidence: application-design.md component diagram shows `Telem["Telemetry module (OTel tracer · cost meter)"] -- "traces · metrics" --> Grafana`.

[Answer]: B — OpenTelemetry → Grafana stack (Loki / Mimir / Tempo), self-hosted alongside the application on the VPS

---

## Q2: Error Tracking

**Pre-answered from Application Design**: Sentry free tier.

> Evidence: component diagram shows `Sentry["Sentry (free tier)"]` with `APIService -- "errors" --> Sentry`.

[Answer]: A — Sentry (free tier)

---

## Q3: Log Retention

How long should logs be retained?

> Context: self-hosted Loki on the same VPS; storage is finite. Internal pilot with 5-10 users means low volume.

A) **30 days** — minimal storage, suitable for active debugging; cheapest.
B) **90 days** — recommended for production operations; enough to correlate past incidents.
C) **1 year** — typical for regulated workloads.
X) Other.

[Answer]:A

---

## Q4: Alerting Channel

Where should production alerts be sent?

> Context: the team uses GitHub; Slack is common for engineering teams.

A) **Slack** — channel webhook, separate `#alerts-prod` channel.
B) **Email** — simpler setup, no Slack workspace needed.
C) **PagerDuty / Opsgenie** — on-call rotation, for severity-1 pages.
D) **Combination** — Slack for warnings, PagerDuty for critical.
X) Other.

[Answer]:B

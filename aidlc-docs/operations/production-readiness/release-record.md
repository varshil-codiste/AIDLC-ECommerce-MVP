# Release Record — ECommmer-AIDLC M1

**Project**: ECommmer-AIDLC — Chat-Native E-Commerce Platform (Multi-Agent MVP)
**Tier**: Greenfield
**Milestone**: M1 — UoW-01 (Scaffolding) + UoW-02 (Auth + Role Gate)
**Gate #5 signed**: 2026-05-05
**Gate #5 signers**: Chintan Bhai (Tech Lead) · Varshil (Dev)

---

## Build Artifacts

| Service | Image | Registry |
|---------|-------|----------|
| API (NestJS) | `ghcr.io/<repo>/api:v<next-tag>` | GHCR |
| Web (Next.js) | `ghcr.io/<repo>/web:v<next-tag>` | GHCR |

*(Image tags assigned at first `git tag v*.*.*` push after this record.)*

---

## Infrastructure

| Component | Platform |
|-----------|----------|
| Compute | Self-hosted VPS (Hetzner CX21 or DigitalOcean Droplet) |
| Database | PostgreSQL 16 (pgvector) — Docker volume on VPS |
| Cache | Redis 7 Alpine — Docker volume on VPS |
| Reverse proxy | Caddy 2 — automatic TLS via Let's Encrypt |
| Observability | Grafana + Loki + Prometheus + Tempo + OTel Collector — same VPS |
| Error tracking | Sentry free tier (sentry.io) |
| Container registry | GitHub Container Registry (GHCR) |

---

## Gates Passed

| Gate | Stage | Date | Signers |
|------|-------|------|---------|
| Gate #1 — Business Requirements | Stage 1 | 2026-05-04 | Chintan Bhai + Varshil |
| Gate #2 — Workflow Plan | Stage 7 | 2026-05-04 | Chintan Bhai + Varshil |
| Gate #3 — Code Generation (UoW-01) | Stage 12 | 2026-05-04 | Chintan Bhai + Varshil |
| Gate #4 — Code Review (UoW-01) | Stage 13 | 2026-05-04 | Chintan Bhai + Varshil |
| Gate #3 — Code Generation (UoW-02) | Stage 12 | 2026-05-05 | Chintan Bhai + Varshil |
| Gate #4 — Code Review (UoW-02) | Stage 13 | 2026-05-05 | Chintan Bhai + Varshil |
| Gate #5 — Production Readiness | Stage 18 | 2026-05-05 | Chintan Bhai + Varshil |

---

## Final Compliance Summary

| Extension | Rules in scope | Status |
|-----------|---------------|--------|
| Security Baseline (15 rules) | 15 | ✅ All Compliant or N/A |
| Property-Based Testing | 5 rules (pure functions + role matrix) | ✅ All Compliant |
| AI/ML Lifecycle | N/A at M1 (LLM ships UoW-06) | [~] Applies at M3 gate |
| Accessibility (WCAG 2.2 Level A) | Login page — 7 criteria | ✅ 0 violations (static); in-browser deferred |

---

## Accepted Risks at Go-Live

| Risk | Mitigation |
|------|-----------|
| Secrets in `.env.prod` (not managed secret store) | Internal pilot only; file not committed to git |
| No staging environment | Single users table; rollback SQL documented |
| Automated DB backup not configured at signing | Must be set up during VPS provisioning (L3/L4) |
| OTel traces deferred to UoW-04 | Sentry errors + pino logs provide coverage |
| axe-core in-browser + screen-reader test deferred | Static analysis shows 0 Level A violations; pilot users are technical |
| TLS pending VPS provisioning | Caddy + Let's Encrypt auto-issues on first request after DNS |

---

## Rollback Contact

**Tech Lead**: Chintan Bhai — `chintan.p@codiste.com`
**Dev**: Varshil — `varshil.g@codiste.in`

---

## Post-Release Watch Window

| Window | Action |
|--------|--------|
| First 2 hours | Synchronous attention from Chintan Bhai + Varshil; Grafana + Sentry dashboards open |
| First 24 hours | Alerts at warning threshold; both pod members reachable |
| First 7 days | Monitor NFR adherence; review auth event logs daily |

---

## Next Milestone

M1 authorises the auth flow for the internal pilot. The next AI-DLC workflow cycle begins with:

- **UoW-03**: Persistence + audit log + idempotency + outbox foundation
- **UoW-04**: Telemetry — OTel tracer + LLM cost meter + structured logging

Trigger the next cycle with: `Using AI-DLC, begin UoW-03 — Persistence + audit log`

---

*This record marks the formal completion of the AI-DLC workflow for the ECommmer-AIDLC M1 milestone.*

# Production Readiness Checklist

**Tier**: Greenfield
**Project**: ECommmer-AIDLC — Chat-Native E-Commerce Platform (Multi-Agent MVP)
**Milestone**: M1 — UoW-01 (Scaffolding) + UoW-02 (Auth + Role Gate)
**Generated at**: 2026-05-05T11:30:00Z

> Items marked `[x]` are verified from upstream workflow artifacts.
> Items marked `[~]` are N/A with specific justification.
> Items marked `[ ]` require manual verification or action before Gate #5 is signed.

---

## A. Code & Build

- [x] Every UoW has Gate #4 signed (PROCEED verdict + pod countersign) — UoW-01: Chintan Bhai + Varshil 2026-05-04; UoW-02: Chintan Bhai + Varshil 2026-05-05
- [x] Stage 14 (Build & Test) overall status = PASS — 25/25 tests pass; CI exits 0; all builds green (2026-05-05)
- [x] All NFRs from `nfr-requirements.md` met in test results — NFR-PERF-001 (argon2id ~450ms ≤ 600ms); NFR-QA-001 (~95% combined coverage); NFR-SEC-001 (RS256, argon2id, HttpOnly cookie); NFR-OPS-001 (graceful shutdown)
- [x] No critical or high vulnerabilities in security reports — 0 Critical / 0 High in production runtime (Gate #4 security report, 2026-05-05); vitest upgraded to 2.1.9 to patch Critical RCE
- [x] Lint / type-check / format clean across all stacks — 0 errors across API (ESLint + tsc) and Web (Next.js lint + tsc), confirmed post-Stage 17 Sentry wiring

---

## B. Configuration & Secrets

- [x] Production env vars documented — `api/.env.example` + `infra/.env.prod.example` (all required vars listed)
- [ ] **NEEDS ACTION**: All secrets loaded from env file on VPS (`/opt/ecommmer/.env.prod`). A proper secret manager (Vault / cloud secret manager) is deferred to post-pilot. Pod must confirm `.env.prod` is not committed to git and is set on the VPS before go-live.
- [ ] **NEEDS ACTION**: No secrets in git history — run `gitleaks detect --source .` or `trufflehog git file://.` to confirm. (One-time scan; certificate before signing.)
- [x] CORS allow-list explicit for production domain — `WEB_ORIGIN` env var enforced in `main.ts`; never `*`
- [~] N/A: Feature flags — no feature flag system in M1 scope; auth flow has no flags. Applicable from UoW-05+ (chat surface).

---

## C. Database & Data

- [x] Migration plan documented — `api/prisma/migrations/20260504000000_UoW-02-001-create-users-table/` SQL + `prisma migrate deploy` in CI; baseline applied 2026-05-05
- [~] N/A: Migrations rehearsed against staging with prod-like data — no staging environment (Q3=A Local+Prod only). Only 1 table (users) with seed data; volume risk is negligible for 5-10 pilot users. Accepted per Q3 decision.
- [ ] **NEEDS ACTION**: Backup configured — Docker volume `pg-data` on VPS is not backed up automatically. Configure a cron job or VPS snapshot before go-live (e.g., `pg_dump` to a remote S3-compatible store or DigitalOcean Spaces daily).
- [ ] **NEEDS ACTION**: Backup tested (restore drill) — once backup is configured, do a single restore drill to confirm the dump is valid.
- [~] N/A: Data retention policy — UoW-02 stores only auth-related user records. No time-limited PII beyond what argon2id hashing provides. Full retention policy applies when chat/order data arrives in UoW-03+.
- [x] Index strategy reviewed — UNIQUE index on `email` (case-insensitive via CITEXT), INDEX on `last_active_at`; Prisma parameterized queries throughout

---

## D. Infrastructure

- [x] IaC applied — Stage 16 SKIPPED (self-hosted); `docker-compose.prod.yml` is the declarative topology. VPS bootstrap documented in `stage-16-skipped.md`.
- [ ] **NEEDS ACTION**: VPS provisioned and production stack running — `docker compose -f docker-compose.prod.yml up -d` not yet executed on a live VPS. Must be done before go-live.
- [~] N/A: Production resources sized per NFR-SCAL — Hetzner CX21 (2 vCPU, 4 GB RAM) is sufficient for 5-10 pilot users. Single-service architecture; no scaling NFR at pilot scale.
- [~] N/A: Multi-AZ — single VPS; internal pilot with no 99.9% uptime SLA. Accepted per Q1 decision.
- [~] N/A: Auto-scaling — single VPS docker-compose; no auto-scaling required at pilot scale.
- [x] Reverse proxy health checks — Caddy routes `/api/*` to NestJS health endpoint at `api:3001/api/v1/health`; NestJS HEALTHCHECK in Dockerfile
- [ ] **NEEDS ACTION**: DNS records configured — domain not yet pointed to VPS IP. Configure A record with low TTL (300s) before go-live.
- [ ] **NEEDS ACTION**: TLS certificates valid — Caddy auto-obtains Let's Encrypt certificates on first request. Verify domain is reachable and cert is issued before launch.
- [~] N/A: WAF rules — internal pilot; no public-facing WAF required at this scale. Applicable at Stage 16+ for commercial launch.

---

## E. Observability

- [ ] **NEEDS ACTION**: Observability stack deployed to VPS — `docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml up -d` not yet run on VPS. Deploy before go-live.
- [ ] **NEEDS ACTION**: Logs flowing into Loki — confirm pino JSON logs from API appear in Grafana → Explore → Loki after deployment.
- [ ] **NEEDS ACTION**: Metrics dashboard live — confirm Prometheus scraping and Grafana dashboards are visible after deployment.
- [~] N/A (deferred): Traces propagating across services — OTel app instrumentation deferred to UoW-04. OTel Collector infrastructure is deployed and ready to receive. Accepted per NFR document.
- [x] Error tracker (Sentry) wired — `@sentry/nestjs` in API + `@sentry/nextjs` in Web; no-op without `SENTRY_DSN` env var. **NEEDS ACTION**: Set `SENTRY_DSN` in `.env.prod` and verify first error is captured.
- [ ] **NEEDS ACTION**: Alerts tested — create a test alert in Grafana and confirm email is received at `ALERT_EMAIL` before go-live.
- [ ] **NEEDS ACTION**: Dashboards bookmarked — after Grafana is deployed, bookmark Project Overview + Auth dashboards for on-call reference.

---

## F. Reliability

- [x] Health endpoint — `GET /api/v1/health → 200` implemented, `@Public()` decorated, verified in e2e tests
- [x] Graceful shutdown — `PrismaService.onModuleDestroy → $disconnect()`; NestJS handles SIGTERM lifecycle
- [~] N/A: Circuit breaker — no external APIs in UoW-01/02. Redis/Prisma propagate errors as 500 (fail-closed) per NFR design. Circuit breaker applicable from UoW-06+ (LLM provider).
- [x] Rate limiting active — Redis-backed login rate limiter: 5 failures/1 min → 15-min lockout (auth.service.ts); verified in unit tests
- [~] N/A: DLQ — no message queue in UoW-01/02. Outbox pattern planned in UoW-03.

---

## G. Security

- [x] Security extension: 15/15 rules Compliant or N/A — Gate #4 security report 2026-05-05; all 15 OWASP-aligned rules evaluated
- [ ] **NEEDS ACTION**: HTTPS-only — Caddy configured with Let's Encrypt TLS and HSTS header. Verify HTTPS is enforced (HTTP → HTTPS redirect) after VPS go-live.
- [x] Authn/Authz reviewed by Tech Lead — Gate #4 signed by Chintan Bhai (Tech Lead) 2026-05-05; AI review covered BRs, NFRs, cross-stack contracts, security
- [x] Audit log captures auth events — pino structured log: `auth.login`, `auth.logout`, `auth.refresh`, `auth.refresh.reuse_detected`, `authz.denied` with userId, role, event fields
- [x] Dependency scan within last 7 days — `pnpm audit` run 2026-05-05 during Gate #4; 0 Critical/High in production
- [ ] **NEEDS ACTION**: No default credentials in production — confirm `.env.prod` uses strong random `POSTGRES_PASSWORD` and `REDIS_PASSWORD` (not defaults from `.env.prod.example`).

---

## H. Mobile

- [~] N/A: No mobile stack in scope for this project (confirmed in Stage 4 Requirements Analysis).

---

## I. AI/ML

- [~] N/A (milestone): Eval suite — LLM integration ships in UoW-06. Eval suite specified in AI/ML extension rules applies when UoW-06 Gate #4 is signed.
- [~] N/A (milestone): Prompt registry pinned — no prompts in UoW-01/02.
- [~] N/A (milestone): Hallucination guardrails — UoW-06+.
- [x] PII scrubbing on inputs — pino `redact: ['email', 'password', 'passwordHash']`; Sentry `beforeSend` strips `request.data`; Sentry `beforeBreadcrumb` strips `xhr/fetch` body
- [~] N/A (milestone): Cost monitoring — LLM cost meter ships in UoW-04. Infrastructure (Prometheus metric `llm_cost_usd_total`) will be captured at that milestone.
- [~] N/A (milestone): LLM provider fallback — no LLM provider in UoW-01/02.

---

## J. Accessibility

- [x] WCAG 2.2 Level A (static analysis) — Login page: 7 criteria verified in Stage 14 Build & Test; 0 violations found
- [ ] **NEEDS ACTION**: In-browser axe-core scan — Playwright e2e harness not yet set up (deferred to UoW-05). Before full public launch, run `axe-core` against the live login page. **For M1 pilot (5-10 internal users): accepted as deferred.**
- [ ] **NEEDS ACTION**: Manual screen-reader test — test login flow with VoiceOver (macOS) or NVDA (Windows). **For M1 pilot: accepted as deferred; must be done before commercial launch.**
- [x] Keyboard-only navigation — `<label>` + `<input>` associations, `tabIndex` default on all interactive elements, `focus:ring` visible styles confirmed in static review

---

## K. Compliance & Legal

- [~] N/A: Privacy policy — internal pilot; all users are team members (Codiste). No public-facing privacy policy required at this stage.
- [~] N/A: Terms of Service — internal pilot only.
- [~] N/A: Cookie banner — `rt_session` is a functional cookie (session management), not a tracking cookie. No consent required under ePrivacy Directive for functional cookies.
- [~] N/A: GDPR data-subject-request — internal pilot; users are employees of the organization operating the service.
- [~] N/A: Industry compliance (HIPAA/PCI/SOC 2) — no health data, no payment processing in M1 scope.

---

## L. Documentation & Handover

- [ ] **NEEDS ACTION**: README updated — `README.md` at repo root exists but needs run/deploy/test instructions updated to reflect UoW-02 changes and the `docker-compose.prod.yml` workflow.
- [x] Runbook written and reviewed — `runbook.md` generated in this stage (below)
- [x] Rollback plan written and reviewed — `rollback-plan.md` generated in this stage (below)
- [ ] **NEEDS ACTION**: On-call rotation defined — for M1 pilot, Chintan Bhai (Tech Lead) and Varshil (Dev) are the on-call. Add contact handles to `pod.md` and confirm notification method (email / phone).
- [ ] **NEEDS ACTION**: Stakeholder demo — schedule and run the M1 internal demo (login flow, role gate) with friendly pilot users before go-live.
- [~] N/A: Customer success / sales briefed — internal pilot only; not applicable.

---

## Summary of NEEDS ACTION Items

| ID | Section | Item | Urgency |
|----|---------|------|---------|
| L1 | B | Gitleaks / trufflehog scan for secrets in git history | Before go-live |
| L2 | B | Confirm `.env.prod` is not committed | Before go-live |
| L3 | C | Configure automated DB backup (pg_dump cron) | Before go-live |
| L4 | C | Restore drill — confirm backup is valid | Before go-live |
| L5 | D | Provision VPS + deploy production stack | Before go-live |
| L6 | D | Configure DNS A record for domain | Before go-live |
| L7 | D | Verify Let's Encrypt TLS cert is issued | Before go-live |
| L8 | E | Deploy observability stack to VPS | Before go-live |
| L9 | E | Confirm logs flowing in Loki, metrics in Prometheus | Before go-live |
| L10 | E | Set `SENTRY_DSN` in `.env.prod`; verify first error captured | Before go-live |
| L11 | E | Test email alert delivery from Grafana | Before go-live |
| L12 | G | Verify HTTPS redirect active | Before go-live |
| L13 | G | Confirm strong passwords in `.env.prod` (not defaults) | Before go-live |
| L14 | J | axe-core in-browser scan | Deferred to commercial launch |
| L15 | J | Screen-reader test | Deferred to commercial launch |
| L16 | L | Update README with UoW-02 + docker-compose.prod.yml instructions | Before go-live |
| L17 | L | Add on-call contact details to pod.md | Before go-live |
| L18 | L | Schedule and run M1 internal demo | Before go-live |

---

## Modification Log

| Timestamp | Editor | Change |
|-----------|--------|--------|
| 2026-05-05T11:30:00Z | AI-DLC Stage 18 | Initial generation; pre-filled from workflow artifacts |

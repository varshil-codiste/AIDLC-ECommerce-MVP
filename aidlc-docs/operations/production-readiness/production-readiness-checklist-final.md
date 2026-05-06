# Production Readiness Checklist — Final Milestone (All 12 UoWs)

**Tier**: Greenfield (Comprehensive)
**Project**: AIDLC ECommerce MVP — Chat-Native E-Commerce Platform (Multi-Agent MVP)
**Milestone**: Final — UoW-01 through UoW-12 complete
**Generated at**: 2026-05-06T13:15:00Z
**Supersedes**: `production-readiness-checklist.md` (M1 / UoW-01+02 only)

> Items marked `[x]` are verified from upstream workflow artifacts.
> Items marked `[~]` are N/A with specific justification.
> Items marked `[ ]` require manual verification or action before go-live.

---

## A. Code & Build

- [x] Every UoW has Gate #4 signed (PROCEED verdict + pod countersign)
  - UoW-01: Chintan Bhai + Varshil 2026-05-04 ✅
  - UoW-02: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-03: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-04: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-05: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-06: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-07: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-08: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-09: Chintan Bhai + Varshil 2026-05-05 ✅
  - UoW-10: Chintan Bhai + Varshil 2026-05-06 ✅
  - UoW-11: Chintan Bhai + Varshil 2026-05-06 ✅
  - UoW-12: Chintan Bhai + Varshil 2026-05-06 ✅
- [x] Stage 14 (Build & Test) PASS for all UoWs — Final: 290 API tests + 250 web tests = 540 total; 0 regressions; both builds TypeScript-clean
- [x] All NFRs from `nfr-requirements.md` met — each UoW's NFR thresholds verified in Stage 14; full list in construction/build-and-test/UoW-{01..12}-build-and-test.md
- [x] No critical or high vulnerabilities in security reports — 0 Critical/High across all 12 Gate #4 security reports; accepted concerns documented (C-10-01, C-10-02 etc.) at appropriate risk level
- [x] Lint / type-check / format clean — `npx tsc --noEmit` clean on both api/ and web/; ESLint 0 errors

---

## B. Configuration & Secrets

- [x] Production env vars documented — `api/.env.example` and root `.env.example` list all required variables with descriptions
- [ ] **NEEDS ACTION**: All secrets loaded from `.env.prod` on VPS — not committed to git; must be verified on the VPS before go-live. A managed secret store (Vault / cloud secrets) is deferred to post-pilot commercial launch.
- [ ] **NEEDS ACTION**: No secrets in git history — run `gitleaks detect --source .` or `trufflehog git file://.` against the full 12-UoW history before go-live.
- [x] CORS allow-list explicit — `WEB_ORIGIN` env var enforced in `api/src/main.ts`; never `*`
- [~] N/A: Feature flags — no feature flag system in scope; all features ship enabled. Applicable for post-pilot commercial launch.

---

## C. Database & Data

- [x] Migration plan documented — all Prisma migrations in `api/prisma/migrations/`; `prisma migrate deploy` in CI; UoW-11 adds pgvector `vector` column migration
- [~] N/A: Migrations rehearsed against staging — no staging environment (self-hosted VPS, pilot only). Migrations are additive (no destructive drops); rollback SQL documented per UoW. Risk accepted for pilot scale.
- [ ] **NEEDS ACTION**: Backup configured — configure `pg_dump` cron on VPS (daily to DigitalOcean Spaces or equivalent S3) before go-live. Now critical: production data includes orders, cart, customers.
- [ ] **NEEDS ACTION**: Backup restore drill — after configuring backup, restore from a dump to confirm validity before go-live.
- [x] Data retention policy — chat messages and order history kept indefinitely at pilot scale; PII in User table hashed (argon2id); formal retention policy applies at commercial launch
- [x] Index strategy reviewed — all UoW-specific indexes documented: `carts_user_open_idx`, `cart_items_cart_variant_idx`, `ivfflat` index on `Product.embedding` (lists=100), UNIQUE on `email`, INDEX on `last_active_at`

---

## D. Infrastructure

- [x] IaC defined — Stage 16 SKIPPED (self-hosted); `docker-compose.prod.yml` is the declarative topology; VPS bootstrap documented in `operations/infrastructure/stage-16-skipped.md`
- [ ] **NEEDS ACTION**: VPS provisioned — provision Hetzner CX21 (or equivalent) and run `docker compose -f docker-compose.prod.yml up -d`. Not yet done.
- [~] N/A: Production resources sized — Hetzner CX21 (2 vCPU, 4 GB RAM) sufficient for 5-10 pilot users. Note: pgvector ivfflat index requires memory during index build; CX21 is marginal at 4 GB for 50k+ product vectors; acceptable for MVP.
- [~] N/A: Multi-AZ — single VPS; pilot has no 99.9% uptime SLA. Accepted per Q1 decision.
- [~] N/A: Auto-scaling — single VPS docker-compose; no auto-scaling at pilot scale.
- [x] Reverse proxy health checks — Caddy routes `/api/*` to NestJS; NestJS `/api/v1/health` HEALTHCHECK in Dockerfile; verified in Stage 14.
- [ ] **NEEDS ACTION**: DNS A record configured for production domain.
- [ ] **NEEDS ACTION**: TLS certificate valid — Caddy auto-obtains Let's Encrypt; verify cert is issued and valid after VPS go-live.

---

## E. Observability

- [x] OTel infrastructure ready — OTel Collector in `docker-compose.observability.yml`; `@opentelemetry/sdk-node` wired in API (UoW-04); LLM cost metric `llm_cost_usd_total` published to Prometheus
- [ ] **NEEDS ACTION**: Deploy observability stack to VPS — `docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml up -d` not yet run on VPS.
- [ ] **NEEDS ACTION**: Confirm pino JSON logs flowing into Grafana → Loki after deployment.
- [ ] **NEEDS ACTION**: Confirm Prometheus scraping metrics and Grafana dashboards visible after deployment. 7 alerts configured (UoW-17); verify all are active.
- [x] Traces propagating — OTel app instrumentation shipped in UoW-04; spans emitted per LLM call + per agent invocation. OTel Collector receives on `otel-collector:4317`.
- [ ] **NEEDS ACTION**: Set `SENTRY_DSN` in `.env.prod`; trigger a test error and verify it appears in Sentry project.
- [ ] **NEEDS ACTION**: Test Grafana email alert delivery — create a synthetic alert and confirm receipt at `ALERT_EMAIL`.
- [ ] **NEEDS ACTION**: Bookmark Grafana dashboards for on-call reference.

---

## F. Reliability

- [x] Health endpoints — `GET /api/v1/health → 200` (`@Public()`); verified in e2e tests across all UoWs
- [x] Graceful shutdown — `PrismaService.onModuleDestroy → $disconnect()`; NestJS SIGTERM lifecycle; outbox processor drains before exit (UoW-03)
- [~] N/A: Circuit breaker on LLM provider — no circuit breaker library; LLM errors propagate as 500 / SSE error event. Fallback behavior: agent surfaces error message to user in chat. Accepted for pilot scale; applicable at commercial launch.
- [x] Rate limiting active — Redis-backed login rate limiter (5 failures/1 min → 15-min lockout); verified in unit tests (UoW-02)
- [x] Outbox / idempotency — UoW-03 ships Prisma-backed outbox pattern with at-least-once delivery and idempotency key checks
- [~] N/A: DLQ — no external message queue in scope; outbox processor handles retries in-process with exponential backoff. Acceptable for pilot scale.

---

## G. Security

- [x] Security extension: 15/15 rules Compliant or accepted-risk — all Gate #4 security reports evaluated; accepted concerns documented per UoW; no unmitigated Critical/High
- [ ] **NEEDS ACTION**: HTTPS-only — Caddy configured with HSTS + auto-TLS. Verify HTTP → HTTPS redirect active after VPS go-live.
- [x] Authn/Authz reviewed by Tech Lead — all 12 Gate #4 reports signed by Chintan Bhai (Tech Lead); role guard (shopper/merchant) verified in UoW-02; per-agent role guards in UoW-07 through UoW-10
- [x] Audit log captures auth + privileged events — pino structured log: `auth.*`, `authz.denied`, `cart.*`, `order.*`, `product.*` events with userId/role/event fields
- [ ] **NEEDS ACTION**: Dependency scan within last 7 days of go-live — run `pnpm audit` on production images before deploying.
- [ ] **NEEDS ACTION**: No default credentials — confirm `.env.prod` uses strong random `POSTGRES_PASSWORD` and `REDIS_PASSWORD` (not `.env.prod.example` defaults).

---

## H. Mobile

- [~] N/A: No mobile stack in scope (confirmed Stage 4 Requirements Analysis).

---

## I. AI/ML Quality

- [x] Eval suites present and passing — each agent (ProductAgent, OrderAgent, CustomerAgent, CartAgent, CheckoutAgent, NotificationAgent, SearchAgent) has an eval suite with golden + adversarial cases; all pass as of Stage 14 Build & Test for each UoW
- [x] Prompt registry version pinned — all 7 agent prompts versioned via `PromptLoaderService`: `product-agent.v1.0.0` through `checkout-agent.v1.0.0`; `search-agent.v1.0.0`
- [x] Hallucination guardrails — shopper/merchant role guard fires before each LLM call; agent prompts include grounding instructions; `DESTRUCTIVE_INTENTS` guard on ProductAgent (UoW-07)
- [x] PII scrubbing — pino `redact: ['email', 'password', 'passwordHash']`; Sentry `beforeSend` strips request body; address data (`line1`, `city`) not logged in structured events (UoW-10 NFR-10-SEC-06)
- [x] LLM cost monitoring — `llm_cost_usd_total` Prometheus metric + `LlmCostRecord` table in DB; Grafana alert on budget threshold (UoW-04)
- [~] N/A: LLM provider automatic fallback — no secondary provider configured; agent surfaces error to shopper on LLM failure. Accepted for pilot; fallback model configurable via `LLM_MODEL` env var swap.
- [ ] **NEEDS ACTION**: Set `LLM_API_KEY` and `LLM_MODEL` in `.env.prod` with a production OpenAI org key (not personal dev key). Confirm rate limits are sufficient for pilot load.

---

## J. Accessibility

- [x] WCAG 2.2 Level A — full accessibility audit completed in UoW-12: all 21 widgets audited; `aria-live`, `alt`, `aria-label`, `focus:ring-2`, `role` attributes verified; 0 violations found
- [ ] **NEEDS ACTION**: in-browser axe-core scan against live production URL — run `npx @axe-core/cli https://<domain>` after VPS go-live. For pilot (5-10 internal users): acceptable as deferred; required before public launch.
- [ ] **NEEDS ACTION**: Manual screen-reader test (VoiceOver/NVDA) on chat flow, login, confirmation prompt. For pilot: deferred; required before public launch.
- [x] Keyboard-only navigation — all buttons are `<button>` tags with `focus:ring-2`; no div-as-button; tab order follows DOM order; verified in UoW-12 a11y audit

---

## K. Compliance & Legal

- [~] N/A: Privacy policy — internal pilot; all users are Codiste team members. Required before any public/commercial launch.
- [~] N/A: Terms of Service — internal pilot only.
- [~] N/A: Cookie banner — `rt_session` is a functional cookie; no consent required under ePrivacy Directive for functional cookies.
- [~] N/A: GDPR / data-subject-request — internal pilot; users are employees of the operator. Required for any external user base.
- [~] N/A: PCI compliance — payment processing is simulated (`simulatePayment()` no-op); no real card data handled.

---

## L. Documentation & Handover

- [x] README updated — `README.md` fully updated for Final milestone: full feature list, tech stack, local dev, production deployment, env vars, architecture diagram (L16 resolved)
- [x] Runbook written and reviewed — `operations/production-readiness/runbook-final.md` (updated for full 7-agent system)
- [x] Rollback plan written and reviewed — `operations/production-readiness/rollback-plan-final.md` (updated for full system)
- [ ] **NEEDS ACTION**: On-call rotation confirmed — Chintan Bhai (Tech Lead) and Varshil (Dev) are on-call for pilot. Add contact handles (phone / Slack) to `pod.md`.
- [ ] **NEEDS ACTION**: Stakeholder demo — schedule and run final product demo covering: chat-based shopping flow, cart + checkout, merchant dashboard, semantic search.
- [~] N/A: Customer success / sales briefed — internal pilot; not applicable.

---

## Summary of NEEDS ACTION Items (Final Milestone)

| ID | Section | Item | Urgency |
|----|---------|------|---------|
| F1 | B | Confirm `.env.prod` not committed to git; gitleaks scan | Before go-live |
| F2 | C | Configure automated DB backup (pg_dump daily cron) | Before go-live |
| F3 | C | Restore drill — validate backup | Before go-live |
| F4 | D | Provision VPS + deploy production stack | Before go-live |
| F5 | D | Configure DNS A record | Before go-live |
| F6 | D | Verify Let's Encrypt TLS cert issued | Before go-live |
| F7 | E | Deploy observability stack to VPS | Before go-live |
| F8 | E | Confirm Loki logs + Prometheus metrics flowing | Before go-live |
| F9 | E | Set `SENTRY_DSN`; verify first error captured | Before go-live |
| F10 | E | Test Grafana email alert delivery | Before go-live |
| F11 | G | Verify HTTPS redirect active | Before go-live |
| F12 | G | Confirm strong passwords in `.env.prod` | Before go-live |
| F13 | G | Run `pnpm audit` within 7 days of go-live | Before go-live |
| F14 | I | Set production `LLM_API_KEY` (org key, not dev key) | Before go-live |
| F15 | J | axe-core in-browser scan on live URL | Before public launch (deferred from pilot) |
| F16 | J | Manual screen-reader test | Before public launch (deferred from pilot) |
| F17 | L | Add on-call contact handles to pod.md | Before go-live |
| F18 | L | Schedule and run final product demo | Before go-live |

**Note**: All F1–F14, F17–F18 are operational/infrastructure steps requiring VPS provisioning. They are pre-launch action items, not code defects.

---

## Modification Log

| Timestamp | Editor | Change |
|-----------|--------|--------|
| 2026-05-05T11:30:00Z | AI-DLC Stage 18 | M1 checklist — UoW-01+02 only |
| 2026-05-06T13:15:00Z | AI-DLC Stage 18 (Final) | Final checklist — all 12 UoWs; AI/ML, accessibility, observability sections updated |

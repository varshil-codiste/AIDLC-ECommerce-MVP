# Security Report — UoW-03-persistence

**Generated at**: 2026-05-05T14:00:00Z  
**SAST tools run**: ESLint (`@typescript-eslint/recommended`), TypeScript strict mode, manual review  
**Dependency scans run**: `pnpm audit --audit-level=high`

---

## SAST Findings

| Severity | Count | Tool | Notes |
|----------|-------|------|-------|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 0 | — | — |
| Low | 0 | — | — |

No SAST findings in UoW-03 application code.

---

## Dependency Vulnerabilities

`pnpm audit` full project results:

| Severity | Count | Packages | In production runtime? |
|----------|-------|----------|----------------------|
| Critical | 0 | — | — |
| High | 3 | `redoc@2.1.5`, `glob@11.0.3`, `picomatch@4.0.2` | **No** — all via dev tooling |
| Moderate | 4 | various | **No** — all via dev tooling |
| Low | 3 | various | **No** — all via dev tooling |

**High vulnerability details**:
1. `redoc@2.1.5` (GHSA-9rhg-254w-fh9x) — Prototype Pollution via `Module.mergeObjects`. Path: `@redocly/cli@1.25.5 > redoc@2.1.5`. Dev-only API docs tool; not in production Docker image. [~] N/A: dev tooling only
2. `glob@11.0.3` (GHSA-5j98-mcp5-4vw2) — Command injection via CLI `-c/--cmd`. Path: `@nestjs/cli@11.0.10 > glob@11.0.3`. Dev-only NestJS build CLI; not in production Docker image. [~] N/A: dev tooling only
3. `picomatch@4.0.2` (GHSA) — ReDoS via extglob quantifiers. Path: `@nestjs/cli > @angular-devkit/core > picomatch@4.0.2`. Dev-only build pipeline; not in production Docker image. [~] N/A: dev tooling only

**Production runtime dependency audit**: 0 Critical, 0 High.

---

## Extension Rule Compliance (Security Baseline — all 15 rules)

| Rule | Status | Evidence / Notes |
|------|--------|-----------------|
| SECURITY-01 — Encryption at rest/transit | ✅ Compliant | No new network connections added. Database connection uses existing `DATABASE_URL`/`AUDIT_DATABASE_URL` from infrastructure. Production env requires `sslmode=require` per deployment guide (M1 Ops). |
| SECURITY-02 — Access logging on network intermediaries | N/A | No new LBs or gateways added in UoW-03. Caddy logging established in M1 Operations phase. |
| SECURITY-03 — Structured logging | ✅ Compliant | `AuditLogService.insert()` writes structured audit rows with `actorUserId`, `action`, `entity`, `entityId`, `requestId`. `RequestContextMiddleware` propagates `requestId` via AsyncLocalStorage. `OutboxDrainWorker` logs `outbox.drain_cycle`, `outbox.drain.error`, `outbox.drain.xadd_failed` events. No secrets in any log line. |
| SECURITY-04 — HTTP security headers | N/A | No new HTTP endpoints added in UoW-03. Helmet wiring established in UoW-01. |
| SECURITY-05 — Input validation | ✅ Compliant | All Prisma queries parameterized (ORM + tagged template literals). `$queryRaw` in `OutboxDrainWorker` uses Prisma tagged template — BATCH_SIZE is a numeric constant parameterized as `$1`. `$executeRaw` in `IdempotencyService.cleanup()` uses tagged template with `${cutoff}` parameterized. No dynamic SQL concatenation. |
| SECURITY-06 — Least-privilege access | ✅ Compliant | `audit_writer` role: INSERT-only on `audit.audit_log`. `ecomm` role: SELECT on `audit.audit_log`. REVOKE UPDATE/DELETE from PUBLIC. Migration UoW-03-003 implements this fully. |
| SECURITY-07 — Network configuration | N/A | No new network config. Database is not internet-accessible (VPS internal network, per deployment guide). |
| SECURITY-08 — Application-level access control | ✅ Compliant | `IdempotencyGuard` requires `user.sub` from JWT (established by UoW-02 JWT guard). Throws `BadRequestException` on missing key. No new endpoints; services are internal. |
| SECURITY-09 — Security hardening | ✅ Compliant | `sanitiseSnapshot()` strips `passwordHash`, `password_hash`, `jwtPrivateKey`, `refreshTokenHash`, `refresh_token_hash` before audit writes. `IdempotencyGuard` returns typed NestJS exceptions (no stack traces to client). |
| SECURITY-10 — Supply chain | ✅ Compliant | `pnpm-lock.yaml` committed. Dependency scan in CI. 0 High/Critical in production runtime deps. 3 High in dev-only tooling (marked N/A). |
| SECURITY-11 — Secure design | ✅ Compliant | Idempotency fingerprint prevents different-body replay. `FOR UPDATE SKIP LOCKED` prevents duplicate drain processing (single instance). `OutboxDrainWorker.draining` guard prevents concurrent cycles on single instance. |
| SECURITY-12 — Auth/credential management | N/A | No new auth mechanics. UoW-02 implements argon2id, JWT rotation, brute-force protection. |
| SECURITY-13 — Software/data integrity | ✅ Compliant | `audit.audit_log` append-only via DB trigger (`tg_audit_log_no_update_delete`). Verified by e2e test (trigger blocked DELETE attempt). `sanitiseSnapshot()` ensures no PII in audit snapshots. No unsafe deserialization. |
| SECURITY-14 — Alerting/monitoring | N/A | `OutboxDrainWorker` emits `outbox_pending_rows` and `outbox_drain_cycle_ms` log fields (wired to OTel in UoW-04). Security monitoring established in M1 Observability. |
| SECURITY-15 — Exception handling | ✅ Compliant | `IdempotencyGuard` throws typed NestJS exceptions on error paths. `OutboxDrainWorker.drainCycle()` has try/finally ensuring `this.draining = false`. Failed XADD rows stay pending for retry — no silent data loss. |

---

## Verdict
- ✅ **Pass** — 0 Critical AND 0 High in production runtime. All 15 security extension rules Compliant or N/A.

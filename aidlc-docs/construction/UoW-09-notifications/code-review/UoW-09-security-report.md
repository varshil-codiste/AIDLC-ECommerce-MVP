# Security Report — UoW-09 (Notifications)

**Generated at**: 2026-05-05T18:36:00Z
**SAST tools run**: ESLint (with default security-aware configs), Next.js lint, tsc strict mode
**Dependency scans run**: pnpm audit (root)

---

## SAST Findings

| Severity | Count | Tool | Top examples |
|----------|-------|------|--------------|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 0 | — | — |
| Low | 0 | — | — |

No SAST findings introduced by UoW-09 source files.

---

## Dependency Vulnerabilities

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| High | 3 | `redoc` (GHSA-9rhg-254w-fh9x), `glob` (GHSA-5j98-mcp5-4vw2), `picomatch` (GHSA-c2c7-rcm5-vvqj) — all transitive devDeps from `@angular-devkit/schematics-cli` and `redoc-cli` toolchain |
| Moderate | 4 | (pre-existing) |
| Low | 3 | (pre-existing) |

**All entries pre-exist UoW-09**. UoW-09 added 0 packages (brownfield); the same vulnerability set was accepted in UoW-07 and UoW-08 code reviews. No new dependencies introduced. None of the 3 High advisories affect the runtime API or web bundles — all are in dev tooling (CLI generators, redoc preview).

---

## Extension Rule Compliance — Security Baseline

| Rule | Status | Notes |
|------|--------|-------|
| SECURITY-01 (Encryption at rest/transit) | ✅ Compliant | TLS handled at infrastructure layer (Caddy); Postgres/Redis URLs use auth |
| SECURITY-02 (No hardcoded secrets) | ✅ Compliant | All credentials via `ConfigService.getOrThrow` |
| SECURITY-03 (PII handling) | ✅ Compliant | Notification payload contains orderId/totalCents/currency/variantIds — no PII |
| SECURITY-04 (Authentication enforcement) | ✅ Compliant | NotificationAgent inherits orchestrator auth; actor identity used for ownership guard |
| SECURITY-05 (Input validation) | ✅ Compliant | `notification_list` limit clamped to 50 (`Math.min`); JSON schema enforces `unreadCount ≥ 0`, `maxItems: 50`, type enum |
| SECURITY-06 (Authorization / RBAC) | ✅ Compliant | `NOTIFICATION_WRITE_TOOLS` set blocks `notification_mark_all_read` for shoppers (403); `NotificationService.markRead` ownership guard via `findFirst({id, recipientUserId})` |
| SECURITY-07 (Output encoding / XSS) | ✅ Compliant | React auto-escapes notification message text; no `dangerouslySetInnerHTML` |
| SECURITY-08 (SQL injection) | ✅ Compliant | All DB access via Prisma parameterized queries |
| SECURITY-09 (CSRF / SameSite) | ✅ Compliant | N/A for this UoW — no new HTTP routes; widget flows through SSE+intent which inherits orchestrator CSRF posture |
| SECURITY-10 (Rate limiting) | ✅ Compliant | Inherits ThrottlerModule on chat controller; `notification_list` reads only |
| SECURITY-11 (Secure deserialization) | ✅ Compliant | `JSON.parse(payload)` wrapped in `try/catch` with structured warning log; failure doesn't crash the listener |
| SECURITY-12 (Logging — no secrets) | ✅ Compliant | Structured logs include event names, IDs, counts — no payloads, no tokens |
| SECURITY-13 (Dependency hygiene) | ⚠️ Pre-existing | 3 High in dev tooling, accepted in UoW-07/08; no new deps in UoW-09 |
| SECURITY-14 (Error handling — no stack leaks) | ✅ Compliant | Errors mapped to ProblemDetails with stable `type` URLs and short titles; no internal stack traces leaked to client |
| SECURITY-15 (Resource limits) | ✅ Compliant | Stream batch capped at 50; low-stock query `take: 50`; agent loop capped at 5 iterations |

---

## Verdict

✅ **Pass** — 0 Critical AND 0 High SAST findings; UoW-09 introduces 0 dependency changes; all 15 Security Baseline rules Compliant or pre-existing-accepted.

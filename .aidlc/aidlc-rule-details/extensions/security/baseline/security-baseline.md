# Security Baseline (15 OWASP-aligned Rules)

**Extension**: Security Baseline
**Loaded by**: Requirements Analysis when user opts in (`security-baseline.opt-in.md`)
**Enforced at**: Functional Design (Stage 8), NFR Design (Stage 10), Code Generation (Stage 12), **Code Review (Stage 13 — primary enforcement gate)**, Build & Test (Stage 14), Production Readiness (Stage 18)

---

## How These Rules Are Applied

At every applicable stage, the AI evaluates whether each rule applies to the work in scope. For each rule:

| Status | Meaning |
|--------|---------|
| **Compliant** | Rule applies and the implementation satisfies it (with cited evidence) |
| **Non-compliant** | Rule applies and the implementation violates it — **blocking finding** at Code Review (Gate #4) |
| **N/A** | Rule does not apply to this scope; the AI must give a specific reason (e.g., "no data store in this UoW → SECURITY-01 N/A") |

Compliance is reported in:
- The Gate #3 signoff `## Compliance Summary`
- The Gate #4 (Code Review) signoff verdict block
- The Gate #5 (Production Readiness) signoff `## Compliance Summary`

A single Non-compliant row forces Gate #4 verdict to **BLOCK**.

---

## The 15 Rules

### SECURITY-01 — Encryption at rest and in transit

**Statement**: All persisted data and all data in transit must be encrypted.

**At rest** — wherever data lives:
- Databases: encryption-at-rest enabled (RDS, Cloud SQL, Cosmos DB, Postgres on disk via cloud provider key)
- Object storage: SSE / CMEK enabled (S3, GCS, Azure Blob)
- Caches with persistence (Redis with AOF/RDB enabled): TLS + at-rest if cloud provider supports
- Disks attached to compute: encrypted (default on most managed services)

**In transit** — wherever data moves:
- HTTPS only on every public endpoint (TLS 1.2+; prefer 1.3)
- mTLS or TLS for every service-to-service call (no plaintext on private network)
- Database connections use TLS (rejectUnauthorized true; verify-full)
- Mobile app TLS pinning recommended for high-sensitivity flows

**Per-stack evidence** the AI looks for:
- Backend Node: HTTPS-only middleware; pg connection string `?sslmode=require`
- Backend Python: FastAPI behind TLS termination; SQLAlchemy `connect_args={"sslmode": "require"}`
- Backend Go: `http.Server.TLSConfig`; pgx `sslmode=verify-full`
- Frontend / Mobile: API base URL is `https://`; no `http://` allowed in code review

**N/A criteria**: project has no data stores AND no public endpoints (rare).

---

### SECURITY-02 — Access logging on network intermediaries

**Statement**: Every load balancer, API gateway, CDN, and reverse proxy in the request path logs access (status, latency, client IP, user agent, request ID).

**At every layer**:
- Cloud LB / ALB / Cloud Run / App Service: access logs enabled and shipped to log store
- API gateway: access + auth logs enabled
- CDN: access logs enabled (CloudFront / Cloud CDN / Front Door)
- Reverse proxy (nginx / envoy if used): access log format includes request ID

Logs MUST be retained per Observability stage decision (default 90 days).

**N/A criteria**: serverless-only project with no LB / gateway in front (uncommon).

---

### SECURITY-03 — Application-level structured logging

**Statement**: Every service emits structured (JSON) logs with required fields, suitable for security audit.

**Required fields** (per Observability stage):
- `timestamp`, `level`, `service`, `version`
- `request_id`, `user_id` (if authenticated)
- `event_type` for security-sensitive events: `auth.login`, `auth.logout`, `auth.failure`, `authz.deny`, `data.export`, `admin.action`
- `outcome` (success / failure)

**No raw secrets / passwords / tokens / full credit card / etc. in any log line.**

---

### SECURITY-04 — HTTP security headers

**Statement**: Every HTTP response from a public endpoint includes the standard security headers.

| Header | Required value (or stricter) |
|--------|------------------------------|
| `Content-Security-Policy` | Strict policy with explicit `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `frame-ancestors` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (or `SAMEORIGIN` if framing required) — prefer CSP `frame-ancestors` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | minimal; explicitly deny features not needed |
| `Cross-Origin-Opener-Policy` | `same-origin` (where feasible) |

Implementations:
- Backend Node Express: `helmet()` middleware
- Backend Node Fastify: `@fastify/helmet`
- Backend Python FastAPI: `secure-fastapi` or middleware
- Backend Python Django: `SECURE_*` settings
- Backend Go: middleware (e.g., `secure` package)
- Frontend (Next.js): `next.config.ts` `headers()` exporting all required headers
- CDN: enforce headers at the edge as a backstop

---

### SECURITY-05 — Input validation

**Statement**: Every input crossing a trust boundary is validated for type, length, format, and allow-list of acceptable values; all queries are parameterized.

**Trust boundaries**: HTTP request → server, server → database, server → external API, message-queue payload → consumer.

**Per-stack**:
- Node: Zod / class-validator with strict; no `JSON.parse` of untrusted input without schema; no string concatenation into SQL
- Python: Pydantic v2 `extra="forbid"`; SQLAlchemy parameter binding; never f-strings into raw SQL
- Go: stdlib + `go-playground/validator`; database/sql with placeholders
- Frontend: validate forms on the client (UX) AND trust only server-side validation (security)
- Mobile: validate on submit; trust server validation

**Team rule** at Code Review: any `eval`, `exec`, `Function()` call, dynamic SQL via concatenation, or `dangerouslySetInnerHTML` without sanitization is a Critical finding.

---

### SECURITY-06 — Least-privilege access policies

**Statement**: IAM / DB / API credentials grant the minimum permission required.

- IAM roles: no `*:*` actions; per-service roles, not shared
- DB users: per-service users with minimum grants (no SUPERUSER; no DROP unless migrations user)
- API keys / service accounts: scoped to specific resources
- OAuth scopes: requested narrowly

The AI flags wildcards in IAM policies as Critical unless explicitly justified in `audit.md` with a security-review note.

---

### SECURITY-07 — Restrictive network configuration

**Statement**: Network is deny-by-default; only required ports / sources are allowed.

- Security groups / firewalls: explicit inbound rules; no `0.0.0.0/0` except for public LB on 80/443
- Private services: only reachable from within VPC / via VPN
- Database: not internet-accessible; reachable only from app subnets
- Egress: restricted where feasible (especially for sensitive services)

---

### SECURITY-08 — Application-level access control

**Statement**: Authorization is deny-by-default; every endpoint either enforces authn+authz or is explicitly marked public.

- Default-deny middleware that requires authn unless route is in an allow-list
- Object-level authorization: when fetching a resource, verify the principal owns / has access to that specific instance (prevents IDOR)
- CORS: allow-list of origins, never `*`
- Token validation: signature, expiry, issuer, audience all checked

**Team rule**: every route handler has either an explicit `@Public()` marker or an `@Authenticated(...)` / `@Authorized(...)` decorator. Code Review flags untagged routes as Non-compliant.

---

### SECURITY-09 — Security hardening

**Statement**: Defaults are tightened; non-essential features disabled.

- No default credentials anywhere (Postgres `postgres/postgres`, Redis open, etc.)
- Minimal install: no debug tools / shells / extra packages in production images
- Generic error responses to clients (no stack traces); detailed errors only in logs
- Directory listing disabled on any static file server
- Object storage public-by-default OFF; explicit per-bucket / per-object public configuration where required
- `X-Powered-By` and similar fingerprinting headers stripped

---

### SECURITY-10 — Software supply chain

**Statement**: Dependencies are pinned, scanned, and minimized.

- Lockfiles (`pnpm-lock.yaml`, `uv.lock`, `go.sum`, `pubspec.lock`) committed
- Vulnerability scanning in CI: `npm audit` / `pnpm audit` / `pip-audit` / `govulncheck` / `dart pub outdated --mode=security`
- No critical / high vulnerabilities at production release
- No unused dependencies (lint enforces)
- Sources verified — only registry packages or pinned git refs (no random URL installs)
- SBOM generated at build (CycloneDX or SPDX) — Recommended for production projects
- CI / CD pipelines protected: signed commits / branch protections / required reviews on protected branches

---

### SECURITY-11 — Secure design

**Statement**: Architecture applies defense-in-depth, separation of concerns, rate limiting, and misuse-case consideration.

- Each public endpoint has rate limiting per IP and per authenticated user
- Bot protection considered (CAPTCHA / WAF rules) for sensitive flows (signup, password reset, payment)
- Defense in depth: validation at edge AND in service AND at DB
- Misuse cases enumerated in Functional Design: "What if an attacker tries X?" → mitigation noted

---

### SECURITY-12 — Authentication and credential management

**Statement**: Secure auth mechanics are used end-to-end.

- Password policy: minimum 12 chars; reject top-N breached passwords (HaveIBeenPwned API or local list)
- Password storage: argon2id (Recommended) or bcrypt cost ≥ 12
- MFA available for admin accounts; required for production-tier admin
- Session management: secure, httpOnly, sameSite cookies; short lifetimes; refresh-token rotation
- Brute-force protection: lockout after N failures with backoff; alert on patterns
- Password reset: cryptographically secure tokens, single-use, short TTL

---

### SECURITY-13 — Software / data integrity

**Statement**: Code, artifacts, and data are protected from tampering.

- No deserializing untrusted input into class instances (no `pickle.load(untrusted)`, no `JSON.parse` → `Object.assign(class, ...)` patterns)
- Build artifacts: hash-pinned (image digests, not just tags) in production
- CI/CD pipelines: secrets stored in secret manager; pipeline definitions reviewed
- Subresource Integrity (SRI) on third-party scripts loaded by Frontend
- Audit log captures all writes to sensitive tables (immutable append-only log preferred)

---

### SECURITY-14 — Alerting and monitoring

**Statement**: Security-relevant events trigger alerts.

- Failed-login spike alert
- Privileged-action alert (admin role, sudo equivalent)
- Anomalous data-export volumes
- Auth-token reuse from new IP / new user-agent
- Log retention ≥ 90 days for security audit (matches `tiered-mode.md` Tier × Retention)
- Log integrity: append-only or write-once where feasible
- Dashboards: security overview panel in the project dashboard

---

### SECURITY-15 — Exception handling and fail-safe defaults

**Statement**: When something goes wrong, fail closed; clean up; surface generic errors to users.

- Try/except / try/catch / defer-recover blocks have explicit, narrow exception types
- On error: deny access, release resources, log details server-side, return generic message client-side
- Health checks fail when downstream dependencies are unavailable (so LB removes the unhealthy instance)
- Migration failures roll back transactions; partial writes blocked
- Circuit breakers fail closed under saturation

---

## OWASP Top 10 Mapping (informational)

| Team rule | OWASP 2021 mapping |
|--------------|---------------------|
| SECURITY-01 | A02 Cryptographic Failures |
| SECURITY-02, 03, 14 | A09 Security Logging & Monitoring Failures |
| SECURITY-04 | A05 Security Misconfiguration |
| SECURITY-05 | A03 Injection |
| SECURITY-06, 07, 08 | A01 Broken Access Control |
| SECURITY-09 | A05 Security Misconfiguration |
| SECURITY-10 | A06 Vulnerable & Outdated Components |
| SECURITY-11 | A04 Insecure Design |
| SECURITY-12 | A07 Identification & Auth Failures |
| SECURITY-13 | A08 Software & Data Integrity Failures |
| SECURITY-15 | A10 SSRF / generic fail-safe |

---

## Stage-by-Stage Application

| Stage | What this extension does |
|-------|--------------------------|
| 8 Functional Design | Adds misuse cases to `business-rules.md`; SECURITY-11 |
| 10 NFR Design | SECURITY-04, -07 patterns; rate-limiter, WAF, breaker components |
| 12 Code Generation | All applicable rules apply during generation; SECURITY-05 enforced per file written |
| 13 Code Review | **Primary gate** — Check 2 (Security) explicitly evaluates each applicable rule and reports Compliant / Non-compliant / N/A |
| 14 Build & Test | SECURITY-10 dep-scan; SECURITY-14 alert tests |
| 18 Production Readiness | Final compliance summary across all 15 rules; Section G of the readiness checklist |

---

## Team Defaults

When the AI cannot find clear evidence of compliance, it should:
1. Not auto-mark Compliant — require explicit evidence
2. Not auto-mark N/A without a specific reason
3. Default to Non-compliant + suggest the fix in the security report

This avoids "all green" theater on rules the AI didn't actually verify.

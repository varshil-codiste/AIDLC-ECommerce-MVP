# Functional Design Checklist — UoW-02 Auth + Role Gate

**Generated**: 2026-05-04T00:33:00Z
**Stage**: 8 — Functional Design
**UoW**: UoW-02

---

## Checklist

- [x] Every entity in `domain-entities.md` has fields, constraints, and relationships
  - User entity: 9 fields with type, nullable, constraints, notes; indexes defined; Prisma migration name specified
  - RefreshTokenEntry (Redis): 7 fields with key pattern, TTL, revocation strategies

- [x] Every business rule has BR-ID, statement, enforcement points, error code, user-facing copy
  - BR-AUTH-001 through BR-AUTH-011: all 11 rules carry full format (statement, enforcement, error code, user-facing copy or N/A rationale)

- [x] Every workflow has a Mermaid sequence diagram + text alternative
  - Workflow 1 (Login): Mermaid sequence + text alternative ✅
  - Workflow 2 (Token Refresh): Mermaid sequence + text alternative ✅
  - Workflow 3 (Logout): Mermaid sequence + text alternative ✅
  - Workflow 4 (RoleGuard): Mermaid sequence + text alternative ✅
  - State machine (User.status): ASCII diagram + text alternative ✅

- [x] FE in scope: every interactive element has a `data-testid`
  - `login-form-email`, `login-form-password`, `login-form-password-toggle`, `login-form-submit`, `login-form-error-banner`, `login-form-error-email`, `login-form-error-password`

- [x] Mobile in scope: N/A (no Mobile stack in this project)

- [x] AI/ML extension applicable rules addressed
  - N/A for UoW-02 — no LLM calls in auth flow; first LLM appearance is UoW-06

- [x] Accessibility rules addressed for FE (Level A)
  - Meaningful `<title>` in `app/login/page.tsx` metadata
  - `<html lang="en-IN">` inherited from UoW-01 layout
  - Labels via `htmlFor`/`id` pairs (no placeholder-only labeling)
  - `aria-describedby` for input error messages
  - `role="alert"` on ErrorBanner
  - `aria-busy` on SubmitButton during loading
  - Focus management to ErrorBanner on form error
  - All compliant with NFR-A11Y-08 Level A

- [x] Security extension applicable rules addressed at design stage
  - SECURITY-01 (encryption at rest + in transit): passwords hashed argon2id; PII columns flagged for at-rest encryption; HTTPS-only constraint documented; Redis TLS noted
  - SECURITY-03 (structured logging): auth events logged with required fields (`event_type`, `user_id`, `ip`, `outcome`)
  - SECURITY-05 (auth standards): JWT RS256, 15-min TTL, refresh rotation, reuse detection — all per OWASP
  - SECURITY-07 (brute-force protection): 5-attempt rate limit → 15-min cooldown → Redis-backed (BR-AUTH-007)
  - SECURITY-08 (token storage): accessToken in memory; refreshToken in HttpOnly cookie (BFF pattern)

- [x] API contract documented for all 3 UoW-02 endpoints (login, refresh, logout)

- [x] Seed data strategy documented (3 test users, dev-only script, meets password policy)

- [x] Token storage architecture documented with security rationale (memory + HttpOnly cookie)

- [x] Next.js middleware route protection documented

---

## Artifacts produced

| File | Status |
|------|--------|
| `UoW-02-domain-entities.md` | ✅ Complete |
| `UoW-02-business-rules.md` | ✅ Complete |
| `UoW-02-business-logic-model.md` | ✅ Complete |
| `UoW-02-frontend-components.md` | ✅ Complete |
| `UoW-02-functional-design-checklist.md` | ✅ Complete (this file) |

---

## Stage 8 verdict

All checklist items pass. No blocking findings at Functional Design stage.

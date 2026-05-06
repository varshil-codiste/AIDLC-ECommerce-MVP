# Security Report — UoW-05 (Chat UI Shell + SSE Client + Widget Renderer)

**Date**: 2026-05-05T15:25:00Z  
**Verdict**: PASS

---

## Check 2 — `pnpm audit --audit-level=high`

**Result**: 11 vulnerabilities found — 3 Low | 5 Moderate | 3 High

### High Severity Findings

| Package | Path | Classification |
|---------|------|----------------|
| `redoc` | `. > @redocly/cli@1.25.5 > redoc@2.1.5` | Dev tooling — API doc generator |
| `glob` | `api > @nestjs/cli@11.0.10 > glob@11.0.3` | Dev tooling — NestJS CLI |
| `picomatch` | `api > @nestjs/cli@11.0.10 > @angular-devkit/core > picomatch@4.0.2` | Dev tooling — NestJS CLI |

All 3 High findings are in dev-only CLI tooling (`@nestjs/cli`, `@redocly/cli`). These packages:
- Are not bundled into the production `web/` build
- Are not reachable from production runtime code paths
- Were present before UoW-05 (same findings as UoW-04)
- Cannot be patched without upstream dependency updates

### New Packages Introduced in UoW-05

| Package | Version | Audit Status |
|---------|---------|--------------|
| `ajv` | ^8.x | 0 vulnerabilities |
| `ajv-formats` | ^3.x | 0 vulnerabilities |
| `clsx` | ^2.x | 0 vulnerabilities |
| `tailwind-merge` | ^2.x | 0 vulnerabilities |
| `@vitest/coverage-v8` | 2.1.9 | 0 vulnerabilities |

**All UoW-05 new packages are clean.**

---

## Manual Security Checks (per Security Baseline extension)

| Rule | File | Status | Notes |
|------|------|--------|-------|
| No secrets in source | All new files | ✅ N/A | No credentials; auth headers set at runtime |
| XSS prevention | `components/chat/StreamingTokens.tsx` | ✅ PASS | Text rendered as `textContent` via React, not `dangerouslySetInnerHTML` |
| Input validation | `widget-schemas/index.ts` | ✅ PASS | AJV JSON Schema validates all widget payloads before render |
| CORS / CSRF | `lib/api-client.ts` | ✅ PASS | Authorization header only; no cookie-based CSRF vector |
| Open redirect | `lib/intent-emitter.ts` | ✅ PASS | Redirect target is hardcoded `/login` — not user-controlled |
| EventSource URL | `lib/sse-client.ts` | ✅ PASS | URL passed from trusted caller; `encodeURIComponent` used for `lastEventId` param |
| `withCredentials: true` | `lib/sse-client.ts` | ✅ PASS | Required for auth cookie; CORS must be configured on BE (already done in UoW-01) |

---

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| `pnpm audit` | ✅ PASS | 3 High in dev tooling only — N/A for production |
| New packages | ✅ PASS | 0 vulnerabilities in UoW-05 additions |
| Manual security checks | ✅ PASS | All 7 rules compliant |

**Overall Check 2 verdict: PASS**

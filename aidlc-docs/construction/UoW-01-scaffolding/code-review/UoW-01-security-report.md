# Security (SAST + Dependency) Report — UoW-01 (re-review)

**Generated**: 2026-05-04T00:32:00Z (re-review after fix patch)
**Tools**: `pnpm audit --prod` (CVE) + `pnpm licenses ls --prod` (license posture)
**Supersedes**: first-review run at 2026-05-04T00:31:00Z (which had 25 vulns)

---

## 1. Dependency CVE audit ✅ **Pass**

```
$ pnpm audit --prod
No known vulnerabilities found
```

**0 vulnerabilities** at any severity. Compares to the first-review run which had 25 (1 critical / 9 high / 11 mod / 4 low).

### What changed (the fix patch)

| File | Field | From | To | Resolved |
|------|-------|------|-----|----------|
| `web/package.json` | `dependencies.next` | 14.2.15 | **15.5.15** | 1 critical (Next auth-bypass) + 4 highs + multiple moderates |
| `web/package.json` | `dependencies.react`, `react-dom` | 18.3.1 | **19.0.0** | (peer of Next 15) |
| `web/package.json` | `@types/react`, `@types/react-dom` | 18.x | **19.0.0** | (alignment) |
| `web/package.json` | `eslint-config-next` | 14.2.15 | **15.5.15** | (alignment) |
| `web/package.json` | `eslint` | 8.57.1 | **9.17.0** | (peer of eslint-config-next 15) |
| `web/package.json` | `@testing-library/{jest-dom, react}`, `@vitejs/plugin-react`, `vitest` | various | latest patches | (alignment) |
| `web/package.json` | `postcss` (direct devDep) | 8.4.47 | **8.5.10** | postcss XSS (moderate) |
| `api/package.json` | `dependencies.@nestjs/{common,core,platform-express}` | 10.4.4 | **11.1.19** | 5 highs in transitives (multer, path-to-regexp, qs, cookie) |
| `api/package.json` | `devDependencies.@nestjs/{cli,schematics,testing}` | 10.x | **11.x** | (alignment) |
| `api/package.json` | new devDeps `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` | (missing) | `8.59.1` | AI Review concern from first review: were transitively-hoisted; now explicit |
| `package.json` (root) | new `pnpm.overrides.postcss` | — | `>=8.5.10` | Forces transitive postcss (Next-bundled) to patched version |

### Code-side SAST (handwritten files — re-checked)

| Concern | Result |
|---------|--------|
| Hard-coded secrets | ✅ none |
| `eval` / `Function()` / dynamic require | ✅ none |
| Unsafe shell exec / command injection vectors | ✅ none |
| SQL string concatenation | ✅ N/A (no SQL in UoW-01) |
| Unrestricted file upload / path traversal | ✅ N/A |
| Missing CSRF / CORS posture | ⚠️ deferred to UoW-02 (acceptable for `/health`-only) |
| Logging of PII or secrets | ✅ none |

---

## 2. License posture ✅ **Pass**

Re-audited after major bumps: still permissive only.

```
0BSD, Apache-2.0, BSD-2-Clause, BSD-3-Clause, CC-BY-4.0 (data only), ISC, MIT
```

**No AGPL. No GPL.** Per BR § 3.3 + NFR-SEC-UoW01-02 — compliant.

---

## 3. Verdict for this check

✅ **Pass**.

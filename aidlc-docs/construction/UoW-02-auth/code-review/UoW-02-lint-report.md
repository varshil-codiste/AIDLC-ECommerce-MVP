# Lint Report — UoW-02 Auth + Role Gate

**Generated at**: 2026-05-05T10:25:00Z
**Files checked**: 38 (all new/modified files for UoW-02)
**Tools**: ESLint (`@typescript-eslint` + `eslint-config-prettier`), `tsc --noEmit`

---

## Summary

| Stack | Errors | Warnings | Format violations |
|-------|--------|----------|-------------------|
| Backend Node (api) | 0 | 0 | 0 |
| Frontend (web) | 0 | 0 | 0 |

---

## Run Commands and Results

### API — ESLint
```
pnpm --filter @ecommmer/api lint
✓ No errors or warnings
```

### Web — Next.js lint
```
pnpm --filter @ecommmer/web lint
✔ No ESLint warnings or errors
```

### API — TypeScript
```
pnpm --filter @ecommmer/api typecheck
✓ 0 type errors
```

### Web — TypeScript
```
pnpm --filter @ecommmer/web typecheck
✓ 0 type errors
```

---

## Findings

### Errors
None.

### Warnings
None.

### Issues Fixed During Check 1 (before final pass)

Three lint errors were detected in `api/src/auth/auth.service.spec.ts` during the initial run and corrected before the final pass:

| File | Line | Rule | Fix applied |
|------|------|------|-------------|
| `auth.service.spec.ts` | 119 | `@typescript-eslint/no-require-imports` | Replaced `require('crypto')` with top-level `import { createHash } from 'crypto'` |
| `auth.service.spec.ts` | 181 | `@typescript-eslint/no-explicit-any` | Changed `as any` cast to `as unknown as import('@nestjs/core').Reflector` |
| `auth.service.spec.ts` | 189 | `@typescript-eslint/no-explicit-any` | Changed `as any` cast to `as unknown as ExecutionContext` |

Final pass produced zero errors.

---

## Verdict

✅ **Pass** — 0 errors AND 0 format violations across all stacks

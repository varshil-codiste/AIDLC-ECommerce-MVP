# Lint Report — UoW-11 (Semantic Search + Tracking + Returns)

**Generated at**: 2026-05-06T10:40:00Z
**Files checked**: 38 (24 new + 14 modified across api/src + web)

---

## Summary

| Stack | Errors | Warnings | Format violations |
|-------|--------|----------|-------------------|
| Backend Node (ESLint + Prettier + tsc --noEmit) | 0 (UoW-11 scope) | 0 | 0 |
| Frontend (next lint + tsc --noEmit) | 0 | 0 | 0 |

---

## Tooling

### Backend (`api/`)
- **ESLint**: `npx eslint . --ext .ts` — 2 pre-existing parser errors on `vitest.config.ts` / `vitest.e2e.config.ts` (not introduced by UoW-11 — `parserOptions.project` configuration issue from before this UoW). 0 errors, 0 warnings on UoW-11 source files.
- **TypeScript**: `npx tsc --noEmit` — exit 0 (no errors)
- **Prettier**: integrated into ESLint config — no format violations

### Frontend (`web/`)
- **Next.js lint**: `npx next lint` — `✔ No ESLint warnings or errors`
- **TypeScript**: `npx tsc --noEmit` — exit 0 (no errors)

---

## Files Checked

### Backend — New (15)
- `api/prisma/migrations/20260505220000_UoW-11-001-add-order-return-fields/migration.sql` (DDL only — no lint)
- `api/prisma/migrations/20260505220001_UoW-11-002-enable-product-search-indexes/migration.sql` (DDL only — no lint)
- `api/src/orchestrator/embedding/embedding.service.ts`
- `api/src/orchestrator/embedding/embedding-refresh.worker.ts`
- `api/src/orchestrator/embedding/embedding.module.ts`
- `api/src/orchestrator/agents/product/product-search-index.service.ts`
- `api/src/orchestrator/prompts/product-agent.v1.1.0.txt` (text — no lint)
- `api/src/orchestrator/prompts/order-agent.v1.1.0.txt` (text — no lint)
- `api/src/orchestrator/embedding/tests/embedding.service.spec.ts`
- `api/src/orchestrator/embedding/tests/embedding-refresh.worker.spec.ts`
- `api/src/orchestrator/embedding/tests/text-blob.pbt.spec.ts`
- `api/src/orchestrator/agents/product/tests/product-search-index.service.spec.ts`
- `api/src/orchestrator/agents/product/tests/comparison-attributes.pbt.spec.ts`
- `api/src/orchestrator/agents/product/tests/product.agent.shopper.spec.ts`
- `api/src/orchestrator/agents/order/tests/order.service.tracking-return.spec.ts`
- `api/src/orchestrator/agents/order/tests/order.agent.shopper.spec.ts`
- `api/src/orchestrator/agents/order/tests/tracking-events.pbt.spec.ts`

### Backend — Modified (10)
- `api/prisma/schema.prisma` (Prisma schema — checked by `prisma format` + `prisma validate`)
- `api/src/orchestrator/agents/product/product.service.ts`
- `api/src/orchestrator/agents/order/order.service.ts`
- `api/src/orchestrator/agents/product/product.tools.ts`
- `api/src/orchestrator/agents/order/order.tools.ts`
- `api/src/orchestrator/agents/product/product.agent.ts`
- `api/src/orchestrator/agents/order/order.agent.ts`
- `api/src/orchestrator/prompts/prompt-loader.service.ts`
- `api/src/orchestrator/orchestrator.module.ts`
- `api/src/orchestrator/agents/product/tests/product.service.spec.ts`
- `api/src/orchestrator/agents/order/tests/order-status-transition.pbt.spec.ts`
- `api/src/orchestrator/agents/product/evals/product-agent.eval.ts`
- `api/src/orchestrator/agents/order/evals/order-agent.eval.ts`

### Frontend — New (5)
- `web/widget-schemas/product_comparison.schema.json`
- `web/components/widgets/ProductComparison.tsx`
- `web/tests/product-comparison.spec.tsx`
- `web/tests/tracking-widget.spec.tsx`
- `web/tests/product-comparison-schema.pbt.spec.ts`
- `web/tests/tracking-widget-schema.pbt.spec.ts`

### Frontend — Modified (3)
- `web/components/widgets/TrackingWidget.tsx` (replaced stub)
- `web/components/widgets/WidgetRenderer.tsx`
- `web/widget-schemas/tracking_widget.schema.json`
- `web/widget-schemas/index.ts`

---

## Findings

### Errors
None within UoW-11 scope.

### Warnings
None.

### Resolved during write
- `@typescript-eslint/no-unused-vars` on `_score` in `product.service.ts:75` — replaced underscore-prefix with explicit `void score;` discard pattern (the project's ESLint config doesn't whitelist `_` prefix on destructured names).
- `TS2352` / `TS2493` on `embedding.service.spec.ts:50` (mock arg-typing of `vi.fn(impl)` produced empty-tuple type) — fixed by typing impl as `(...args: unknown[]) => Promise<unknown>` and pulling the signal via `args[1]`.

### Pre-existing issues NOT introduced by UoW-11
- ESLint parser errors on `vitest.config.ts` and `vitest.e2e.config.ts` — `parserOptions.project` does not include the config files themselves. Tracked as infrastructure follow-up; not a regression.

---

## Verdict

✅ **Pass** — 0 errors AND 0 format violations across both stacks within UoW-11 scope.

# Test Report — UoW-07 (Product Agent + Product Tools)

**Generated at**: 2026-05-05T16:49:00Z  
**Tests run**: 118 (API) + 61 (web) = 179 total

## Summary

| Stack | Suite | Total | Pass | Fail | Skip | Coverage |
|-------|-------|-------|------|------|------|----------|
| Backend Node | product.service.spec | 13 | 13 | 0 | 0 | 100% stmts |
| Backend Node | product.agent.spec | 5 | 5 | 0 | 0 | 70.38% stmts |
| Backend Node | product-price-parser.pbt | 5 | 5 | 0 | 0 | N/A (PBT logic) |
| Backend Node | product-bulk-parser.pbt | 5 | 5 | 0 | 0 | N/A (PBT logic) |
| Backend Node | All other suites (17) | 95 | 95 | 0 | 0 | — |
| Frontend | product-edit-preview.spec | 6 | 6 | 0 | 0 | — |
| Frontend | bulk-product-preview.spec | 5 | 5 | 0 | 0 | — |
| Frontend | product-widget-schemas.pbt | 12 | 12 | 0 | 0 | — |
| Frontend | All other suites (7) | 38 | 38 | 0 | 0 | — |

## Coverage (UoW-07 files)

| File | % Stmts | % Branch | % Funcs | NFR threshold | Status |
|------|---------|---------|---------|--------------|--------|
| product.service.ts | 100% | 75% | 100% | ≥75% (NFR-07-MAINT-01) | ✅ |
| product.agent.ts | 70.38% | 66.66% | 100% | None specified | ℹ️ |
| product.tools.ts | 100% | 100% | 100% | N/A | ✅ |
| All product files (excl. eval) | 84.07% | 84.09% | 96% | ≥80% greenfield default | ✅ |

### Uncovered paths in product.agent.ts (70.38%)

- Line 265: `default: throw new Error('Unknown tool: ...')` — unknown tool name case; requires LLM to hallucinate a tool name. Defensive code, no real path in production.
- Lines 268–278: `catch` block for tool dispatch failures — would require `ProductService` to throw; covered implicitly via `bulkCreate` partial-success test but not the catch-rethrow path in `dispatchTool`.
- Line 42: V8 artifact from object-literal multi-line parameter (false uncovered signal).

**Assessment**: Uncovered paths are all defensive/error branches. No logic gap vs business rules.

## LLM Eval Suite (NFR-07-AIML-02)

Eval suite at `api/src/orchestrator/agents/product/evals/product-agent.eval.ts` contains 8 cases (5 golden + 3 adversarial). Eval suite is not run in CI (requires live LLM API key); it is an offline validation harness. Coverage for eval file is excluded from threshold.

## Failures

None.

## Verdict

✅ **Pass** — 0 failing tests; `ProductService` coverage 100% (NFR-07-MAINT-01 ✅); overall product-agent coverage 84.07% (≥80% greenfield default ✅).

# Upstream — lint-aggregator

This skill is **locally-authored** — no single upstream skill aggregates linters across the five supported stacks (FE / BE Node / BE Python / BE Go / Mobile Flutter) and emits the verdict-block-shaped report. The wrapper at `../SKILL.md` carries the full conventions.

**Companion upstream**: none individually authoritative. The skill's behavior delegates to the per-stack lint tools chosen at Stack Selection (ESLint, Biome, ruff, golangci-lint, dart analyze) — which are widely covered in vendor documentation. The team contribution is the **aggregation layer** that runs all of them, formats results into the unified verdict shape, and respects Tier scoping.

If a future upstream emerges that fits this aggregator pattern, vendor it here:

```bash
git submodule add <upstream-repo-url> .aidlc/skills/construction/lint-aggregator/upstream
```

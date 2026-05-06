# Upstream — test-runner-aggregator

This skill is **locally-authored** — no single upstream skill aggregates test runners across the five supported stacks and emits the verdict-block-shaped report.

**Companion upstream(s)** (cover individual test frameworks):

- `trailofbits/testing-handbook-skills` — fuzzers, sanitizers, coverage patterns
- `getsentry/sentry-*-sdk` family — error tracking integration that complements test reporting
- Per-stack: Vitest / Jest / pytest / go test / flutter test are widely documented; the wrapper invokes them directly without needing a vendor skill

To vendor a companion (e.g., the Trail of Bits testing handbook):

```bash
gh repo clone trailofbits/<repo> /tmp/trailofbits-testing
rm -rf .aidlc/skills/construction/test-runner-aggregator/upstream
cp -r /tmp/trailofbits-testing/<path-to-skill> .aidlc/skills/construction/test-runner-aggregator/upstream
```

The team contribution is the aggregation + flake-handling + coverage-vs-NFR + Tier-scoping layer in `../SKILL.md`.

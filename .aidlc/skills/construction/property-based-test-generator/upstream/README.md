# Upstream — property-based-test-generator

Placeholder for the vendored upstream content.

**Recommended upstream**: `trailofbits/property-based-testing` — Hypothesis, smartcheck, fuzzing across languages (per VoltAgent/awesome-agent-skills entry under trailofbits).

To vendor:

```bash
gh repo clone trailofbits/<repo> /tmp/trailofbits-pbt
rm -rf .aidlc/skills/construction/property-based-test-generator/upstream
cp -r /tmp/trailofbits-pbt/<path-to-skill> .aidlc/skills/construction/property-based-test-generator/upstream
```

The AI-DLC wrapper at `../SKILL.md` layers on the per-stack framework table (fast-check / Hypothesis / rapid / glados), the Partial-mode rule subset enforcement, the auto-seed-as-regression-example pattern, and Tier-aware scoping.

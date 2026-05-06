# Upstream — multi-specialist-code-review

Placeholder for the vendored upstream content.

**Recommended upstream**: `neolab/code-review` — multi-specialist agents (bug-hunter, security-auditor, quality-reviewer, contract-reviewer, test-coverage-reviewer) per VoltAgent/awesome-agent-skills.

To vendor:

```bash
gh repo clone neolab/<repo> /tmp/neolab-code-review
rm -rf .aidlc/skills/construction/multi-specialist-code-review/upstream
cp -r /tmp/neolab-code-review/<path-to-skill> .aidlc/skills/construction/multi-specialist-code-review/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds: the seven review categories aligned to the team's Functional Design / NFR Design / Application Design artifacts, the verdict-synthesis logic (Approve / Concerns / Reject) that maps to Gate #4, the cross-reference to Check 1–3 reports to avoid duplicate findings, and Tier-aware specialist selection (e.g., security-auditor optional on Bugfix unless Security extension enabled).

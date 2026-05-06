# Upstream — sast-aggregator

Placeholder for the vendored upstream content.

**Recommended upstream(s)** (the Trail of Bits security family):

- `trailofbits/static-analysis` — CodeQL, Semgrep, SARIF integration
- `trailofbits/audit-context-building` — granular code analysis for security review
- `trailofbits/semgrep-rule-creator` — custom vulnerability pattern definitions
- `trailofbits/insecure-defaults` — detect hardcoded secrets, weak crypto, default credentials
- `trailofbits/constant-time-analysis` — timing side-channel detection in crypto

Plus optional: `behisecc/vibesec` for additional vulnerability patterns (IDOR, XSS, SQL injection, SSRF).

To vendor:

```bash
gh repo clone trailofbits/<repo> /tmp/trailofbits-static-analysis
rm -rf .aidlc/skills/construction/sast-aggregator/upstream
cp -r /tmp/trailofbits-static-analysis/<path-to-skill> .aidlc/skills/construction/sast-aggregator/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds: the cross-stack aggregation layer, the SECURITY-01..15 compliance walk against the AI-DLC extension rule file, the false-positive auto-detection with pod-revocable marking, and the unified verdict-block-shaped report.

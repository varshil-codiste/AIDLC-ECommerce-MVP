# Security Baseline — Opt-In

**Extension**: Security Baseline (15 OWASP-aligned rules adapted for Node / Python / Go / Flutter)
**Full rule file**: `extensions/security/baseline/security-baseline.md`

---

## Opt-In Prompt

The following question is automatically included in the Requirements Analysis clarifying questions when this extension is loaded:

```markdown
## Question: Security Baseline Extension
Should the Security Baseline rules (15 rules, OWASP-aligned) be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (Recommended for production-grade production deliverables)
B) No — skip all SECURITY rules (suitable for proof-of-concept, internal-only tools, or experimental work)
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

If the user answers `A`, the AI loads `security-baseline.md` and applies the rules at every applicable stage (Functional Design, NFR Design, Code Generation, Code Review, Production Readiness). Non-compliance becomes a blocking finding.

If `B`, the file is never loaded; security is left to the team's general practice.

If `X`, treat as a partial / custom request and clarify with a follow-up question file.

# Upstream — go-clean-architecture

This skill is **largely locally-authored** because no single upstream skill covers Go clean architecture comprehensively. The wrapper at `../SKILL.md` carries the full conventions; companions vendored here add focused value.

**Recommended companion upstream(s)**:
- `getsentry/sentry-go-sdk` — Sentry instrumentation for net/http, Gin, Echo, Fiber
- `trailofbits/static-analysis` — Semgrep/CodeQL rules useful for Go security patterns (cross-applies)
- `trailofbits/modern-python` (partially Go-relevant) — testing and static-analysis conventions transfer

To vendor:

```bash
gh repo clone getsentry/sentry-go /tmp/sentry-go
rm -rf .aidlc/skills/construction/go-clean-architecture/upstream
cp -r /tmp/sentry-go/<path-to-skill> .aidlc/skills/construction/go-clean-architecture/upstream
```

The clean-architecture layout, error-wrapping conventions, context-propagation rules, and slog field schema are all locally-authored on top.

# Upstream — fastapi-conventions

Placeholder for the vendored upstream content.

**Recommended upstream(s)**:
- `trailofbits/modern-python` — covers uv, ruff, pytest, type checking best practices (the foundation the team's Python conventions sit on)
- `getsentry/sentry-python-sdk` — Sentry instrumentation for FastAPI (also Django / Flask / Celery)
- FastAPI official patterns from VoltAgent's catalog if present

To vendor:

```bash
gh repo clone trailofbits/<repo> /tmp/trailofbits-modern-python
rm -rf .aidlc/skills/construction/fastapi-conventions/upstream
cp -r /tmp/trailofbits-modern-python/<path-to-skill> .aidlc/skills/construction/fastapi-conventions/upstream
```

The AI-DLC wrapper at `../SKILL.md` layers on the structured-logging fields, AppError → problem+json mapping, async/sync coherence rules, and the LangChain/AI-ML hook (when AI/ML extension is enabled).

# Upstream — nestjs-conventions

Placeholder for the vendored upstream content.

**Recommended upstream(s)**:
- NestJS official documentation and best-practices snippets
- `getsentry/sentry-nestjs-sdk` — Sentry instrumentation for NestJS (Express + Fastify variants)
- For DI / testing patterns: see VoltAgent/awesome-agent-skills entries tagged `nestjs`

To vendor:

```bash
git submodule add <upstream-repo-url> .aidlc/skills/construction/nestjs-conventions/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds: the mandatory pino structured-logging fields, AppError → problem+json mapping, and the repository-pattern enforcement that isolates the ORM from services. These layer on top of NestJS's native idioms.

# Upstream — observability-wirer

Placeholder for the vendored upstream content.

**Recommended upstream(s)** (the Sentry SDK family covers most stacks the workflow targets — 28 SDKs in the catalog):

- `getsentry/sentry-node-sdk` — Express / Fastify / Hono / NestJS / Bun / Deno
- `getsentry/sentry-nestjs-sdk` — NestJS-specific instrumentation
- `getsentry/sentry-nextjs-sdk` — Next.js 13+ integration
- `getsentry/sentry-python-sdk` — Django / FastAPI / Flask / Celery / WSGI / ASGI
- `getsentry/sentry-go-sdk` — net/http / Gin / Echo / Fiber
- `getsentry/sentry-flutter-sdk` — iOS / Android / Web / Desktop
- `getsentry/sentry-setup-ai-monitoring` — OpenAI / Anthropic / Vercel AI / LangChain instrumentation

Companion: OpenTelemetry semantic conventions for GenAI tracing (vendor docs).

To vendor:

```bash
git submodule add https://github.com/getsentry/sentry-javascript .aidlc/skills/operations/observability-wirer/upstream
# (or vendor a subset that covers the team's actual stacks)
```

The AI-DLC wrapper at `../SKILL.md` adds: the cross-stack wiring orchestration, the required-log-fields enforcement, the dashboards-as-code generator targeted at NFR-shaped panels, the alert generator that maps NFRs to thresholds with runbook links, and the sub-action 4 sensitive gate for credential rotation.

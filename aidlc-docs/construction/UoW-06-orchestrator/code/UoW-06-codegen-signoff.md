# Gate #3 — Code Generation Sign-Off
# UoW-06 (Orchestrator Core + LLM + SSE Server)

**Stage**: 12 Part 1 — Code Generation Plan  
**Issued**: 2026-05-05T15:40:00Z

---

## Plan Summary

| Item | Value |
|------|-------|
| New source files | 27 |
| Test files | 8 (7 unit + 1 e2e) |
| Modified files | 1 (`app.module.ts`) |
| New DB migrations | 2 |
| New packages | `openai`, `@anthropic-ai/sdk`, `@nestjs/throttler` |
| New env vars | `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_MAX_TOKENS_IN`, `LLM_MAX_TOKENS_OUT`, `LLM_SOFT_DEADLINE_MS` |

## Key Design Decisions to Validate

- **OpenAI as default LLM provider** — `LLM_PROVIDER=openai`, model `gpt-4o-mini`
- **Stub `RouterAgent` + `NoopAgent`** — real agents in UoW-07; harness fully wired
- **Redis TTL for confirmation** — ephemeral 5-min state; not Postgres
- **RxJS Observable SSE** — `merge(turn$, heartbeat$)` pattern
- **Prompt templates as `.txt` files** — version-pinned in `orchestrator.config.ts`

---

## Pod Sign-Off

- [x] Tech Lead: Chintan Bhai  Date: 2026-05-05  (ISO 8601)
- [x] Dev: Varshil  Date: 2026-05-05  (ISO 8601)

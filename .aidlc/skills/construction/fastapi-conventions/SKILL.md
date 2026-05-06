---
name: fastapi-conventions
description: |
  Use when generating FastAPI backend code at AI-DLC Stage 12 (Code Generation) for any UoW where Backend Python was chosen at Stack Selection Block C.1 = FastAPI. Enforces the FastAPI + Pydantic v2 + SQLAlchemy 2.x layered layout, async/sync coherence, structured JSON logging, AppError → RFC 7807 problem+json exception handlers, ruff format/check + mypy strict, and uv as the package manager (per Block C.2). Skips when BE Python uses Django/Flask/LiteStar instead.
aidlc:
  sensitive: false
---

# FastAPI Conventions

## When to Use (AI-DLC context)

This skill fires at **Stage 12 — Code Generation** for any UoW with Backend Python in scope where Stack Selection Block C.1 = **FastAPI**. (Django / Flask / LiteStar are out of scope for this skill — they would have their own.)

It generates idiomatic FastAPI code per `python-conventions.md`, with the team's structured-logging + error-envelope conventions baked in.

## What It Does

For each backend feature in the UoW:

1. Generates the feature module under `src/<package>/api/<feature>/`: `routes.py` + `schemas.py` (Pydantic models) + `service.py` + `repository.py`
2. Wires `core/config.py` (Pydantic Settings), `core/logging.py` (structlog or stdlib + python-json-logger), `core/security.py` (auth dependencies)
3. Sets up SQLAlchemy 2.x with `Mapped[...]` + `mapped_column(...)`; one `Base` per project; Alembic for migrations
4. Configures global exception handlers mapping `AppError` → problem+json with `Content-Type: application/problem+json`
5. Authors `tests/unit/test_<module>.py` and `tests/integration/test_<module>.py` using pytest + the mocking conventions from `python-conventions.md`
6. Updates `pyproject.toml` with new deps + lockfile via `uv add`

## Inputs

- `aidlc-docs/construction/{unit}/functional-design/business-logic-model.md`
- `aidlc-docs/construction/{unit}/functional-design/business-rules.md`
- `aidlc-docs/construction/{unit}/functional-design/domain-entities.md`
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (Block C)
- `aidlc-docs/construction/{unit}/nfr-design/nfr-design-patterns.md`
- `<workspace-root>/shared/openapi.yaml` (if api-contract-designer ran first — used to align Pydantic schemas)

## Outputs

Source code under the workspace root (NEVER under `aidlc-docs/`) following the FastAPI layout in `python-conventions.md`:

```
src/
└── <package_name>/
    ├── main.py
    ├── api/<feature>/
    │   ├── routes.py
    │   ├── schemas.py
    │   ├── service.py
    │   └── repository.py
    ├── core/
    └── domain/
tests/
├── unit/
└── integration/
pyproject.toml      ← updated
uv.lock             ← updated
```

Plus the code-summary entry in `<unit>-code-summary.md`.

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature; rare on Bugfix

## Team Conventions Applied

- **Pydantic v2** with `model_config = ConfigDict(extra="forbid")` on every public schema
- **Async-first**: prefer async routes + async DB driver (asyncpg / aiosqlite) when latency matters; sync acceptable for CPU-heavy work — never mix without intent
- **Structured JSON logs** with required fields (timestamp, level, request_id, user_id, service, version) — configure once at app init, never `basicConfig` from libraries
- **AppError + global handler** maps to RFC 7807 problem+json
- **Argon2id for passwords** (argon2-cffi); RS256/ES256 for JWTs
- **No `print()`** in production code paths
- **No `from <module> import *`**
- **No `Any`** in public APIs; mypy/pyright strict
- **uv as package manager** (Recommended) — `uv sync --locked` for installs; commit `uv.lock`
- **ruff check + ruff format** must report clean (rules: E, F, I, B, UP, C4, SIM)

## Tier-Specific Behavior

- **Greenfield**: full feature scaffolding, full test coverage, full Alembic migration setup
- **Feature**: scope to the new endpoints / models; reuse existing core/ infrastructure
- **Bugfix**: surgical change in the affected file; preserve everything else

## See Also

- Upstream skill: `./upstream/README.md` (trailofbits/modern-python — uv/ruff/pytest/type-checking; getsentry/sentry-python-sdk for instrumentation)
- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-generation.md`
- Stack convention: `../../aidlc-rule-details/construction/stacks/python-conventions.md` § FastAPI
- Stack Selection: `../../aidlc-rule-details/construction/stack-selection.md` Block C
- Compliance hooks: extensions/security/baseline (SECURITY-05/-08/-12/-15), extensions/ai-ml/lifecycle (when AI/ML extension on, this skill emits LangChain / OpenAI / Anthropic client wiring with prompt-registry imports)

## Trigger-test prompts

1. "Using AI-DLC, scaffold the auth FastAPI module with Pydantic + SQLAlchemy." (should trigger Stage 12 BE Python — FastAPI)
2. "Generate the /summarize endpoint with FastAPI and async LangChain." (should trigger)
3. "Implement the user-profile API in FastAPI." (should trigger)
4. "Build the Django views for the admin app." (should NOT trigger — wrong framework)
5. "Run the SAST scan on Python deps." (should NOT trigger — that's sast-aggregator)

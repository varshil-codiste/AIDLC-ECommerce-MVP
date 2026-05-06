# Python Backend Conventions

**Loaded by**: `construction/stack-selection.md` when Backend Python is in scope for a UoW.
**Applies to**: FastAPI / Django / Flask / LiteStar per Block C.1.

---

## Project Layout

### FastAPI (Recommended for new projects)
```
<service-root>/
├── pyproject.toml
├── uv.lock                     # if uv chosen
├── .python-version             # pinned via .python-version or pyenv
├── src/
│   └── <package_name>/
│       ├── __init__.py
│       ├── main.py             # FastAPI app instantiation
│       ├── api/
│       │   ├── __init__.py
│       │   └── <feature>/
│       │       ├── routes.py
│       │       ├── schemas.py  # Pydantic models
│       │       ├── service.py
│       │       └── repository.py
│       ├── core/
│       │   ├── config.py       # Pydantic Settings
│       │   ├── logging.py
│       │   └── security.py
│       ├── db/
│       │   ├── base.py
│       │   ├── session.py
│       │   └── migrations/     # Alembic
│       └── domain/             # entities, business rules
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── .env.example
```

### Django + DRF
```
<service-root>/
├── manage.py
├── pyproject.toml
├── <project>/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── wsgi.py / asgi.py
├── apps/
│   └── <feature>/
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── tests.py
└── ...
```

### Flask
```
<service-root>/
├── pyproject.toml
├── src/
│   └── <package_name>/
│       ├── __init__.py         # create_app()
│       ├── blueprints/
│       │   └── <feature>.py
│       ├── models/
│       └── extensions.py
├── tests/
└── .env.example
```

---

## Package Manager

| Choice | Convention |
|--------|-----------|
| uv (Recommended) | `uv sync --locked` for installs; `uv run` for commands; commit `uv.lock` |
| Poetry | `poetry install`; commit `poetry.lock`; use Poetry's lockfile semantics |
| pip + requirements.txt | Use `pip-tools` to compile `requirements.in` → `requirements.txt`; commit both |
| Pipenv | Discouraged for new projects |

Pick ONE per project — never mix.

---

## Lint / Format / Type-check

| Tool | Config | Team rule |
|------|--------|--------------|
| ruff | `pyproject.toml` `[tool.ruff]` | enabled rule families: E, F, I, B, UP, C4, SIM; line length 100 |
| ruff format | replaces black + isort | use ruff format, not black |
| mypy (Recommended) or pyright | `pyproject.toml` `[tool.mypy]` | strict mode; `disallow_untyped_defs`; `warn_unused_ignores` |

**ruff check + ruff format MUST report clean.**
**mypy MUST report 0 errors.**

---

## Test Conventions

| Concern | Convention |
|---------|------------|
| Framework | pytest |
| Unit tests | `tests/unit/test_<module>.py` |
| Integration tests | `tests/integration/` — use testcontainers / pytest-postgresql |
| HTTP mocking | `respx` (httpx) or `responses` (requests); MSW alternative |
| Async testing | `pytest-asyncio` with `asyncio_mode = "auto"` |
| Coverage | `pytest --cov=src --cov-fail-under=80` (greenfield) |

---

## Validation & Typing

- **FastAPI**: Pydantic v2 models for request / response; never `dict[str, Any]` for public surface
- **Django**: DRF serializers; consider drf-pydantic for type-safety
- **Flask**: Pydantic via `flask-pydantic` or marshmallow
- Reject unknown / extra fields by default (`model_config = ConfigDict(extra="forbid")`)
- Use `Annotated[Type, Field(...)]` for documenting constraints in Pydantic v2

---

## ORM / DB

| Choice | Convention |
|--------|-----------|
| SQLAlchemy 2.x | Use `Mapped[...]` + `mapped_column(...)`; one `Base` per project; Alembic for migrations |
| Django ORM | Standard models; migrations via `manage.py makemigrations` |
| SQLModel | Acceptable but second-class to SQLAlchemy 2.x |
| Tortoise / Peewee | Discouraged for new projects |

Async DB drivers (asyncpg) for FastAPI; sync drivers for Django.

---

## Logging

- **Library**: stdlib `logging` + `python-json-logger` for structured output (Recommended)
- **Format**: JSON; fields include `timestamp`, `level`, `request_id`, `user_id`, `service`, `version`
- **Configure once** at app init; do NOT call `basicConfig()` from libraries
- **No `print()` in production code**

---

## Error Handling

- Define a base `AppError(Exception)` with `code`, `http_status`, `user_message`
- FastAPI: register exception handlers that map `AppError` → problem+json
- Django: middleware or DRF exception handler that does the same
- Unknown errors → 500 + log stack with `request_id`

---

## Auth & Security

- Hash passwords with `argon2-cffi` (Recommended) or `bcrypt`
- JWTs via `python-jose` or `authlib`; algorithms RS256 / ES256
- Secrets via env loaded by Pydantic Settings; never hardcode
- Rate limiting via `slowapi` (FastAPI) or DRF throttling
- CORS allow-list explicit; never `*` in prod
- SQL injection: only via ORM or parameterized queries; never f-strings into SQL

---

## AI/ML Code Conventions (when AI/ML extension on)

- **LangChain / LlamaIndex** — use chains/runnables explicitly; no hidden global state
- **Prompt files** stored in `prompts/<task>/v<n>.md` — versioned, never inline string-concatenated
- **Pydantic models** for structured outputs (function-calling / JSON mode)
- **Eval** via `pytest` parametrized with golden set fixtures
- **Tracing** via OpenTelemetry or Langfuse (Recommended for LLM apps)

---

## Anti-patterns

- ❌ `from <module> import *`
- ❌ Mutable default arguments (`def f(x=[])`)
- ❌ `except Exception: pass`
- ❌ `print()` in production code
- ❌ Mixing sync and async unintentionally — pick one model per service
- ❌ `Any` annotations in public APIs
- ❌ Skipping mypy / pyright errors with `# type: ignore` without an explanation

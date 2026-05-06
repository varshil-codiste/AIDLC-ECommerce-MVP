# AI-DLC Profile — ECommmer-AIDLC

This file holds the **per-project adaptation context** that downstream stages read to tailor their behavior.

Preset applied: **codiste** (40-person AI agency, full-stack FE/BE/Mobile).

---

## Team

```yaml
team:
  name: "Codiste"
  size: 40
  type: "AI solutions agency"
  domains:
    - Frontend (Web)
    - Backend (Node.js, Python, Go)
    - Mobile (Flutter)
```

---

## Pod (sign-off ritual)

```yaml
pod:
  size: 2
  roles:
    - name: "Tech Lead"
      person: "Chintan Bhai"
      contact: "chintan.p@codiste.com"
    - name: "Dev"
      person: "Varshil"
      contact: "varshil.g@codiste.in"
  signoff_mechanism: "in-file (markdown signature) or async via PR/commit comment"
  severity_1_exception: "Tech Lead alone for severity-1 hotfix; Dev countersigns within 24h"
```

---

## Preset

```yaml
preset: "codiste"
```

---

## Stack defaults (codiste preset)

```yaml
stack_recommendations:
  frontend_web:
    framework: "Next.js (App Router)"
    ui: "Tailwind + shadcn/ui"
    server_state: "TanStack Query"
    test: "Vitest"
    lint: "ESLint + Prettier"

  backend_node:
    framework: "NestJS"
    orm: "Prisma"
    test: "Vitest"
    lint: "ESLint + Prettier"
    logging: "pino (JSON, request-ID correlated)"

  backend_python:
    framework: "FastAPI"
    orm: "SQLAlchemy 2.x"
    package_manager: "uv"
    test: "pytest"
    lint_format: "ruff check + ruff format"
    type_check: "mypy strict"

  backend_go:
    layer: "stdlib + chi router"
    layout: "cmd/ + internal/ + pkg/ (clean architecture)"
    lint: "golangci-lint"
    logger: "log/slog (JSON)"

  mobile_flutter:
    state: "Riverpod (code-gen with @riverpod)"
    layout: "lib/features/<feature>/{presentation,domain,data}"
    test: "flutter_test + mocktail"

  cross_stack:
    contract_format: "OpenAPI 3.1 (REST)"
    auth: "JWT with refresh-token rotation, RS256"
    cloud_target: "AWS (default) — fall back to GCP / Azure / on-prem per client"
    queue: "BullMQ (Node) / Celery (Python) / Asynq (Go) — Redis-backed"
    vector_store: "pgvector (Postgres extension) for most cases; Pinecone for scale"
```

---

## Operations preferences (codiste preset)

```yaml
operations:
  ci:
    primary: "GitHub Actions"
    fallback: ["GitLab CI", "Jenkins", "Bitbucket Pipelines"]
    convention: "scripts/ci.sh per stack — invoked from workflow file"

  observability:
    error_tracker: "Sentry"
    apm: "Datadog (preferred for production-grade) — fall back to OTel + Grafana stack for self-hosted"
    log_retention: "90 days"
    alerting_channel: "Slack #incidents (warnings) + PagerDuty (severity-1)"

  iac:
    tool: "Terraform"
    state_backend: "Terraform Cloud (preferred) — S3+DynamoDB fallback"
    auth: "OIDC for CI; never long-lived access keys"
    tags_required: [project, env, owner, cost-center]

  release_strategy:
    default: "rolling"
    avoid_window: "Friday after 4pm local time (Codiste convention) — emergencies only"
```

---

## Conventions

```yaml
conventions:
  test_id_attribute_fe: "data-testid"
  test_key_attribute_mobile: "ValueKey"
  log_format: "JSON structured"
  log_required_fields:
    - timestamp
    - level
    - message
    - service
    - version
    - request_id
    - user_id
    - trace_id
    - span_id
    - environment
  password_hash: "argon2id"
  jwt_algorithm: "RS256"
```

---

## Extensions (default opt-ins)

```yaml
extensions_default:
  security_baseline: "Ask"
  property_based_testing: "Ask"
  ai_ml_lifecycle: "Ask"
  accessibility_wcag22_aa: "Ask"
```

---

## Brand & locale

```yaml
brand:
  artifact_language: "English"
  pronouns_in_prose: "we"

locale:
  date_format: "ISO 8601"
  timezone: "Asia/Kolkata"
```

---

## Project metadata

```yaml
project:
  name: "ECommmer-AIDLC"
  product_name: "Chat-Native E-Commerce Platform — Multi-Agent MVP"
  created_at: "2026-05-04T00:00:00Z"
  workspace_root: "/home/user/Documents/Project/ECommmer-AIDLC"
  primary_contact: "dev@codiste.com"
  notes: "Greenfield. Source PRD: aidlc-docs/inception/business-requirements/sources/ecommerce-ops-hub-prd.md (v0.3, 2026-04-17)."
```

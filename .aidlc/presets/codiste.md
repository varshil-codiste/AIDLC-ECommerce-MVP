# Codiste preset

This is the **original Codiste flavor** of AI-DLC, preserved as a preset so the AI-DLC core can stay generic while teams that want the Codiste-shaped opinions can opt back in.

To apply this preset, fill the values into `aidlc-docs/aidlc-profile.md` at first invocation (or copy this file's contents into the profile's `## Preset` section).

---

## Team profile

```yaml
team:
  name: "Codiste"
  size: 40
  type: "AI solutions agency"
  domains:
    - Frontend (Web)
    - Backend (Node.js, Python, Go)
    - Mobile (Flutter)

pod:
  size: 2
  roles:
    - Tech Lead
    - Dev
  signoff_mechanism: "in-file (markdown signature) or async via PR/commit comment"
  severity_1_exception: "Tech Lead alone for severity-1 hotfix; Dev countersigns within 24h"
```

---

## Stack-selection defaults (Codiste flavor)

When the workflow asks "Recommended for new greenfield projects," these are the answers Codiste typically picks. They are **suggestions, not mandates** — every project at Stack Selection (Stage 11) still chooses freely.

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

## Codiste-specific BR checklist additions (Stage 1)

In addition to the standard tiered checklists, Codiste adds these items to **Greenfield Tier**:

### Section C — AI-product specifics (Codiste-flavored)

- [ ] AI/ML usage scope — does this product use LLMs / RAG / classifiers / none?
- [ ] Data retention policy — how long do we keep user data, training data, logs?
- [ ] Brand assets availability — logo, colors, fonts ready or to be designed?
- [ ] Existing IP / open-source dependencies — anything to inherit or avoid?
- [ ] Accessibility commitment — WCAG 2.2 AA target? other?
- [ ] Legal review status — privacy policy, terms-of-service plan

These are 6 of the ~20 Greenfield items; the other 14 are stack-and-business standard.

---

## Operations defaults (Codiste flavor)

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

## ASCII diagram pattern (for Codiste full-stack examples)

The original ASCII diagram pattern Codiste used for full-stack architecture — preserved here for teams who want the same pedagogical example:

```
+---------------------------+   +---------------------------+   +---------------------------+
|        Frontend           |   |         Backend           |   |          Mobile           |
|  React / Next.js / Vue    |<->|  Node / Python / Go       |<->|  Flutter (iOS+Android)    |
|                           |   |                           |   |                           |
+---------------------------+   +---------------------------+   +---------------------------+
              ^                               ^                              ^
              |                               |                              |
              +---------------+---------------+------------------------------+
                              |
                              v
                  +---------------------------+
                  |    Shared Services        |
                  |  (DB, Auth, Storage)      |
                  +---------------------------+
```

---

## Why preserve this preset?

The original Codiste AI-DLC carried opinions earned through real production work — e.g., "scripts/ci.sh per stack so any CI provider can call one script regardless of provider", "no Friday afternoon launches", "uv as package manager for new Python projects". These are valuable defaults for any team that doesn't have its own opinions yet.

When you adopt AI-DLC and don't have strong preferences, copying this preset into your `aidlc-profile.md` gives you a battle-tested baseline. You can then deviate freely.

To author your own preset: copy this file to `.aidlc/presets/<your-team>.md`, edit the values, and reference it from `aidlc-profile.md`.

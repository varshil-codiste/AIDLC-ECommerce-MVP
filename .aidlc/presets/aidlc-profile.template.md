# AI-DLC Profile — <project name>

This file holds the **per-project adaptation context** that downstream stages read to tailor their behavior. It's filled in once at first invocation (Stage 0 — Workspace Detection) and updated by the pod whenever the project's adaptation context changes.

The workflow's rules stay generic; the profile is where each project encodes its specifics. Treat it like a configuration file — small, declarative, version-controlled.

Save this file at `aidlc-docs/aidlc-profile.md` in the project repo.

---

## Team

```yaml
team:
  name: "<your team or org name>"
  size: <integer — number of engineers, optional>
  type: "<e.g., agency / product company / open-source project / internal platform>"
  domains:
    - "<e.g., Frontend Web>"
    - "<e.g., Backend Node>"
    - "<more — only the ones relevant>"
```

Used by:
- `common/welcome-message.md` — greets the user with the team name
- `common/pod-ritual.md` — pod size + role names come from here
- All stages that say "the team" in generic prose

---

## Pod (sign-off ritual)

```yaml
pod:
  size: <2 by default; some teams use 3 with explicit PM>
  roles:
    - "<role name 1, e.g., Tech Lead>"
    - "<role name 2, e.g., Dev>"
    - "<role name 3, optional>"
  signoff_mechanism: "<e.g., in-file markdown signature; PR comment; Slack URL pasted into signoff file>"
  severity_1_exception: "<rule for sev-1 hotfixes if any — e.g., 'Tech Lead alone, Dev countersigns within 24h'>"
```

Used by:
- `common/pod-ritual.md` — the 2-of-2 default; can be overridden to 2-of-3 etc.
- `common/approval-gates.md` — gate signature requirements

---

## Preset (optional)

If the team adopts an existing preset wholesale, name it here. Downstream stages read preset values for any field not explicitly set in this profile.

```yaml
preset: "<name>"  # e.g., "codiste" — see .aidlc/presets/<name>.md
```

Available presets:
- `codiste` — original Codiste flavor (40-person AI agency, full-stack FE/BE/Mobile)
- `<add others as the team authors them under .aidlc/presets/>`

If the field is empty, no preset is applied; downstream stages use AI-DLC's neutral defaults.

---

## Stack defaults (override the preset / neutral default)

These are **suggestions** that show up as "Recommended" tags in the Stack Selection question file (Stage 11). The pod can deviate per-UoW; the profile just sets the team's standard answer.

```yaml
stack_recommendations:
  frontend_web:
    framework: "<e.g., Next.js / React / Vue / Astro / N/A>"
    ui: "<e.g., Tailwind + shadcn/ui / MUI / Mantine / N/A>"
    server_state: "<e.g., TanStack Query / RTK Query / SWR / N/A>"
    test: "<e.g., Vitest / Jest / N/A>"
    lint: "<e.g., ESLint + Prettier / Biome / N/A>"

  backend_node:
    framework: "<e.g., NestJS / Express / Fastify / Hono / N/A>"
    orm: "<e.g., Prisma / Drizzle / TypeORM / Knex / N/A>"
    test: "<e.g., Vitest / Jest / N/A>"
    lint: "<e.g., ESLint + Prettier / Biome / N/A>"

  backend_python:
    framework: "<e.g., FastAPI / Django / Flask / LiteStar / N/A>"
    orm: "<e.g., SQLAlchemy 2.x / Django ORM / N/A>"
    package_manager: "<e.g., uv / Poetry / pip / Pipenv / N/A>"
    test: "<e.g., pytest / N/A>"
    lint_format: "<e.g., ruff check + ruff format / black + flake8 / N/A>"
    type_check: "<e.g., mypy / pyright / N/A>"

  backend_go:
    layer: "<e.g., stdlib + chi router / Gin / Fiber / Echo / N/A>"
    layout: "<e.g., cmd + internal + pkg / flat / N/A>"
    lint: "<e.g., golangci-lint / staticcheck / N/A>"
    logger: "<e.g., log/slog / zerolog / N/A>"

  mobile_flutter:
    state: "<e.g., Riverpod / BLoC / Provider / N/A>"
    layout: "<e.g., features/<feature>/{presentation,domain,data} / flat / N/A>"
    test: "<e.g., flutter_test + mocktail / flutter_test + mockito / N/A>"

  cross_stack:
    contract_format: "<e.g., OpenAPI 3.1 / GraphQL SDL / Protobuf / shared TS types / N/A>"
    auth: "<e.g., JWT with refresh-token rotation / OAuth 2.0 + PKCE / passwordless / N/A>"
    cloud_target: "<e.g., AWS / GCP / Azure / self-hosted / mixed>"
    queue: "<e.g., BullMQ / Celery / Asynq / NATS / N/A>"
    vector_store: "<e.g., pgvector / Pinecone / Qdrant / Weaviate / N/A>"
```

Set fields to `"N/A"` (with quotes) for stacks the team doesn't support. Stage 11 will skip those blocks.

---

## Operations preferences

```yaml
operations:
  ci:
    primary: "<e.g., GitHub Actions / GitLab CI / Jenkins / Bitbucket Pipelines>"
    convention: "<e.g., 'scripts/ci.sh per stack' / 'monolithic workflow file' / 'per-PR matrix'>"

  observability:
    error_tracker: "<e.g., Sentry / Datadog / Bugsnag / Rollbar / N/A>"
    apm: "<e.g., Datadog / OTel + Grafana / New Relic / cloud-native / N/A>"
    log_retention: "<e.g., 30 days / 90 days / 1 year / 7 years (regulated)>"
    alerting_channel: "<e.g., Slack / PagerDuty / Email / combined>"

  iac:
    tool: "<e.g., Terraform / Pulumi / AWS CDK / cloud-native / N/A>"
    state_backend: "<e.g., Terraform Cloud / S3+DynamoDB / GCS / Azure Blob / N/A>"
    tags_required:
      - "<e.g., project>"
      - "<e.g., env>"
      - "<e.g., owner>"

  release_strategy:
    default: "<e.g., rolling / blue-green / canary>"
    avoid_window: "<e.g., 'Friday after 4pm' / 'none — emergencies only' / 'public holidays'>"
```

---

## Conventions (used by stack-conventions files)

```yaml
conventions:
  test_id_attribute_fe: "data-testid"      # default; some teams use "qa-id"
  test_key_attribute_mobile: "ValueKey"    # default; some teams use Keys helper
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
  password_hash: "argon2id"               # alternatives: bcrypt (cost ≥ 12)
  jwt_algorithm: "RS256"                  # alternatives: ES256
```

---

## Extensions (default opt-ins)

The profile can pre-set the team's default opt-in answers for the four optional extensions. Stage 4 still asks the question, but pre-fills the answer based on the profile.

```yaml
extensions_default:
  security_baseline: "<Yes / No / Ask>"
  property_based_testing: "<Yes / No / Partial / Ask>"
  ai_ml_lifecycle: "<Yes / No / Partial / Ask>"
  accessibility_wcag22_aa: "<Yes / No / Partial / Ask>"
```

`Ask` means the workflow always asks per-project.

---

## Brand & locale (optional)

```yaml
brand:
  artifact_language: "English"   # or es / fr / hi / etc. — applies to generated docs/checklists
  pronouns_in_prose: "we"        # or "the team" / "you" — used in stage-rule narrative

locale:
  date_format: "ISO 8601"
  timezone: "UTC"                # or e.g., "Asia/Kolkata"
```

---

## Project metadata

```yaml
project:
  name: "<repo name or product name>"
  created_at: "<ISO timestamp filled by Workspace Detection>"
  workspace_root: "<absolute path filled by Workspace Detection>"
  primary_contact: "<email or handle>"
  notes: "<anything special — regulatory commitments, client-specific quirks>"
```

---

## How this profile is used

- **Workspace Detection (Stage 0)** creates this file from the template if it doesn't exist; populates `project.created_at`, `project.workspace_root`, and detected `team.domains`; opens question files for the rest.
- **All stages that previously hard-coded "Codiste"** now read from this profile to fill in the team name, pod size, recommended stacks, etc.
- **Stack Selection (Stage 11)** reads `stack_recommendations` to pre-tag "(Recommended)" options.
- **Approval Gates** read `pod.roles` to verify signers match.
- **Operations stages (15–18)** read `operations.*` for CI/observability/IaC defaults.

The profile is the **single source of truth for adaptation context**. Rule files no longer need to know who the team is.

---

## Editing the profile mid-project

The profile can be updated at any time, but changes that affect existing artifacts (e.g., changing pod roles after Gate #1 was signed) follow `common/workflow-changes.md`. Some changes invalidate prior signoffs; the workflow surfaces those at update time.

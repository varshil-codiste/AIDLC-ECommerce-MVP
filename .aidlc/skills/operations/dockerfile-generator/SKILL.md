---
name: dockerfile-generator
description: |
  Use when generating Dockerfiles at AI-DLC Stage 15 (Deployment Guide) for any containerized stack present in the project. Produces multi-stage non-root Dockerfiles per stack (Frontend Next.js, Backend Node, Backend Python with uv, Backend Go to distroless static), plus a docker-compose.yml that wires up the detected stacks with a Postgres + Redis baseline. Each Dockerfile includes a HEALTHCHECK directive, runs as a non-root user, and uses immutable digest pins for base images. Sensitive operation - promoting an image to a production registry tag - requires per-action signoff per skill-policy.md.
aidlc:
  sensitive: true
  blast-radius: production-deploy
  countersign-required-at: per-action-signoff
---

# Dockerfile Generator

## When to Use (AI-DLC context)

This skill fires at **Stage 15 — Deployment Guide** (`../../aidlc-rule-details/operations/deployment-guide.md`) Step 2 (Generate Dockerfiles per stack). It writes the actual `Dockerfile` per stack and the project-level `docker-compose.yml` per the deployment-plan answers.

It also fires when a CI release pipeline promotes a built image to a production registry tag — that operation is the **sensitive action** that requires a per-action signoff before live mutation.

## What It Does

### Sub-action 1: Generate Dockerfiles (read-write to workspace, NOT sensitive)

For each containerized stack (Frontend / Backend Node / Backend Python / Backend Go):

1. Reads chosen frameworks from Stack Selection
2. Authors a multi-stage Dockerfile per stack matching the templates in `operations/deployment-guide.md`:
   - **deps** stage: install dependencies via the chosen package manager (pnpm with frozen lockfile, uv with locked sync, go mod download)
   - **build** stage: produce artifacts (Next.js standalone output, NestJS dist/, FastAPI wheel-ready venv, Go static binary)
   - **runtime** stage: minimal base, non-root user, only artifacts copied in
3. Includes `HEALTHCHECK` matching the chosen `/health` endpoint
4. Uses **digest-pinned base images** (e.g., `node:20-alpine@sha256:...`) — never bare tags in production paths
5. Mobile (Flutter) is NOT containerized; the skill emits a note pointing to `mobile-distribution.md` instead

### Sub-action 2: Generate docker-compose.yml (read-write to workspace, NOT sensitive)

Produces `<workspace-root>/docker-compose.yml` that wires up:
- Postgres baseline (if any BE stack uses it)
- Redis baseline (if NFR Design listed a cache)
- Each detected backend service
- The frontend service
- Healthcheck-aware `depends_on` conditions

Also produces `docker-compose.staging.yml` if the deployment-plan answered staging environment.

### Sub-action 3: Promote-to-prod (SENSITIVE — requires per-action signoff)

When invoked with intent to promote a built image to a production registry tag:

1. Refuses to run if no `<ts>-image-promote-prod-signoff.md` exists at `aidlc-docs/operations/skill-actions/`
2. Validates the signoff per `skill-policy.md` § 2 (both signatures, ISO dates within 7 days, plan-output exists)
3. If validation fails, emits a `blocked-by-policy` audit entry and refuses
4. If valid, performs the registry promotion (docker pull + retag + push) in dry-run-then-live mode

## Inputs

- `aidlc-docs/operations/deployment/deployment-plan.md`
- `aidlc-docs/aidlc-state.md` (detected stacks, Tier)
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (per-UoW framework choices)
- For sub-action 3: `aidlc-docs/operations/skill-actions/<ts>-image-promote-prod-signoff.md`

## Outputs

For sub-actions 1–2:
- `<workspace-root>/<stack>/Dockerfile` per containerized stack
- `<workspace-root>/docker-compose.yml`
- `<workspace-root>/docker-compose.staging.yml` (if staging in scope)
- `aidlc-docs/operations/deployment/dockerfiles-summary.md` (which Dockerfiles were generated, with digest pins recorded)

For sub-action 3:
- A registry promotion log entry in `aidlc-docs/operations/deployment/promotion-history.md`
- Two audit.md entries (pre-invocation + post-invocation per `skill-policy.md` § 1)

## Governance

- **Free-roam invocation** for sub-actions 1–2 (Dockerfile + compose authoring): standard audit.md entries, no countersign
- **Sensitive flag**: yes, for sub-action 3 (image promotion to production)
- **Blast radius**: production-deploy
- **Countersign required at**: per-action-signoff (path under `aidlc-docs/operations/skill-actions/`)
- **Tier scope**: Greenfield, Feature; Bugfix only when deploying a hotfix release

## Team Conventions Applied

- **Multi-stage builds always**: deps → build → runtime — never single-stage in production paths
- **Non-root user always**: USER directive set, application files chown'd to that user
- **HEALTHCHECK directive** in every Dockerfile pointing at the service's /health endpoint
- **Digest-pinned base images** (`@sha256:...`) — bare tags rejected as warnings, blocked in production paths
- **Lockfile-respecting installs**: `pnpm install --frozen-lockfile`, `uv sync --locked`, `go mod download` — never plain installs
- **No secrets / API keys** in Dockerfiles or compose files; loaded from env or secret manager at runtime
- **Layer cache friendliness**: copy lockfiles before source so dependency installs cache cleanly
- **Distroless or alpine** base images for backends (smallest attack surface)
- **CI integration via `scripts/ci.sh`** convention (per `operations/deployment-guide.md` § Step 6) — Dockerfile-build steps invoke the same script CI uses
- **Signoff has 7-day TTL** (per `skill-policy.md` validation) — stale signoffs invalidate; new dry-run + new signoff required

## Tier-Specific Behavior

- **Greenfield**: full Dockerfile per stack, full compose, full staging variant
- **Feature**: Dockerfile only for stacks the feature added; compose updated additively
- **Bugfix**: skip unless this is a hotfix that requires an out-of-cycle deploy; in that case re-issue the existing Dockerfile with the patched commit SHA, signoff required for the re-deploy

## Per-action signoff template (sub-action 3 only)

When this skill needs to promote an image, it pre-fills the signoff at:

```
aidlc-docs/operations/skill-actions/<ISO-timestamp>-image-promote-prod-signoff.md
```

Following the universal template from `skill-policy.md` § 2:

```markdown
# Skill Action Signoff — Promote image to production

**Skill**: dockerfile-generator
**Stage**: 15 — Deployment Guide
**Action summary**: Promote <image>:<source-tag> → <image>:prod-<sha>
**Plan output (dry-run)**: ./<ts>-promote-plan.md
**Tier**: <…>
**Sensitive flag**: yes — blast-radius=production-deploy

- [ ] Tech Lead: ____________  Date: ____________  (ISO 8601)
- [ ] Dev:       ____________  Date: ____________  (ISO 8601)

## Plan summary
<paste of dry-run output: source image digest, target tag, registry URL, expected pull/push sequence>

## Risk acknowledgement
<one paragraph the pod writes acknowledging what's changing in production>
```

The skill refuses to live-promote without both signatures, valid ISO dates within 7 days, plan-output file present, and risk acknowledgement non-empty.

## Failure modes

- **Stack not container-friendly** (e.g., Flutter): emit a clear note redirecting to `mobile-distribution.md`
- **Lockfile missing**: setup error → BLOCK
- **Signoff missing or stale (sub-action 3)**: blocked-by-policy audit entry, refusal with concrete remediation steps
- **Registry credentials unavailable**: fail closed; surface a setup error pointing to secret-manager configuration

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/operations/deployment-guide.md`
- Sensitive-skill governance: `../../skills/skill-policy.md` § 2 (Sensitive Skills) and § Per-action signoff
- Sibling skills: `../terraform-iac-author/SKILL.md` (also sensitive), `../observability-wirer/SKILL.md`
- Upstream: `./upstream/README.md`

## Trigger-test prompts

1. "Using AI-DLC, generate the Dockerfiles for all detected stacks." (should trigger Stage 15 sub-action 1)
2. "Build the docker-compose.yml for local dev." (should trigger sub-action 2)
3. "Promote the auth-service:rc-1234 image to production." (should trigger sub-action 3 — sensitive; requires signoff)
4. "Run lint on the Dockerfiles." (should NOT trigger — that's lint-aggregator)
5. "Apply the Terraform plan." (should NOT trigger — that's terraform-iac-author)

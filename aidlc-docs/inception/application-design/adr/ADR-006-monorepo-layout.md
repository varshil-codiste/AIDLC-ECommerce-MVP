# ADR-006 — Monorepo with web / api / shared / infra

**Status**: Accepted
**Date**: 2026-05-04
**Decision-makers**: Pod via Stage 6 Q7 = A

## Context

The MVP has 1 frontend (Next.js), 1 backend (NestJS modular monolith), shared contracts (OpenAPI + JSON Schemas + intent types), and infra. Repo layout choice:
1. Monorepo
2. Split repos (web, api separate)
3. Three repos (web, api, shared-contracts published to a registry)

Constraints:
- Pod size = 2; single PR for cross-stack changes is invaluable
- OpenAPI is the source of truth — FE and BE both consume it
- Codiste convention: `scripts/ci.sh` per stack invoked from a single workflow file

## Decision

Single Git repository with this top-level layout (per `application-design.md` § 7):

```
ECommmer-AIDLC/
├── web/         # Next.js
├── api/         # NestJS
├── shared/      # OpenAPI + widget schemas + intent schemas + generated TS types
├── infra/       # Stage 11 / Stage 16 contents
├── scripts/     # ci.sh + dev.sh + seed scripts
└── aidlc-docs/  # documentation only
```

CI uses path filters: changes under `web/**` run the web pipeline, `api/**` run the api pipeline, `shared/**` runs both.

## Consequences

**Positive**
- One PR for an FE↔BE contract change; `shared/openapi.yaml` is the single edit point
- Easy local dev — clone once, run `scripts/dev.sh`
- Shared TS types regenerate in one place; no version skew between web and api

**Negative**
- Repo gets larger over time (acceptable; modern Git tooling handles multi-GB repos fine)
- Access control is coarse-grained (all-or-nothing) — fine for a 2-person pod, less so for a 50-person team

**Trigger to revisit**
- Multiple teams own different parts of the codebase and want independent ownership / CODEOWNERS strictness beyond what a monorepo cleanly supports
- A shared library needs to be consumed by external projects (would extract to its own repo)

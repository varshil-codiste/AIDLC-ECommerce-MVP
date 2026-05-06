# ADR-001 — Adopt Modular Monolith over Microservices

**Status**: Accepted
**Date**: 2026-05-04
**Decision-makers**: Pod (Tech Lead + Dev) via Stage 6 Q1 = A

## Context

PRD § 10 sketches an orchestrator + 5 LLM agents + Core API + Postgres + Redis. Two natural choices:
1. Modular monolith — one deployable, internal module boundaries
2. Microservices — separate services per agent / orchestrator / Core API

Constraints in play:
- BR § 2.3 lean budget (< $25K total for build + 6 months runtime)
- Pod size = 2; no dedicated platform / SRE staff
- MVP scale = 5–10 actual users (Stage 4 Q6); design ceiling = 1K concurrent
- Strict data classification (BR § 2.8) — separate KMS, immutable audit log, segregation
- Single shared Postgres for all entities

## Decision

Modular monolith. One `api` service binary; internal module boundaries enforced by NestJS module structure. Postgres and Redis are external. Frontend is a separate `web` container.

## Consequences

**Positive**
- One deploy pipeline, one CI matrix; pod-of-2-friendly
- Agent-to-Core-API calls are direct function calls (zero network hop, zero serialization overhead) — supports the < 1.5 s first-token target
- Cross-cutting concerns (audit, role gate, idempotency, telemetry) implemented once as middleware
- Refactoring cost low: a future split into microservices reuses module boundaries

**Negative**
- A bug in one module can take down the whole service (mitigated by per-module circuit breakers around LLM calls + 99.5% uptime target accounts for outages)
- Single language / framework lock-in (NestJS / TypeScript) — acceptable per codiste preset
- Horizontal scaling means scaling the whole service even if only one agent is hot (acceptable at MVP scale; stateless service makes horizontal scale-out trivial when needed)

**Trigger to revisit**
- Concurrent users approach the design ceiling (1K) AND a single agent dominates load
- The team grows past a single ownable codebase
- A regulated workload requires process-level isolation

# ADR-004 — Redis Streams as the inter-agent event bus

**Status**: Accepted
**Date**: 2026-05-04
**Decision-makers**: Pod via Stage 6 Q6 = A

## Context

PRD § 10 specifies Redis Streams. Alternatives considered:
1. Redis Streams (PRD's choice)
2. Postgres LISTEN/NOTIFY
3. Both

We already have Redis in the stack for refresh-token storage and rate-limit counters, so the marginal infra cost is zero.

## Decision

Redis Streams. Outbox pattern bridges Postgres-as-system-of-record and Redis Streams as the transport.

## Consequences

**Positive**
- Consumer groups + pending-entry auto-claim give us at-least-once delivery without a separate queue service
- Stream replay is straightforward (`agent_events` table holds the durable copy)
- Lightweight ops surface (single Redis instance for MVP)

**Negative**
- Redis is now load-bearing for both auth-refresh and event delivery — single Redis outage degrades two subsystems (mitigated by AOF persistence + cloud-target's managed Redis HA option at Stage 11)
- Cross-stream ordering is not guaranteed (consumers must tolerate)

**Trigger to revisit**
- Event volume grows past ~100 events/s sustained (Redis Streams can do more, but cluster-mode brings new ops)
- A cross-region deploy is needed (Streams aren't designed for multi-region replication)
- Regulatory requirement for an externally auditable event log (would push toward Kafka or a managed alternative)

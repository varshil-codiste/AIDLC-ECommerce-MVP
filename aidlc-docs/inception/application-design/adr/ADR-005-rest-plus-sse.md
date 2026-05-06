# ADR-005 — REST + SSE rather than GraphQL or WebSockets

**Status**: Accepted
**Date**: 2026-05-04
**Decision-makers**: Pod via Stage 6 Q3 = A

## Context

Two transport choices to lock:
1. CRUD surface — REST vs GraphQL vs gRPC
2. Real-time push for streaming chat — SSE vs WebSockets vs long-polling

Constraints:
- Small, well-known API surface (5 agents × few tools each + chat endpoints)
- Stream is one-way (server → client) for token streaming and widget rendering
- Codiste preset cross-stack default = OpenAPI 3.1
- Lean ops — fewer transports = simpler load balancing, simpler observability

## Decision

REST (OpenAPI 3.1) for everything CRUD + structured-intent endpoints. Server-Sent Events for the chat token + widget stream. No GraphQL, no WebSockets, no gRPC.

## Consequences

**Positive**
- Single OpenAPI spec is the contract; FE generates a typed client
- SSE works across HTTP/1.1 and HTTP/2 with no special infrastructure
- Easy to debug with `curl -N` and standard HTTP tooling
- Standard auth (Bearer JWT in `Authorization` header) on all calls
- One transport in OTel traces

**Negative**
- SSE is one-way; if a future feature needs server-pushed widgets *between* user turns, we'd add WebSockets (small additive change)
- No subscription-style model — clients reconnect SSE per chat turn

**Trigger to revisit**
- Need for full-duplex (e.g., real-time merchant collaboration on the same chat session)
- API surface grows beyond what REST handles cleanly (large, deeply-nested queries → GraphQL)

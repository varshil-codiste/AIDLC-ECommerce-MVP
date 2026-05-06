# ADR-003 — Keep agents in-process within the api service

**Status**: Accepted
**Date**: 2026-05-04
**Decision-makers**: Pod via Stage 6 Q5 = A

## Context

The 5 agents are LLM functions with scoped tools. Two options:
1. In-process — agents are code modules the orchestrator imports and calls directly
2. Worker process — agents run on a job queue (e.g., BullMQ); the orchestrator publishes jobs and consumes streamed responses

Constraints:
- First-token target < 1.5 s (NFR-PERF-01) — every network hop is a latency tax
- Modular-monolith decision (ADR-001)
- Pod-of-2 ops footprint

## Decision

In-process. Each agent is a NestJS service / class. Tools are typed function calls into Core API ports. Streaming SSE comes from the orchestrator and forwards token streams from the LLM provider directly.

## Consequences

**Positive**
- Lowest latency between orchestrator decision and tool call
- Simple unit testing (no queue mock needed)
- Single shared OTel context — traces look natural
- No queue depth / consumer-group ops to monitor

**Negative**
- A blocking agent call can hold an HTTP worker thread for several seconds (mitigated by Node.js's async model: LLM calls are I/O-bound, the event loop stays free)
- Long-running batch jobs (e.g., embedding rebuild) MUST run on a separate worker, not as agent calls — addressed by the dedicated `embedding-rebuild` consumer in event-topology.md

**Trigger to revisit**
- Agent invocations regularly exceed 8 s (the soft deadline) and back-pressure builds
- We need agent-level autoscaling independent of the API surface
- A second team takes ownership of an agent

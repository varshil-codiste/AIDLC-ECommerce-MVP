# Application Design — Planning Questions

**Stage**: 6 — Application Design (Part 1: Planning)
**Generated**: 2026-05-04T00:19:00Z

8 questions. Recommendations pre-stated based on PRD § 10, BR (lean budget + strict data classification + Greenfield), requirements.md (full extension matrix), and the codiste preset.

---

## Q1 — Architectural style

PRD § 10 sketches an orchestrator + 5 agents + Core API + Postgres + Redis. How should we shape that internally?

A) **Modular monolith** — single deployable backend with internal modules (orchestrator, agents, core-api, persistence, audit). Internal code boundaries enforced; one deploy. ← **AI recommends A**: lean budget rules out microservices ops cost; PRD scale (1K concurrent target / 5–10 actual) does not need horizontal split; agents share Postgres + cache and communicate cheaply in-process.
B) Microservices — orchestrator, each agent, Core API, notifications all separate services with their own deploys and inter-service communication
C) Hybrid — monolith for orchestrator + agents + Core API, separate service for notifications + telemetry
X) Other

[Answer]:A

---

## Q2 — Deployment topology

Given Q1 = A, what's the deploy shape?

A) **Three containers**: (1) `web` — Next.js frontend / chat UI, (2) `api` — backend monolith (orchestrator + agents + Core API), (3) `db` — Postgres (single-node MVP) + Redis (single-node MVP) co-located or as managed services depending on Stage 11. ← **AI recommends A**
B) Two containers: combined web + api in one container (faster locally, awkward in prod)
C) Four+ containers: split orchestrator from agents from Core API (creeps toward microservices; over-engineered for MVP)
X) Other

[Answer]:A

---

## Q3 — API surface

How does the frontend talk to the backend?

A) **REST (OpenAPI 3.1) for CRUD + SSE for chat streaming** — simple, matches codiste preset, fits behind any HTTP load balancer ← **AI recommends A**
B) GraphQL — over-engineered for the limited surface; not needed for chat streaming
C) WebSockets for everything — more complex than SSE; not needed (no full-duplex requirement)
D) gRPC — introduces JS clients pain on web; not warranted
X) Other

[Answer]:A

---

## Q4 — Vector store choice

Semantic product search needs an embedding store. Options:

A) **pgvector (Postgres extension)** — single store, no extra service to operate, sufficient for ≤ 100K products; matches lean budget. ← **AI recommends A**
B) Qdrant — self-hostable; good if we expect millions of products (out of scope)
C) Pinecone — managed; recurring cost; rules out lean budget
D) In-memory (FAISS / hnswlib) — too fragile for any persistence story
X) Other

[Answer]:A

---

## Q5 — Agent execution model

The 5 agents are LLM functions with scoped tools. How are they implemented?

A) **In-process within the API service** — each agent is a code module that the orchestrator calls; tools are direct function calls into Core API modules ← **AI recommends A**: matches modular-monolith Q1; minimal latency between orchestrator and agents; in-process retries / instrumentation easy
B) Separate worker process — agents in a queue worker reading from BullMQ; orchestrator publishes jobs and polls/streams responses
C) Function-as-a-Service — each agent is a Lambda / Cloud Function (over-complicated for MVP, stack-specific)
X) Other

[Answer]:A

---

## Q6 — Event bus

PRD § 10 lists Redis Streams for inter-agent events. Confirm or substitute?

A) **Redis Streams** — confirmed per PRD; lightweight, supports consumer groups, fits Redis-already-in-stack ← **AI recommends A**
B) Postgres LISTEN/NOTIFY — uses existing DB; no separate service; sufficient for low-volume MVP, but harder to back-pressure / replay
C) Both — LISTEN/NOTIFY for in-request notifications, Redis Streams for cross-agent
X) Other

[Answer]:A

---

## Q7 — Repository layout

Where does the code live?

A) **Monorepo** — single Git repo with `web/`, `api/`, `shared/` (shared TS types from OpenAPI), `infra/`, `docs/`. Single CI pipeline that detects changed paths. ← **AI recommends A**: easy contract sharing FE↔BE; one PR for cross-stack changes; matches codiste preset's `scripts/ci.sh` per stack pattern
B) Split repos — separate `web` and `api` repos, contracts published to a registry
C) Three repos — web, api, shared-contracts
X) Other

[Answer]:A

---

## Q8 — Cross-stack error envelope

Standard error response format across REST + agent tools:

A) **RFC 7807 `application/problem+json`** — type, title, status, detail, instance, plus extensions for `request_id`, `trace_id`, `error_code` ← **AI recommends A**: industry standard, easy to instrument in OTel, agents can return same shape
B) Custom JSON envelope (`{ok, error: {code, message}}`)
C) Mirror the chat orchestrator's widget shape (errors as widget renders)
X) Other

[Answer]:A

---

## Once filled

Reply "done". I'll generate Part 2:
1. `application-design.md` — top-level synthesis with Mermaid system diagram
2. `components.md` — FE + BE component catalog
3. `data-model.md` — full Postgres schema (12 entities from PRD § 11 + auth + audit_log + agent_events)
4. `agent-contracts.md` — per-agent tools + structured intent schema
5. `event-topology.md` — Redis Streams topic list + consumer groups
6. `adr/` — Architecture Decision Records for the major calls (modular monolith, pgvector, in-process agents)

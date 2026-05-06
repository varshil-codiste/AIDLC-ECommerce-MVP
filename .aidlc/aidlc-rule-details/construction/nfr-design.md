# NFR Design

**Stage**: 10 (conditional, per-UoW)
**Purpose**: Map each NFR Requirement to a concrete pattern + logical component (cache, queue, circuit breaker, monitor, etc.). Output: `nfr-design-patterns.md` + `logical-components.md`.

---

## When to Execute

Execute IF NFR Requirements (Stage 9) ran for this unit.
Skip IF NFR Requirements was skipped.

---

## Two-Part Pattern

Plan → Generate.

Part 1: generate `{unit}-nfr-design-plan.md` + question file. Categories:
- **Resilience** patterns — retries, circuit breakers, bulkheads, timeouts
- **Scalability** patterns — caching layers, async processing, sharding, read replicas
- **Performance** patterns — connection pooling, batching, payload compression, edge caching
- **Security** patterns — input validation layer, authn middleware, authz policy engine, secret manager, audit log
- **Logical components** — queues, caches, schedulers, search indices, vector stores (AI/ML)

Wait for answers. Validate.

Part 2: produce artifacts under `aidlc-docs/construction/{unit}/nfr-design/`.

### `{unit}-nfr-design-patterns.md`

```markdown
# NFR Design Patterns — <unit>

## Resilience

### Pattern P-RES-001: Retry with exponential backoff
**Applies to**: NFR-REL-001 (idempotent external API calls)
**Implementation**:
- Library: <chosen — e.g., `axios-retry` (Node), `tenacity` (Python), built-in retry middleware (Go)>
- Backoff: 100ms × 2^n, max 5 attempts, max 5s total
- Idempotency key: header `Idempotency-Key: <uuid>`

### Pattern P-RES-002: Circuit breaker on external calls
**Applies to**: NFR-AVAIL-001
**Implementation**:
- Library: <opossum (Node) / pybreaker (Python) / sony/gobreaker (Go)>
- Threshold: open after 50% errors over 1-min sliding window
- Half-open probe: 1 request after 30s

## Scalability
…

## Performance
…

## Security
…
```

### `{unit}-logical-components.md`

```markdown
# Logical Components — <unit>

## Component LC-001: Cache
**Purpose**: Reduce repeated DB reads on hot keys (per NFR-PERF-001)
**Type**: in-memory + distributed
**Tech (decided in Stack Selection)**: Redis | Memcached | LRU-in-process | Other
**Eviction**: LRU, TTL = 60s
**Invalidation**: write-through on entity update

## Component LC-002: Job Queue (only if applicable)
**Purpose**: Async email send, async LLM eval runs (per NFR-PERF-002)
**Type**: durable
**Tech (decided in Stack Selection)**: BullMQ | Celery | Asynq | NATS JetStream | SQS | Other
**Retry**: 5x with backoff
**DLQ**: yes, with alert

## Component LC-003: Vector Store (only if AI/ML extension on with RAG)
**Purpose**: RAG retrieval index per NFR-MLQ-001
**Tech**: pgvector | Pinecone | Weaviate | Qdrant | Other (decided in Stack Selection)
**Index strategy**: HNSW with M=16, ef=64
**Refresh policy**: <e.g., daily incremental + weekly full>

…
```

---

### Step 3: Stage Checklist

- [ ] Every NFR has at least one pattern OR an explicit N/A reason
- [ ] Every pattern names a library / approach (does NOT pick the framework — that's Stack Selection)
- [ ] Every logical component has a purpose, type, and tech-decision deferred-to-Stage-11 marker
- [ ] If AI/ML extension on, the vector store + prompt registry components are listed

### Step 4: Completion Message

```markdown
# NFR Design — <unit> — Complete ✅

- **Patterns**: <n>
- **Logical components**: <n>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to Stack Selection (Stage 11)
```

---

## Anti-patterns

- ❌ Picking specific frameworks here (NestJS / FastAPI / Gin / etc.) — those choices belong to Stage 11
- ❌ NFR with no mapped pattern AND no N/A reason
- ❌ Generic patterns ("we'll handle errors") — patterns must be specific enough to implement

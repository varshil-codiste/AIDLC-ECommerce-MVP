# Stack Selection — UoW-11 (Semantic Search + Tracking + Returns)

**Stage**: 11 — Stack Selection
**Tier**: Greenfield (Comprehensive)
**Profile**: codiste preset (locked at Stage 11/UoW-01)
**Generated at**: 2026-05-05T22:10:00Z
**Mode**: **Brownfield inheritance — zero new packages**

---

## Confirmation Pass

UoW-11 is the most LLM/RAG-heavy UoW (per execution-plan.md). All required runtime dependencies are already present from prior UoWs.

### Inherited (no change)

| Layer | Choice | Source |
|-------|--------|--------|
| API framework | NestJS 10 | UoW-01 |
| ORM | Prisma 6 (multiSchema, postgresqlExtensions) | UoW-01/03 |
| Postgres | 16 + extensions: `vector`, `citext` | UoW-03 (already enabled in `schema.prisma`) |
| Redis | ioredis 5.x | UoW-01 |
| Scheduler | `@nestjs/schedule` ^6.1.3 (`@Interval`) | UoW-03 (used by OutboxDrainWorker, OrderEventListener, LowStockWatcher) |
| LLM SDK | `openai` ^6.36.0 | UoW-04/06 |
| OTel | `@opentelemetry/*` | UoW-04 |
| Test runner | Vitest 2.x | UoW-01 |
| PBT | `fast-check` 3.x | UoW-07 (already in web/devDependencies; api uses it for PBT specs already) |
| Web framework | Next.js 15 + React 19 | UoW-01/05 |
| Schema validation | AJV 8 + ajv-formats | UoW-05 |
| Vector index | pgvector (extension) | UoW-03 (extension enabled, never used until now) |
| Full-text search | Postgres `tsvector` + GIN | UoW-03 (column exists, never used until now) |

---

## Block A — Per-stack picks

### Block A.1 — Embedding model

**Choice**: OpenAI `text-embedding-3-small`
**Justification**:
- 1536 dimensions — exactly matches existing `ProductSearchIndex.embedding vector(1536)` schema
- $0.02 per 1M tokens (5× cheaper than legacy ada-002)
- MTEB ~62 — better than ada (~61); good enough for product search at MVP scale
- Decision locked in Stage 8 Q1

**Configuration**:
```typescript
const result = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
});
// result.data[0].embedding => number[] of length 1536
```

### Block A.2 — Vector index

**Choice**: `ivfflat` with `lists = 100` and `vector_cosine_ops`
**Justification**:
- Suitable for ≤ 10k vectors at MVP (NFR-11-SCAL-01)
- Build cost low (`lists=100` is the rule-of-thumb for `~rows/100`)
- HNSW would deliver better recall but at 5–10× memory cost — over-engineering for MVP
- Decision locked in Stage 8 Q3

**SQL (in `enable_product_search_indexes` migration)**:
```sql
CREATE INDEX IF NOT EXISTS product_search_index_embedding_ivfflat
  ON app.product_search_index USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**When to revisit**: when active product count exceeds 8,000, run a maintenance reindex with `lists = 200` (`~rows/100` rule).

### Block A.3 — Embed-call timeout strategy

**Choice**: AbortController with hardcoded ceilings:
- Sync (search path): **800 ms** — bounds query p95 deterministically
- Async (refresh worker): **5,000 ms** — tolerates transient slowness; outer retry loop covers persistent failure

**Justification**: NFR-11-PERF-03 requires `<400 ms p95` server-side; OpenAI typical embed latency is 80-200ms; 800ms ceiling is 4× headroom. Worker is async so longer ceiling is fine.

### Block A.4 — Embedding refresh transport

**Choice**: Reuse existing AgentEvent outbox + Redis stream (`events:product`)
**Justification**: Same plumbing as OrderEventListener / OutboxDrainWorker. Zero new infrastructure. Pattern P-11-01 enforced.

### Block A.5 — Migration approach

**Choice**: Two separate Prisma migrations
1. `add_order_return_fields` — `ALTER TABLE` (reversible)
2. `enable_product_search_indexes` — idempotent `CREATE INDEX IF NOT EXISTS`
**Justification**: P-11-08 — independent rollback safety; ops can pre-build indexes during a maintenance window.

### Block A.6 — Comparison widget — schema-first vs component-first

**Choice**: Schema-first (define `product_comparison.schema.json` before writing the React component)
**Justification**: Matches the team convention used in UoW-05/07/08; AJV validation enforced at WidgetRenderer entry point; PBT round-trip test (NFR-11-PBT-01) needs the schema.

---

## Block B — Cross-cutting confirmations

### Block B.1 — No new BE packages

| Capability | Existing package |
|-----------|------------------|
| Embeddings | `openai` (already in deps) |
| Vector kNN | Native pgvector via Prisma `$executeRaw` |
| Background scheduling | `@nestjs/schedule` |
| Stream consumer | ioredis `xread` (wrapper added in UoW-09 — `RedisService.xreadMessages`) |
| Outbox events | Existing `AgentEvent` table + `OutboxDrainWorker` (UoW-03) |

### Block B.2 — No new FE packages

| Capability | Existing package |
|-----------|------------------|
| Schema validation | `ajv` + `ajv-formats` |
| PBT | `fast-check` |
| Test rendering | `@testing-library/react` |
| Class merging | `clsx` + `tailwind-merge` |

### Block B.3 — Environment variables

**No new env vars required**. `OPENAI_API_KEY` already exists from UoW-04.

### Block B.4 — Configuration files

**No changes**: `prisma/schema.prisma` already has `extensions = [vector, citext]`.

---

## Block C — Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| OpenAI embed cost spike if a merchant batch-uploads 10,000 products | Per-Product cost is ~$0.0000004 at typical text-blob length (~250 tokens) → 10k products ≈ $0.004. Negligible. |
| `ivfflat` recall degradation as data grows | Operational alert when `pg_stat_all_indexes.idx_scan / idx_tup_read` ratio worsens; reindex with higher `lists` (NFR-11-SCAL-02) |
| OpenAI outage breaks search | P-11-02 keyword fallback covers; degraded experience but no 5xx |
| pgvector extension absent in dev/test environments | Migration uses `IF NOT EXISTS`; EmbeddingRefreshWorker tolerates extension absence (just fails the kNN call → fallback path) |
| Long return reasons could break order_card UI | FE truncates at 200 chars in display; DB column is `TEXT` (no DB cap); BR-11-14 enforces ≥5 char floor |

---

## Verdict

**Brownfield-zero-package confirmed.** All choices inherited from prior UoWs or the codiste preset. No new dependencies, no new env vars, no new external services.

**Stage 12 Code Generation can proceed without further procurement or approval steps.**

---

## NFR-to-Stack Trace

| NFR | Stack choice |
|-----|-------------|
| NFR-11-PERF-01..04 | text-embedding-3-small + ivfflat + 800ms timeout (Blocks A.1, A.2, A.3) |
| NFR-11-RELI-01 | semantic-first + keyword fallback via tsvector (Block B reuse) |
| NFR-11-MAINT-06 | Two-migration split (Block A.5) |
| NFR-11-PBT-01..06 | fast-check (Block B.2) — already present |
| NFR-11-AIML-01 | Versioned prompt files in repo (no stack pick — pure file convention) |

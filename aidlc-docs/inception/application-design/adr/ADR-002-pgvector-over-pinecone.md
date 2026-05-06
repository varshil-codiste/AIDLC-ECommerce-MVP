# ADR-002 — Use pgvector instead of a managed vector DB

**Status**: Accepted
**Date**: 2026-05-04
**Decision-makers**: Pod via Stage 6 Q4 = A

## Context

Semantic product search requires an embedding store. Three realistic options for MVP:
1. pgvector (Postgres extension)
2. Pinecone (managed)
3. Qdrant (self-hosted)

Constraints:
- Lean budget (BR § 2.3) — Pinecone's pricing alone could consume 30–50% of the 6-month runtime budget
- Catalog size for MVP < 10K products (single internal-demo store)
- One DB to operate is cheaper than two

## Decision

pgvector. Single Postgres instance hosts both the OLTP tables and the embedding column on `product_search_index`. ivfflat index for ANN search; tsvector + GIN for keyword fallback (ERR-03).

## Consequences

**Positive**
- Zero additional infrastructure cost / ops surface
- Joins between embeddings and product attributes are first-class SQL
- Postgres backup covers the embeddings at no extra effort

**Negative**
- pgvector ANN performance degrades past ~100K embeddings; we will need to revisit at scale
- Embedding rebuild is bounded by Postgres write throughput

**Trigger to revisit**
- Catalog crosses ~50K products
- ANN p95 latency exceeds 200 ms
- Vector dimensionality changes (e.g., switch to a 3072-dim model) and pgvector tuning becomes painful

# UoW-11 Functional Design — Questions

**Tier**: Greenfield Comprehensive
**Asked**: 2026-05-05T21:30:00Z
**Format**: Multiple choice. Reply with `[Answer]: <letter>` for each. `X` = "Other / I'll explain".

---

## Q1 — Embedding model

Schema declares `vector(1536)`, which matches OpenAI `text-embedding-3-small` and the legacy `text-embedding-ada-002`. Which to use?

- A. **OpenAI `text-embedding-3-small`** (recommended — newest, cheapest at $0.02/1M tokens, 1536 dims, MTEB ~62 vs ada's ~61)
- B. OpenAI `text-embedding-ada-002` (legacy, $0.10/1M tokens — 5× more expensive)
- C. OpenAI `text-embedding-3-large` (3072 dims — would require schema change to `vector(3072)` + reindex)
- X. Other

`[Answer]:` A

(Default: A unless you say otherwise — picked because it matches the existing schema and is the cheapest current OpenAI option.)

---

## Q2 — Embedding refresh trigger

When should a Product's embedding be (re)generated?

- A. **On Product create/update only** — outbox event → background worker re-embeds (recommended; matches outbox pattern from UoW-03)
- B. On Product create/update PLUS daily full refresh batch (defensive against drift)
- C. Synchronously inside the create/update transaction (simplest, but blocks the merchant-facing API path on OpenAI latency)
- X. Other

`[Answer]:` A

(Default: A — outbox-driven async embeds match the outbox pattern already used elsewhere; no merchant-facing latency hit.)

---

## Q3 — Vector index type

For ~hundreds-to-thousands of products at MVP scale, which pgvector index?

- A. **`ivfflat`** (recommended — simpler, fast for ≤100k vectors, requires periodic REINDEX as data grows)
- B. `hnsw` (better recall but heavier memory/build cost; over-engineering for MVP scale)
- C. No index (sequential scan) — only OK while product count is < 1000
- X. Other

`[Answer]:` A

(Default: A — chosen as Greenfield-MVP-appropriate. Stack Selection / NFR Design will confirm.)

---

## Q4 — When to fall back to keyword search

The semantic search has a keyword (tsvector) fallback. When should keyword fire?

- A. **Only when semantic fails** (vector store unreachable / OpenAI error) — agent surfaces "I couldn't do semantic search" message per SH-02 AC
- B. Always run BOTH and merge results (more recall, more compute, more complexity)
- C. Run keyword only for queries that look like SKUs (regex match on `[A-Z0-9-]{4,}`); otherwise semantic-only
- X. Other

`[Answer]:` A

(Default: A — matches the SH-02 acceptance criterion verbatim.)

---

## Q5 — Returns flow status model

For SH-10, how to model the return state?

- A. **Add `return_requested` to Order.status enum** + new `returnReason` and `returnRequestedAt` columns (recommended — single source of truth, matches existing status pattern)
- B. New `Return` entity (one-to-one with Order) — clean separation but introduces a new table and join
- C. Just add a `returnReason` column; signal via a boolean `returnRequested`
- X. Other

`[Answer]:` A

(Default: A. The plan note in execution-plan.md explicitly says "renders a confirmation `order_card` reflecting the return state" — implies status-as-state.)

---

## Q6 — Comparison widget — new vs. extension

For SH-03, render comparison as:

- A. **New `product_comparison` widget** (recommended — clean schema, comparison-specific UI)
- B. Reuse `product_carousel` with `mode: 'compare'` flag — saves a schema/component but conflates two UX intents
- X. Other

`[Answer]:` A

(Default: A.)

---

## Q7 — Tracking events source

For SH-09, the `tracking_widget.events[]` timeline is sourced from:

- A. **Synthesized from Order lifecycle timestamps + status changes** (placed → confirmed → shipped → delivered) — no carrier API needed; works offline
- B. Live carrier API (BlueDart/etc.) integration — out of scope per BR (no live carrier integration in MVP)
- C. A new `OrderEvent` entity that records every status change with timestamp — defer until we have audit-grade requirements
- X. Other

`[Answer]:` A

(Default: A. Live carrier integration is out-of-scope per the BR; B and C are over-engineering for MVP.)

---

## Q8 — Product Agent split

The ProductAgent currently handles merchant-mode (UoW-07). Where do shopper tools live?

- A. **Same ProductAgent** with role-gated tools (recommended — matches OrderAgent pattern from UoW-08; one prompt branches on role)
- B. New `ProductShopperAgent` — clean separation but doubles prompts/evals
- X. Other

`[Answer]:` A

(Default: A — matches the existing pattern and avoids prompt sprawl.)

---

## Quick-accept

If all eight defaults look right, reply **"accept defaults"** (or **"continue"**) and I'll move straight to writing the four functional-design artifacts (`domain-entities.md`, `business-rules.md`, `business-logic-model.md`, `frontend-components.md`).

If you want to change any answer, just list the ones you want to flip:

```
Q3: B
Q5: B
```

…and I'll regenerate.

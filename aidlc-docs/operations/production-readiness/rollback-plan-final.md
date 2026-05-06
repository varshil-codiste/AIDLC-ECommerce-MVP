# Rollback Plan — Final Milestone (All 12 UoWs)

**Project**: AIDLC ECommerce MVP
**Updated at**: 2026-05-06T13:15:00Z
**Supersedes**: `rollback-plan.md` (M1 — UoW-01+02 only)

---

## When to Roll Back

- Error rate > 5× baseline for 10+ minutes
- p95 API latency > 3× NFR target (> 750 ms) for 10+ minutes
- Severity-1 functional bug (e.g., orders created with wrong user, cart data corrupted)
- Data integrity issue detected (duplicate orders, missing cart items)
- LLM cost runaway (> 10× expected spend in a 1-hour window)
- Tech Lead judgment call

---

## Rollback Mechanics by Layer

### Application containers (api + web)

```bash
# 1. Identify previous-good image tag from git log or Docker Hub
git log --oneline -5   # find the prior good commit SHA

# 2. Edit docker-compose.prod.yml — change image tags to prior SHA
# api image: ghcr.io/varshil-codiste/aidlc-ecommerce-api:<prior-sha>
# web image: ghcr.io/varshil-codiste/aidlc-ecommerce-web:<prior-sha>

# 3. Restart
docker compose -f docker-compose.prod.yml up -d api web

# 4. Verify health
curl https://<domain>/api/v1/health
```

### Database migrations

All 12 UoWs use **additive-only** migrations (new tables, new columns, new indexes). No destructive column drops were performed.

| UoW | Migration | Reversible? |
|-----|-----------|-------------|
| UoW-01 | Initial schema (users, products, variants, orders, etc.) | Restore from backup |
| UoW-02 | Add `last_active_at`, UNIQUE on email | Drop column (safe) |
| UoW-03 | Add outbox_events, audit_log, idempotency_keys tables | Drop tables (safe if no data) |
| UoW-11 | Add `embedding vector(1536)` to Product; ivfflat index | Drop column + index (safe) |

To revert a migration:

```bash
# Additive reversal (safe — no data loss if column is empty or new):
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "ALTER TABLE products DROP COLUMN IF EXISTS embedding;"
# Then re-deploy the prior app version that doesn't reference the column
```

For destructive rollback (full DB restore):

```bash
# 1. Stop writes
docker compose stop api

# 2. Restore from backup (pg_dump file):
docker compose exec postgres pg_restore \
  -U $POSTGRES_USER -d $POSTGRES_DB --clean /backups/<timestamp>.dump

# 3. Restart api at prior version
docker compose up -d api
```

### Prompt rollback (LLM agents)

Prompts are versioned via `PromptLoaderService`. To roll back to a prior prompt version:

1. Change the version constant in `api/src/orchestrator/prompts/prompt-loader.service.ts`
2. Redeploy the api container

### Vector index rollback (UoW-11 pgvector)

If the ivfflat index causes performance issues:

```bash
# Drop the index (search falls back to sequential scan / keyword fallback)
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "DROP INDEX IF EXISTS product_embedding_idx;"
# Recreate when ready:
# -c "CREATE INDEX product_embedding_idx ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);"
```

---

## Communication Plan

| Audience | Channel | Timing |
|----------|---------|--------|
| Pilot users | Email | Within 15 min of incident detection |
| On-call engineer | Phone / Slack DM | Immediately on alert |
| Tech Lead | Slack / Phone | If L1 cannot resolve in 30 min |
| Status update | Grafana annotation | Once per 30 min during incident |
| Post-mortem | Written doc (aidlc-docs/operations/) | Within 5 business days; blameless; action items tracked |

---

## Rehearsal

- Rollback rehearsal for M1 (UoW-01+02): deferred (accepted, no staging env)
- Rollback rehearsal for Final milestone: **[ ] NEEDS ACTION** — perform a dry-run on a staging/local environment before go-live. Specifically: spin up the prod compose stack locally and rehearse a container image rollback + a migration revert.
- Estimated rehearsal duration: ~30 minutes

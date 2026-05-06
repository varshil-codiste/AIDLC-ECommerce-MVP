# Runbook — Final Milestone (All 12 UoWs)

**Project**: AIDLC ECommerce MVP
**Updated at**: 2026-05-06T13:15:00Z
**Supersedes**: `runbook.md` (M1 — UoW-01+02 only)

---

## Service Topology

```
Internet
  └─ Caddy (reverse proxy, TLS)
       ├─ /* → web:3000  (Next.js 15)
       └─ /api/* → api:3001 (NestJS 11)
                        │
              ┌──────────┼──────────────────────┐
              │          │                      │
         PostgreSQL    Redis               OTel Collector
         (pgvector)   sessions/              :4317 → Prometheus
         :5432         rate-limit            :8888 → Grafana
                                                 └─ Loki (logs)
```

**Key services** (docker-compose.prod.yml):

| Service | Port | Purpose |
|---------|------|---------|
| `caddy` | 80/443 | TLS termination + reverse proxy |
| `api` | 3001 (internal) | NestJS orchestrator + REST API |
| `web` | 3000 (internal) | Next.js chat UI |
| `postgres` | 5432 (internal) | PostgreSQL 16 + pgvector |
| `redis` | 6379 (internal) | Session store + rate limiter |

**Observability services** (docker-compose.observability.yml):

| Service | Port | Purpose |
|---------|------|---------|
| `otel-collector` | 4317 (internal) | Receives OTel traces/metrics from API |
| `prometheus` | 9090 (internal) | Scrapes API + OTel metrics |
| `loki` | 3100 (internal) | Receives pino JSON logs |
| `grafana` | 3200 → 3200 | Dashboards + alerts |

---

## Deployments

### How to deploy (standard release)

```bash
# On VPS:
cd /opt/aidlc-ecommerce
git pull origin main
docker compose -f docker-compose.prod.yml pull   # pull new images
docker compose -f docker-compose.prod.yml up -d  # rolling restart
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### How to roll back

See `rollback-plan-final.md`. Quick command:

```bash
# Roll back to previous image tag (e.g. sha-abc123)
docker compose -f docker-compose.prod.yml stop api web
# Edit docker-compose.prod.yml image tags to previous SHA
docker compose -f docker-compose.prod.yml up -d api web
```

### Maintenance window policy

- Prefer off-peak (weekday 02:00–04:00 IST)
- Avoid Friday 5pm IST or later
- Notify pilot users via email ≥ 1 hour in advance for > 10-min outages

---

## Health Checks

| Service | Endpoint | Expected |
|---------|----------|----------|
| API | `GET /api/v1/health` | `200 { status: "ok" }` |
| Web | `GET /` | `200` HTML |
| Caddy | `GET https://<domain>/api/v1/health` | `200` via TLS |

---

## Common Operations

### Restart a service

```bash
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml restart web
```

### View live logs

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
```

### Run database migration

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Rotate secrets

1. Update `.env.prod` on VPS with new secret value
2. `docker compose -f docker-compose.prod.yml up -d --force-recreate api` (picks up new env)
3. For `JWT_SECRET` rotation: all active sessions are invalidated — users must log in again. Notify pilot users.

### Scale pgvector index (if adding > 50k products)

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SET ivfflat.probes = 10; REINDEX INDEX product_embedding_idx;"
```

---

## Common Incidents

### High API error rate (5xx spike)

1. Check Grafana → API Error Rate panel
2. Check Sentry for top errors: filter last 15 minutes
3. Check API logs: `docker compose logs -f api | grep '"level":50'` (pino level 50 = error)
4. Common causes:
   - **DB connection exhausted** → check `pg_stat_activity`; restart api container
   - **Redis down** → check `docker compose ps redis`; restart redis
   - **LLM provider outage** → check https://status.openai.com; inform users via chat banner
   - **Bad deploy** → roll back (see rollback-plan-final.md)

### LLM provider outage (OpenAI down)

1. Check https://status.openai.com
2. Agents will surface error messages to users in chat (fail-closed design)
3. No automatic fallback provider configured (pilot scope)
4. Optionally: set `LLM_MODEL=gpt-4o-mini` in `.env.prod` + restart api for lower-cost fallback
5. Update Grafana status panel manually if outage > 30 min

### pgvector semantic search returning poor results

1. Check `llm_cost_usd_total` metric — if embedding model calls are failing, search falls back to keyword
2. Check that `EMBEDDING_MODEL=text-embedding-3-small` is set in `.env.prod`
3. If embedding index is corrupt: `REINDEX INDEX product_embedding_idx;` (locks table briefly)
4. Fallback: SearchAgent automatically falls back to PostgreSQL ILIKE keyword search when vector score < 0.3

### High LLM cost alert firing

1. Check Grafana → LLM Cost panel (daily / weekly totals)
2. Check `LlmCostRecord` table: `SELECT agent_name, SUM(cost_usd) FROM llm_cost_records GROUP BY agent_name ORDER BY 2 DESC LIMIT 10;`
3. Common cause: ProductAgent merchant bulk-create loop (many tool calls)
4. Mitigation: rate-limit aggressive merchant sessions at Redis level (existing login rate limiter; extend to SSE sessions if needed)

### Cart / checkout stuck (order not created)

1. Check Sentry for `checkout.stock_conflict` or `checkout.empty_cart` errors
2. Check API logs for `cart.stock_conflict` events
3. If stuck open cart: `UPDATE carts SET status='abandoned' WHERE user_id='...' AND status='open';`

### Notification outbox processor lagging

1. Check `outbox_events` table: `SELECT COUNT(*) FROM outbox_events WHERE processed_at IS NULL;`
2. If large backlog: restart api container (outbox processor restarts with it)
3. Check for poison messages: events failing repeatedly will have `error_count > 3`; inspect and manually resolve

---

## Escalation

| Level | Contact | When |
|-------|---------|------|
| L1 | On-call engineer (Varshil) | Any alert firing |
| L2 | Tech Lead (Chintan Bhai) | L1 cannot resolve in 30 min; data integrity concern |
| L3 | Engineering leadership | Severity-1 (complete outage > 1 hr; data loss) |

---

## Useful Links (fill in after VPS provisioning)

- Grafana: `https://<domain>:3200`
- Sentry project: `https://sentry.io/organizations/<org>/projects/<project>/`
- GitHub repo: `https://github.com/varshil-codiste/AIDLC-ECommerce-MVP`
- Production domain: `https://<domain>`

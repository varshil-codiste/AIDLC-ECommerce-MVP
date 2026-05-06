# Rollback Plan — ECommmer-AIDLC M1

**Last updated**: 2026-05-05
**Authority**: Tech Lead (Chintan Bhai) — final call on rollback decision

---

## When to Roll Back

- Error rate > 5× baseline for 10+ minutes
- p95 login latency > 3s (5× NFR target) for 10+ minutes
- Auth tokens not being issued / accepted (login broken for >5 min)
- Security incident discovered (token theft, credential exposure)
- Data corruption detected in `app.users`
- Tech Lead judgment call — no threshold required

---

## Application Code Rollback

**Time to complete**: 3–5 minutes

1. Identify the previous-good image tag in GHCR (e.g., `v1.0.0`):
   ```bash
   # GitHub → Packages → api → versions
   ```

2. SSH to VPS and redeploy with prior tag:
   ```bash
   ssh <VPS_USER>@<VPS_HOST>
   cd /opt/ecommmer
   IMAGE_TAG=v1.0.0 docker compose -f docker-compose.prod.yml up -d api web
   docker compose -f docker-compose.prod.yml logs -f api
   ```

3. Verify health check: `curl https://<domain>/api/v1/health`

4. Smoke test: confirm login flow works end-to-end

5. Log the rollback in `audit.md` with timestamp and reason

---

## Database Migration Rollback

**UoW-02 migration** (`20260504000000_UoW-02-001-create-users-table`):
- Creates: `app.users` table
- Rollback SQL: `DROP TABLE app.users CASCADE;`
- **Risk**: Dropping the table deletes all user records. Only execute if:
  - The migration itself was the cause of the incident AND
  - No users have been created yet (or they can be recreated from seed)
- **Procedure**:
  ```bash
  docker compose -f docker-compose.prod.yml exec postgres \
    psql -U $POSTGRES_USER -d $POSTGRES_DB \
    -c "DROP TABLE app.users CASCADE;"
  ```
  Then revert application code to a pre-UoW-02 image tag.

---

## Database Restore (last resort)

**Use when**: data corruption is detected and cannot be resolved by application rollback.

1. Stop writes: stop API container → `docker compose stop api`
2. Dump current (corrupted) state for forensics:
   ```bash
   docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > corrupted_$(date +%Y%m%d_%H%M%S).sql
   ```
3. Restore from last good backup:
   ```bash
   docker compose exec -T postgres \
     psql -U $POSTGRES_USER $POSTGRES_DB < backup_<timestamp>.sql
   ```
4. Restart API: `docker compose -f docker-compose.prod.yml start api`
5. Verify data integrity: `docker compose exec postgres psql -U $POSTGRES_USER -c "SELECT count(*) FROM app.users;"`
6. Re-enable traffic; monitor for 15 minutes

---

## Rollback Rehearsal Record

| Date | Environment | Scenario | Duration | Outcome |
|------|-------------|----------|----------|---------|
| *(not yet rehearsed — complete before go-live)* | | | | |

---

## Communication Plan

| Who | When | Channel | Message |
|-----|------|---------|---------|
| Pod members | On rollback decision | Direct message | "Rolling back to `v1.0.0` — [reason]. ETA 5 min." |
| Pilot users | If outage > 15 min | Email | "Briefly unavailable — back soon." |
| Post-mortem | Within 5 business days | Shared doc | Blameless writeup + action items |

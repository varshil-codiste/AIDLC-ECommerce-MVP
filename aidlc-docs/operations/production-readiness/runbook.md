# Runbook — ECommmer-AIDLC M1

**Last updated**: 2026-05-05
**On-call**: Chintan Bhai (Tech Lead) · Varshil (Dev) — see `pod.md`

---

## Service Topology

```
Internet
   │
   ▼
[Caddy :80/:443]  ← TLS termination + HSTS
   ├── /api/*  ──► [NestJS API :3001]
   │                  ├── PostgreSQL :5432 (app schema)
   │                  └── Redis :6379 (auth tokens, rate limits)
   └── /*      ──► [Next.js Web :3000]
                      └── BFF route /api/auth/set-cookie
                          (sets HttpOnly rt_session cookie)

[OTel Collector :4317/:4318]
   ├── → Loki   (logs)
   ├── → Prometheus (metrics)
   └── → Tempo  (traces)

[Grafana :3100] ← dashboards + alerts (email)
[Sentry]        ← error tracking (sentry.io hosted)
```

All services run on a single VPS in `/opt/ecommmer/` via `docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml`.

---

## Health Checks

| Service | URL | Expected |
|---------|-----|----------|
| API | `https://<domain>/api/v1/health` | `200 OK` |
| Web | `https://<domain>/` | `200 OK` (login redirect) |
| Grafana | `http://<vps-ip>:3100` | Login page |

---

## Deployments

**Standard deploy** (every tagged release):
1. Create and push a git tag: `git tag v1.x.x && git push --tags`
2. GitHub Actions `release.yml` builds + pushes images to GHCR
3. Deploy job SSHes to VPS and runs:
   ```bash
   cd /opt/ecommmer
   export IMAGE_TAG=v1.x.x
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   docker image prune -f
   ```
4. Watch logs: `docker compose -f docker-compose.prod.yml logs -f api web`

**Manual emergency deploy**:
```bash
ssh <VPS_USER>@<VPS_HOST>
cd /opt/ecommmer
IMAGE_TAG=<tag> docker compose -f docker-compose.prod.yml up -d api web
```

---

## Common Operations

### View live logs
```bash
# API logs
docker compose -f docker-compose.prod.yml logs -f api

# All services
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### Restart a service
```bash
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml restart web
```

### Run database migrations
```bash
docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy
```

### Rotate JWT keys
```bash
# On a dev machine:
bash scripts/generate-jwt-keys.sh
# Copy new JWT_PRIVATE_KEY_B64 + JWT_PUBLIC_KEY_B64 into /opt/ecommmer/.env.prod
# Rolling restart (active JWTs expire within 15 min naturally):
docker compose -f docker-compose.prod.yml restart api
```

### Open a DB shell
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U $POSTGRES_USER -d $POSTGRES_DB
```

### Manual DB backup
```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Common Incidents

### ALT-01: API down (5xx or no response)

1. Check container status: `docker compose -f docker-compose.prod.yml ps`
2. View last 100 API log lines: `docker compose -f docker-compose.prod.yml logs --tail=100 api`
3. Common causes:
   - **OOM kill**: increase VPS RAM or reduce argon2id memory setting
   - **Postgres connection refused**: `docker compose -f docker-compose.prod.yml restart postgres`
   - **Redis connection refused**: `docker compose -f docker-compose.prod.yml restart redis`
   - **Bad deploy**: roll back (see rollback-plan.md §Application code)
4. Quick mitigation: `docker compose -f docker-compose.prod.yml restart api`

### ALT-04: Redis unavailable

1. Check Redis container: `docker compose -f docker-compose.prod.yml ps redis`
2. Restart: `docker compose -f docker-compose.prod.yml restart redis`
3. Auth rate-limit keys will be lost on restart — lockouts clear. Acceptable: users can log in again; new rate-limit window starts.
4. Active refresh tokens in Redis: if Redis data is lost (no AOF restore), all sessions are invalidated. Users will need to log in again. Inform users if outage > 5 min.

### ALT-02: High 5xx rate

1. Grafana → Auth dashboard → check error events
2. Sentry → Issues → filter by `service:api`
3. If Prisma errors: check DB connection pool; `docker compose exec postgres pg_isready`
4. If OOM: `docker stats` → if API container is at memory limit, restart and investigate

### Auth token reuse detected (security event)

1. Loki → filter `{event="auth.refresh.reuse_detected"}`
2. Capture `userId` from the log
3. All tokens for that userId are already revoked automatically (all-family revocation in auth.service.ts)
4. Contact the affected user to confirm they're aware and re-login
5. If multiple users affected: investigate potential session-hijacking; escalate to Tech Lead

---

## Escalation

| Level | Who | When |
|-------|-----|------|
| L1 | On-call (Varshil or Chintan Bhai) | Any alert |
| L2 | Tech Lead (Chintan Bhai) | Severity-1 (data loss, security incident, sustained outage > 30 min) |

---

## Useful Links

*(Fill in after VPS provisioning)*
- Grafana: `http://<vps-ip>:3100`
- Sentry project: `https://sentry.io/<org>/ecommmer-api/` and `.../ecommmer-web/`
- GitHub Actions: `https://github.com/<org>/<repo>/actions`
- GHCR images: `https://github.com/<org>/<repo>/pkgs/container/api`

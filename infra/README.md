# Infra (local-dev only)

The `docker-compose.yml` here is **strictly for local development**. Cloud topology lands at Stage 16 (Infrastructure-as-Code) — likely Terraform modules under `infra/terraform/` once the cloud target is picked.

## Services

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| postgres | `pgvector/pgvector:pg15` | 5432 | Has `vector`, `pgcrypto`, `citext` extensions pre-installed via `init.sql` |
| redis | `redis:7-alpine` | 6379 | AOF persistence on, RDB snapshots off |

Volumes are named so re-creating containers does not lose data. To wipe local state:

```bash
docker compose -f infra/docker-compose.yml down -v
```

## Apple Silicon

`pgvector/pgvector:pg15` ships arm64 since 2024. If `docker compose pull` is slow, that's registry latency — not a platform problem.

## Connecting from `api/`

Default `.env` values point at `localhost:5432` / `localhost:6379`. Override `DATABASE_URL` and `REDIS_URL` in `api/.env` when targeting a non-default host.

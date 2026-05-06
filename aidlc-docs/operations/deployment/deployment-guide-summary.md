# Deployment Guide Summary — Stage 15

**Generated at**: 2026-05-05T11:05:00Z

---

## Decisions

| Choice | Value |
|--------|-------|
| Cloud target | Self-hosted VPS (Hetzner CX21 / DigitalOcean Droplet) |
| Container registry | GitHub Container Registry (GHCR) |
| Environments | Local + Production only |
| Release strategy | Rolling — `docker compose pull && up -d` via SSH |
| Reverse proxy | Caddy 2 (automatic TLS via Let's Encrypt) |

---

## Artifacts Generated

| File | Purpose |
|------|---------|
| `api/Dockerfile` | Multi-stage NestJS image — non-root, HEALTHCHECK |
| `web/Dockerfile` | Multi-stage Next.js standalone image — non-root, HEALTHCHECK |
| `docker-compose.prod.yml` | Full production stack: Postgres + Redis + API + Web + Caddy |
| `infra/Caddyfile` | Reverse proxy: TLS + HSTS + routing `/api/*` → API, `/*` → Web |
| `infra/.env.prod.example` | Production env var template (safe to commit) |
| `.github/workflows/release.yml` | Tag-triggered build → GHCR push → SSH rolling deploy |

---

## Build Verification

| Image | Build | Status |
|-------|-------|--------|
| `api` (NestJS) | `docker build -f api/Dockerfile .` | ✅ Exit 0 |
| `web` (Next.js) | `docker build -f web/Dockerfile .` | ✅ Exit 0 |

---

## Release Flow

```
git tag v1.0.0 && git push --tags
         │
         ▼
GitHub Actions (release.yml)
  ├─ build api image  → ghcr.io/<repo>/api:v1.0.0  ─┐
  └─ build web image  → ghcr.io/<repo>/web:v1.0.0  ─┘
                                                      │
         ┌────────────────────────────────────────────┘
         ▼
SSH into VPS → cd /opt/ecommmer
              → docker compose -f docker-compose.prod.yml pull
              → docker compose -f docker-compose.prod.yml up -d
              → docker image prune -f
```

---

## Security Notes

- Caddy adds `Strict-Transport-Security` header — resolves the HSTS caveat from Gate #4 (SECURITY-04).
- All containers run as non-root users (`app` / `nextjs`).
- Redis password required in production (`requirepass` in Compose command).
- JWT keys generated once with `scripts/generate-jwt-keys.sh` and stored in VPS `.env.prod`.
- No secrets hardcoded in any tracked file.

---

## VPS Setup (one-time — Stage 16 IaC)

```bash
# On the VPS:
apt install docker.io docker-compose-plugin
usermod -aG docker deploy
mkdir -p /opt/ecommmer
# Copy docker-compose.prod.yml + infra/ + .env.prod
# Set DOMAIN in Caddyfile / env
docker compose -f docker-compose.prod.yml up -d
```

Required GitHub Secrets (production environment):
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

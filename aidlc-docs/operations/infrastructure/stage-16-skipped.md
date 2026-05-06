# Stage 16 — Infrastructure-as-Code: SKIPPED

**Date**: 2026-05-05
**Reason**: Cloud target is **Self-hosted VPS** (selected in Stage 15, Q1=A).

Per the Stage 16 rule: *"Skip IF cloud target is Self-hosted / on-prem — use docker-compose from Deployment Guide directly."*

## Equivalent IaC

The deployment surface for this project is fully described by:

| Artifact | Role |
|----------|------|
| `docker-compose.prod.yml` | Full application stack (Postgres, Redis, API, Web, Caddy) |
| `infra/Caddyfile` | Reverse proxy + TLS configuration |
| `infra/.env.prod.example` | Environment variable contract |
| `infra/postgres/init.sql` | DB schema initialization |
| `.github/workflows/release.yml` | Tagged-release deploy pipeline |

## VPS Bootstrap (one-time manual steps)

These replace Terraform `apply`:

```bash
# 1. Provision VPS (Hetzner/DigitalOcean UI or CLI)
# 2. SSH in as root
apt update && apt install -y docker.io docker-compose-plugin
usermod -aG docker deploy   # assumes a deploy user exists
# 3. Copy project files
mkdir -p /opt/ecommmer
# scp/rsync: docker-compose.prod.yml + infra/ + .env.prod
# 4. Start the stack
cd /opt/ecommmer
docker compose -f docker-compose.prod.yml up -d
```

All subsequent deploys are automated by the release pipeline (`appleboy/ssh-action`).

## Post-MVP Note

If the project grows beyond a single VM, Stage 16 should be revisited:
- Migrate to managed Postgres (Hetzner Managed Database / DigitalOcean Managed Database)
- Add a second VPS + Caddy load balancing for HA
- At that point, Terraform or Pulumi is appropriate

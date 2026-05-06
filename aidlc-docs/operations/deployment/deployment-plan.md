# Deployment Plan

**Generated at**: 2026-05-05T11:00:00Z
**Tier**: Greenfield
**Stage**: 15 — Deployment Guide

---

## Decisions Made (Q1–Q4 answers, 2026-05-05)

| Choice | Decision |
|--------|----------|
| Cloud target | **Self-hosted VPS** (Hetzner CX21 or DigitalOcean Droplet) |
| Container registry | **GitHub Container Registry (GHCR)** — `ghcr.io/<repo>/<service>` |
| Environments | **Local + Production only** |
| Release strategy | **Rolling** — `docker compose pull && up -d` on SSH |

---

## Containerized Stacks

| Stack | Dockerfile | Image tag pattern |
|-------|-----------|-------------------|
| Backend Node (NestJS API) | `api/Dockerfile` | `ghcr.io/<repo>/api:v<semver>` |
| Frontend (Next.js Web) | `web/Dockerfile` | `ghcr.io/<repo>/web:v<semver>` |

Data tier (Postgres + Redis) is NOT containerized via custom images — standard official images used directly in `docker-compose.prod.yml`.

---

## Reverse Proxy

**Caddy 2** serves as the TLS-terminating reverse proxy on the VPS:
- `https://<domain>/api/*` → `api:3001` (NestJS)
- `https://<domain>/*` → `web:3000` (Next.js)
- Automatic Let's Encrypt TLS (HTTPS enforced)
- HSTS header: `max-age=31536000` (satisfies SECURITY-04 caveat from Gate #4)

Config: `infra/Caddyfile`

---

## CI/CD Pipeline

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | PR / push to main → lint + typecheck + unit + e2e (existing) |
| `.github/workflows/release.yml` | Push tag `v*.*.*` → build + push GHCR images → SSH deploy to VPS |

**Release flow**:
1. Dev merges PR to `main` → CI runs (lint/test)
2. Tech Lead tags: `git tag v1.0.0 && git push --tags`
3. GitHub Actions builds `api` and `web` images in parallel → pushes to GHCR
4. Deploy job SSHes to VPS → `docker compose pull && up -d` (rolling)
5. Old containers replaced one at a time; Caddy remains live during transition

---

## Required GitHub Secrets (production environment)

| Secret | Purpose |
|--------|---------|
| `VPS_HOST` | IP or hostname of the VPS |
| `VPS_USER` | SSH username (e.g. `deploy`) |
| `VPS_SSH_KEY` | Private SSH key for the deploy user |

**GitHub Actions `GITHUB_TOKEN`** automatically handles GHCR authentication — no extra secret needed.

---

## Required VPS Setup (one-time, Stage 16 IaC)

1. Docker + Docker Compose v2 installed
2. `/opt/ecommmer/` directory with `docker-compose.prod.yml` and `.env.prod`
3. Deploy user with Docker group membership
4. Domain DNS pointing to VPS IP
5. Firewall: 80 + 443 open (Caddy); 22 for SSH; all others blocked

---

## Environment Variables (production)

See `infra/.env.prod.example` for the full list. Key values set per-VPS in `/opt/ecommmer/.env.prod`.

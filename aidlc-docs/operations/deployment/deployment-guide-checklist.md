# Deployment Guide Checklist — Stage 15

**Generated at**: 2026-05-05T11:05:00Z

---

- [x] Dockerfile for API (`api/Dockerfile`) — multi-stage, non-root user (`app`), HEALTHCHECK
- [x] Dockerfile for Web (`web/Dockerfile`) — multi-stage, non-root user (`nextjs`), HEALTHCHECK, Next.js standalone output
- [x] `next.config.mjs` — `output: 'standalone'` added (required for standalone Docker image)
- [x] Both Dockerfiles use monorepo root as build context (`docker build -f <stack>/Dockerfile .`)
- [x] Both Docker images build successfully (verified locally — exit code 0)
- [x] `docker-compose.prod.yml` runs full application stack (Postgres, Redis, API, Web, Caddy)
- [x] `infra/Caddyfile` — TLS-terminating reverse proxy with HSTS header (resolves Gate #4 SECURITY-04 caveat)
- [x] `infra/.env.prod.example` — all required production variables documented; no secrets hardcoded
- [x] `.github/workflows/ci.yml` — existing CI workflow unchanged; PR/push → lint+test (pre-existing)
- [x] `.github/workflows/release.yml` — tag `v*.*.*` → build + push GHCR → SSH rolling deploy
- [x] Release workflow uses `GITHUB_TOKEN` for GHCR (no extra secret needed)
- [x] No hardcoded secrets in Dockerfiles or pipeline files
- [x] Mobile distribution doc — N/A (no mobile in scope)
- [x] Per-stack `scripts/ci-api.sh` + `scripts/ci-web.sh` already exist (UoW-01)

---

**VPS one-time setup (Stage 16 IaC)**:
- [ ] Docker + Compose v2 installed on VPS
- [ ] `/opt/ecommmer/.env.prod` populated from `.env.prod.example`
- [ ] Deploy user added to Docker group
- [ ] Domain DNS configured
- [ ] Firewall: 80+443+22 open

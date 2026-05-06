# Deployment Guide — Open Questions
# Stage 15 · Round 1

**Generated at**: 2026-05-05T10:55:00Z
**Pod**: Chintan Bhai (Tech Lead) + Varshil (Dev)

Fill in `[Answer]:` for each question below.

---

## Q1: Hosting / Cloud Target

Where will the application run in production for the internal pilot?

> Context: Budget < $25K total. The project is a single-region internal demo (~5-10 friendly users). The execution plan noted "lean budget may pick self-hosted target". No multi-region or auto-scaling is required at pilot scale.

A) **Self-hosted VPS** — Hetzner CX21 or DigitalOcean Droplet (~€5-10/mo). Docker + docker-compose on a single VM. Full control, cheapest.
B) **Fly.io** — Managed PaaS. `fly deploy` per service, managed Postgres + Redis add-ons. Zero-ops overhead, free tier available, ~$20-40/mo for pilot scale.
C) **Render** — Similar to Fly.io. Web services + managed Postgres. Good Next.js / NestJS support.
D) **Railway** — Docker-based PaaS. One-click Postgres + Redis. Simplest workflow from docker-compose. ~$5-20/mo.
E) **AWS (EC2 + RDS + ElastiCache)** — Full AWS stack. More overhead for pilot but aligns with enterprise path if needed post-MVP.
X) Other — specify in answer.

[Answer]:A

---

## Q2: Container Registry

Where will Docker images be pushed and pulled from?

> Context: CI is GitHub Actions. Images need to be pushed on every tagged release and pulled by the hosting platform on deploy.

A) **GitHub Container Registry (GHCR)** — Free for public repos, free 500MB/mo for private; tightly integrated with GitHub Actions; no extra credentials setup. Recommended given existing GitHub Actions CI.
B) **Docker Hub** — Widely supported; free tier limits pulls; requires Docker Hub account.
C) **DigitalOcean Container Registry** — If picking DigitalOcean (Q1-A); native integration.
D) **Fly.io built-in registry** — If picking Fly.io (Q1-B); no separate registry needed.
E) **AWS ECR** — If picking AWS (Q1-E).
X) Other — specify.

[Answer]:A

---

## Q3: Environments

Which environments do you want to maintain for the internal pilot?

A) **Local + Production only** — Simplest for pilot. Developers run locally; tagged releases go straight to production.
B) **Local + Staging + Production** — Staging mirrors production. Slightly more infra cost; safer for testing before prod releases.
C) **Local + Dev (always-on branch preview) + Production** — Branch deploys for dev; production for tagged releases.
X) Other.

[Answer]:A

---

## Q4: Release Strategy

How should new versions be deployed to production?

A) **Rolling** — New container replaces old; brief overlap. Simplest; works with single-VM docker-compose.
B) **Blue-Green** — Two identical environments; traffic flipped via load balancer. Zero-downtime; requires 2× resources.
C) **Canary** — Route % of traffic to new version; full rollout after health check. Needs traffic routing layer.
X) Other.

[Answer]:A

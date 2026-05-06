# Deployment Guide

**Stage**: 15 (always-execute) — first stage of Operations Phase
**Purpose**: Produce the deployment artifacts the operations team needs to ship the project: Dockerfiles per stack, docker-compose for local + staging, and CI/CD pipeline templates targeting whichever pipeline the team uses (GitHub Actions / GitLab CI / Jenkins / Bitbucket Pipelines).

**Skills invoked at this stage**: [`dockerfile-generator`](../../skills/operations/dockerfile-generator/SKILL.md) for Dockerfile + docker-compose authoring (sub-actions 1–2; not sensitive). Sub-action 3 (image promotion to a production registry tag) is **sensitive** and refuses to run without a per-action signoff at `aidlc-docs/operations/skill-actions/<ts>-image-promote-prod-signoff.md` per `.aidlc/skills/skill-policy.md` § 2.

---

## Why This Stage Exists

AWS AI-DLC leaves Operations as a placeholder. This workflow fills it in because every project ends up containerized and deployed via CI/CD — and re-inventing those artifacts per project costs more than codifying conventions once.

---

## Prerequisites

- Stage 14 (Build & Test) complete with overall PASS
- Cloud target known (set in Stack Selection Block F.2)
- Tier known
- All chosen stacks recorded in `aidlc-state.md`

---

## Execution Steps

### Step 1: Plan the Deployment Surface

Generate `aidlc-docs/operations/deployment/deployment-plan.md` with the choices needed:

```markdown
# Deployment Plan

**Tier**: <…>
**Cloud target**: <AWS | GCP | Azure | Self-hosted | Mixed>

## Choices to Make
- [ ] Container target (per stack): which stacks ship as containers
- [ ] CI provider: GitHub Actions / GitLab CI / Jenkins / Bitbucket Pipelines
- [ ] Registry: ECR / GCR / ACR / Docker Hub / GitLab Registry / GitHub Container Registry
- [ ] Environments: dev / staging / production (or other)
- [ ] Branch strategy: trunk-based / GitFlow / GitHub Flow
- [ ] Release strategy: rolling / blue-green / canary
- [ ] Mobile distribution: TestFlight + Play Internal / App Center / Firebase App Distribution
```

Generate `deployment-questions.md` covering each open choice. Wait for answers. Validate.

### Step 2: Generate Dockerfiles (per stack)

Place under `<workspace-root>/<stack-or-service>/Dockerfile`. Reference templates summarized below — full content tailored per chosen framework.

#### Frontend (Next.js example)

```dockerfile
# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Stage 2: build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm run build

# Stage 3: runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

#### Backend Node (NestJS / Express / Fastify)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S app -G nodejs
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O- http://localhost:3001/health || exit 1
CMD ["node", "dist/main.js"]
```

#### Backend Python (FastAPI with uv)

```dockerfile
FROM python:3.12-slim AS build
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

FROM python:3.12-slim AS runtime
WORKDIR /app
RUN useradd -u 1001 -m app && chown -R app /app
COPY --from=build /app/.venv /app/.venv
COPY --chown=app:app . .
USER app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Backend Go

```dockerfile
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server

FROM gcr.io/distroless/static:nonroot
WORKDIR /app
COPY --from=build /out/server /app/server
USER nonroot:nonroot
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD ["/app/server", "-healthcheck"]
ENTRYPOINT ["/app/server"]
```

#### Mobile (Flutter)

Mobile builds don't run in containers — they target stores. See Step 5.

---

### Step 3: Docker Compose for Local + Staging

Generate `<workspace-root>/docker-compose.yml` and (if applicable) `docker-compose.staging.yml`:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports: ["5432:5432"]
    volumes: [postgres-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend-node:
    build: ./backend-node
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_started }
    environment:
      DATABASE_URL: postgres://app:app@postgres:5432/app
      REDIS_URL: redis://redis:6379
    ports: ["3001:3001"]

  backend-python:
    build: ./backend-python
    depends_on:
      postgres: { condition: service_healthy }
    environment:
      DATABASE_URL: postgres://app:app@postgres:5432/app
    ports: ["8000:8000"]

  frontend:
    build: ./frontend
    depends_on:
      backend-node:    { condition: service_started }
      backend-python:  { condition: service_started }
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://backend-node:3001
    ports: ["3000:3000"]

volumes:
  postgres-data:
```

(Adapt to actual stacks in scope — only include services that exist in the project.)

---

### Step 4: CI/CD Pipeline Templates

Generate the pipeline file matching the chosen CI provider. Show one template per option below — write only the chosen one.

#### GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main, dev]

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        stack:
          - frontend
          - backend-node
          - backend-python
          - backend-go
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        if: matrix.stack == 'frontend' || matrix.stack == 'backend-node'
        with: { version: 9 }
      - uses: actions/setup-node@v4
        if: matrix.stack == 'frontend' || matrix.stack == 'backend-node'
        with: { node-version: 20, cache: 'pnpm', cache-dependency-path: ${{ matrix.stack }}/pnpm-lock.yaml }
      - uses: astral-sh/setup-uv@v3
        if: matrix.stack == 'backend-python'
      - uses: actions/setup-go@v5
        if: matrix.stack == 'backend-go'
        with: { go-version: '1.22' }
      - name: Lint, type-check, test
        run: |
          cd ${{ matrix.stack }}
          ./scripts/ci.sh                    # one script per stack — team convention
```

`.github/workflows/release.yml` — image build + push on tag:

```yaml
name: Release
on:
  push:
    tags: ['v*.*.*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        stack: [frontend, backend-node, backend-python, backend-go]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ vars.REGISTRY }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      - uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.stack }}
          push: true
          tags: |
            ${{ vars.REGISTRY }}/${{ github.repository }}/${{ matrix.stack }}:${{ github.ref_name }}
            ${{ vars.REGISTRY }}/${{ github.repository }}/${{ matrix.stack }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### GitLab CI

`.gitlab-ci.yml`:

```yaml
stages: [lint, test, build, deploy]

variables:
  REGISTRY: $CI_REGISTRY_IMAGE

.frontend: &frontend
  before_script: [corepack enable, pnpm install --frozen-lockfile]
  cache: { paths: [node_modules/, .pnpm-store/] }

lint-frontend:
  stage: lint
  image: node:20-alpine
  <<: *frontend
  script: [pnpm run lint]

# ... similar jobs per stack
```

#### Jenkins

`Jenkinsfile`:

```groovy
pipeline {
  agent any
  stages {
    stage('Lint & Test') {
      parallel {
        stage('frontend')        { steps { dir('frontend')        { sh './scripts/ci.sh' } } }
        stage('backend-node')    { steps { dir('backend-node')    { sh './scripts/ci.sh' } } }
        stage('backend-python')  { steps { dir('backend-python')  { sh './scripts/ci.sh' } } }
        stage('backend-go')      { steps { dir('backend-go')      { sh './scripts/ci.sh' } } }
      }
    }
    stage('Build & Push') {
      when { tag 'v*.*.*' }
      // ... docker build + push per stack
    }
  }
}
```

#### Bitbucket Pipelines

`bitbucket-pipelines.yml`:

```yaml
image: atlassian/default-image:4

pipelines:
  default:
    - parallel:
        - step:
            name: Lint & test frontend
            script: [cd frontend, ./scripts/ci.sh]
        - step:
            name: Lint & test backend-node
            script: [cd backend-node, ./scripts/ci.sh]
        # ... etc
  tags:
    'v*.*.*':
      - step:
          name: Build & push images
          services: [docker]
          script:
            - # docker build + push per stack
```

---

### Step 5: Mobile Distribution (only if Mobile in scope)

`operations/deployment/mobile-distribution.md`:

```markdown
# Mobile Distribution

## iOS — TestFlight (Recommended for internal beta)
- Apple Developer account ID: <…>
- Team ID: <…>
- Bundle ID: <…>
- Build via fastlane:
  - `fastlane ios beta` — uploads to TestFlight
- Required secrets in CI: `APP_STORE_CONNECT_API_KEY_*`, `MATCH_PASSWORD`
- App Store Review checklist link: <…>

## Android — Play Internal Testing (Recommended for internal beta)
- Play Console account: <…>
- Package name: <…>
- Build via fastlane:
  - `fastlane android beta` — uploads to Internal track
- Required secrets in CI: `PLAY_STORE_JSON_KEY`, keystore secrets

## Production releases
- iOS: promote TestFlight build → App Store after review
- Android: promote Internal → Closed → Open → Production tracks
```

---

### Step 6: Per-Stack `scripts/ci.sh` (Team Convention)

Each stack-root contains a single `scripts/ci.sh` so CI providers can call one script regardless of provider:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Frontend or Backend Node
pnpm install --frozen-lockfile
pnpm run lint
pnpm run type-check
pnpm run test --coverage
pnpm run build
```

```bash
# Backend Python
uv sync --locked
uv run ruff check .
uv run ruff format --check .
uv run mypy src/
uv run pytest --cov=src --cov-fail-under=80
```

```bash
# Backend Go
go mod download
gofmt -l . | tee /dev/stderr | (! read)
go vet ./...
golangci-lint run
go test ./... -race -cover
go build ./...
```

```bash
# Mobile Flutter
flutter pub get
dart format --set-exit-if-changed .
dart analyze --fatal-infos --fatal-warnings
flutter test --coverage
```

---

### Step 7: Stage Checklist

`deployment-guide-checklist.md`:
- [ ] Dockerfile per containerized stack
- [ ] Multi-stage build with non-root user
- [ ] HEALTHCHECK in every Dockerfile
- [ ] docker-compose.yml runs locally end-to-end
- [ ] CI workflow file matches chosen provider
- [ ] CI runs lint + type-check + test + build per stack
- [ ] Release workflow tagged-on-version pushes images to registry
- [ ] Mobile distribution doc exists (if Mobile in scope)
- [ ] Per-stack `scripts/ci.sh` exists and is executable
- [ ] No hardcoded secrets in Dockerfiles or pipeline files

### Step 8: Completion Message

```markdown
# Deployment Guide — Complete ✅

- **Containerized stacks**: <list>
- **CI provider**: <…>
- **Registry**: <…>
- **Mobile distribution**: <…> (if applicable)

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to Infrastructure-as-Code (Stage 16)
```

---

## Anti-patterns

- ❌ Single-stage Dockerfiles (waste of size, leaks build deps)
- ❌ Running containers as root
- ❌ No HEALTHCHECK directive
- ❌ Hardcoded registry credentials in pipeline files (use secret store)
- ❌ Re-running tests in CI when Code Review already ran them — instead reuse coverage/test artifacts
- ❌ Same image tag mutating between deploys (always use immutable tags + `latest` alias)
- ❌ Mobile signed locally only (signing must work in CI)

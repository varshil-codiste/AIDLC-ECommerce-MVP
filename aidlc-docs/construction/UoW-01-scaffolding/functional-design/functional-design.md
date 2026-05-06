# Functional Design — UoW-01 Project Scaffolding

**Unit**: UoW-01 — Project scaffolding + monorepo + CI + dev scripts
**Tier**: Greenfield
**Depth**: Minimal-by-content (the UoW carries no domain logic; the execution plan called for Comprehensive but there is nothing functional to design beyond directory structure and tooling)
**Generated**: 2026-05-04T00:25:00Z

---

## 1. Scope

UoW-01 is **infrastructure / tooling only**. It produces:

- The monorepo skeleton (`web/`, `api/`, `shared/`, `infra/`, `scripts/`, `aidlc-docs/`) per ADR-006
- Root-level dev tooling (Node version pin, package manager pin, lint config, Prettier config, EditorConfig, `.gitignore`, `.gitattributes`)
- The empty `web/` Next.js project shell (no components yet — those land in UoW-05)
- The empty `api/` NestJS project shell (no modules yet — those land in UoW-02 onward)
- The `shared/` directory with placeholder `openapi.yaml` (just `info` block)
- `scripts/dev.sh` — single command to bring everything up locally
- `scripts/ci.sh` — codiste convention: shell entry point invoked by GitHub Actions
- `.github/workflows/ci.yml` — minimal pipeline that calls `scripts/ci.sh`
- `README.md` — quickstart for the pod

It produces **NO** domain entities, business rules, state machines, or data flow.

---

## 2. Domain Entities

**N/A — this UoW introduces no domain entities.** Domain entities are introduced starting in UoW-02 (Auth: User), UoW-03 (audit_log), and onward.

---

## 3. Business Rules

**N/A — this UoW introduces no business logic.** Tooling and configuration files do not encode business rules.

---

## 4. State Transitions

**N/A — no stateful objects.**

---

## 5. Data Flow

**N/A — no runtime data flow.** Only static files (configs, skeleton code) are produced.

---

## 6. Integration Points

| Integration | Direction | Purpose |
|-------------|-----------|---------|
| Git remote (e.g., GitHub) | outbound, manual `git push` | Hosting the monorepo |
| GitHub Actions | inbound webhook on push/PR | Runs `scripts/ci.sh` |
| pnpm registry (or whichever package manager Stage 11 picks) | outbound at install time | Dependency resolution |

No live external services touched at runtime.

---

## 7. Error Handling

**N/A** at the UoW level. Standard CI failure modes (lint fail, type fail, test fail) are handled by `scripts/ci.sh` exit codes; no application-level error envelope applies.

---

## 8. Frontend Component Tree (FE in scope?)

**Partial** — only the Next.js project shell. No components defined here. The component catalog from `application-design/components.md` § Frontend lists 23 components; **all are deferred to UoW-05 and later**.

The shell consists of:

```
web/
├── app/
│   ├── layout.tsx          # Bare-bones HTML shell with html/lang/title for NFR-A11Y-08
│   └── page.tsx            # Placeholder index page redirecting to /chat (chat route created in UoW-05)
├── public/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts      # if Stage 11 confirms Tailwind
├── postcss.config.mjs
└── .eslintrc.cjs
```

---

## 9. Backend Module Tree (BE in scope?)

**Partial** — only the NestJS project shell. No modules wired. The full module list from `application-design/components.md` § Backend (12 modules) is deferred — UoW-02 wires `auth/`, UoW-03 wires `persistence/` + `audit/`, UoW-04 wires `telemetry/`, etc.

The shell consists of:

```
api/
├── src/
│   ├── main.ts             # Bootstrap: creates Nest app, listens on PORT
│   └── app.module.ts       # Empty root module (no imports yet)
├── test/
│   └── app.e2e-spec.ts     # Single smoke test: GET /health → 200
├── package.json
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── .eslintrc.js
└── prisma/
    └── schema.prisma       # Empty: only generator + datasource blocks pointing to env vars
```

The `/health` endpoint is the only runtime endpoint UoW-01 ships — used by Stage 17 Observability and as a sanity check for Stage 14 Build & Test.

---

## 10. Mobile Screens

**N/A — no Mobile in scope** (BR § 2.1 + execution-plan.md).

---

## 11. Dev Scripts

| Script | Purpose | Invokes |
|--------|---------|---------|
| `scripts/dev.sh` | Local dev: starts web + api + Postgres + Redis | `docker-compose up -d` (Postgres+Redis) + `pnpm --filter api dev` + `pnpm --filter web dev` |
| `scripts/ci.sh` | CI entry: lint + typecheck + test for both stacks | calls per-stack `scripts/ci-{web,api}.sh` driven by changed paths |
| `scripts/seed-pilot-users.ts` | Seed 5–10 internal pilot users into the dev DB | uses Prisma client; lands later but the file placeholder exists from UoW-01 |

---

## 12. Acceptance Criteria for the UoW

(These also become the Stage 13 Code Review test cases for UoW-01.)

- *Given* a fresh clone of the monorepo, *When* the dev runs `scripts/dev.sh`, *Then* both web and api start, web reaches the placeholder `/` route, api `/health` returns 200, Postgres + Redis are reachable.
- *Given* a PR is opened, *When* GitHub Actions runs, *Then* `scripts/ci.sh` runs lint + typecheck + the smoke test on both stacks, and the run completes ≤ 3 min on a clean cache.
- *Given* the `web/` and `api/` directories, *When* a linter or formatter runs, *Then* zero errors / zero warnings on the freshly scaffolded code.
- *Given* the lockfiles (`pnpm-lock.yaml` or equivalent), *When* the audit runs, *Then* zero high or critical CVEs in the initial dependency tree.

---

## 13. ER Diagram

**N/A** — no entities.

---

## 14. Cross-Stack Notes

- The `shared/openapi.yaml` initially contains only the `/health` GET endpoint. As later UoWs add functionality, each PR appends to this single file.
- Code-generation flow (`shared/openapi.yaml` → typed FE client + BE handlers): the **mechanism** is set up in UoW-01 (npm script `pnpm gen:contracts`), but no contracts beyond `/health` exist yet.

# Reverse Engineering

**Stage**: 3 (conditional — brownfield only)
**Purpose**: Analyze the existing codebase to produce inventories the rest of the workflow can build on. For the team's full-stack projects, this means generating per-stack inventories (FE / BE / Mobile) and consolidating them into a unified view.

---

## When This Stage Runs

Execute IF (all conditions met):
- Workspace Detection set `Project Type = Brownfield`
- AT LEAST one stack was detected
- No prior `aidlc-docs/inception/reverse-engineering/` artifacts exist OR the existing artifacts are stale (older than the codebase's last significant commit)

Skip IF:
- Greenfield project
- Recent RE artifacts exist and the user does NOT request a refresh

For **bugfix Tier**, RE only runs if the root cause is unknown. The AI MUST ask the pod via a question file: "This is a bugfix Tier and the affected file is known — should we still run full Reverse Engineering, or only inventory the affected files?"

---

## Prerequisites

- Workspace Detection complete
- Business Requirements Intake complete (Gate #1 signed) — this workflow runs RE AFTER BR, not before
- Design Intake complete or skipped

---

## Execution Steps

### Step 1: Plan the Analysis

Create `aidlc-docs/inception/reverse-engineering/plan.md` with a checklist of which stacks to analyze and which artifacts to produce:

```markdown
# Reverse Engineering Plan

**Stacks to analyze**: <comma-separated list from aidlc-state.md § Detected Stacks>
**Tier**: <…>
**Mode**: <Full | Targeted (bugfix only)>

## Artifacts to produce
- [ ] business-overview.md
- [ ] architecture.md
- [ ] code-structure.md
- [ ] api-documentation.md
- [ ] component-inventory.md
- [ ] technology-stack.md
- [ ] dependencies.md
- [ ] code-quality-assessment.md
- [ ] reverse-engineering-timestamp.md
```

Get pod confirmation on Mode (Full vs Targeted) before continuing.

---

### Step 2: Per-Stack Inventory

For each detected stack, produce a stack-specific inventory file under `aidlc-docs/inception/reverse-engineering/stacks/`:

| Stack | File | Contents |
|-------|------|----------|
| Frontend | `frontend.md` | Framework version, routing scheme, state management, component count, page count, build tool, test framework, lint config |
| Backend Node.js | `backend-node.md` | Framework, ORM, middleware stack, route count, test framework, lint, package manager |
| Backend Python | `backend-python.md` | Framework, ORM, package manager (pip/uv/poetry/pipenv), virtual env, test framework, lint, type checker |
| Backend Go | `backend-go.md` | Module name, framework / stdlib, layout (cmd/internal/pkg), test framework, lint |
| Mobile Flutter | `mobile-flutter.md` | Flutter version, state management, dependency packages, platform support (iOS/Android/Web/Desktop), test framework |

Each per-stack file should be 1–3 pages of factual inventory — no recommendations, no opinions yet.

---

### Step 3: Generate Top-Level Artifacts

For each artifact below, follow the structure. Adapt depth to Tier (per `common/depth-levels.md`).

#### `business-overview.md`
- Inferred from existing code: what business transactions does the system support?
- Read controllers / route handlers / mobile screens / FE pages to enumerate user-facing flows
- Include a context diagram (Mermaid) showing actors → system → external services

#### `architecture.md`
- High-level architecture (Mermaid component diagram)
- Identify integration points (external APIs, message queues, databases)
- Identify deployment topology if discoverable from Dockerfile / IaC / CI

#### `code-structure.md`
- Directory tree (depth ≤ 3)
- Convention summary per stack (e.g., "Node project follows Express + layered controllers/services/repositories")
- Notable patterns (DI containers, plugin systems, monorepo workspaces)

#### `api-documentation.md`
- REST endpoints discovered in routes / controllers / handlers
- GraphQL schema if found
- Internal RPC if found
- For each: HTTP verb, path, brief purpose. NOT a full OpenAPI spec — that's out of scope here

#### `component-inventory.md`
- Per-stack: a table of components / packages / modules with counts and brief responsibilities
- For Frontend: count of pages, components, hooks, contexts
- For Mobile: count of screens, widgets, providers/blocs

#### `technology-stack.md`
- Languages + versions
- Frameworks + versions
- Build tools (npm/pnpm/uv/poetry/go modules/flutter)
- CI / CD signals (Jenkinsfile, GitHub Actions workflows)
- Containerization (Dockerfile present?)
- IaC (Terraform / Pulumi / CDK signals)

#### `dependencies.md`
- Per-stack dependency lists with versions
- Flag dependencies with known critical CVEs (best effort — note that the **Security extension** (Stage 4 opt-in) does the rigorous scan)
- Internal dependency graph (Mermaid) — which UoW / module depends on which

#### `code-quality-assessment.md`
- Lint config presence per stack
- Test framework presence + visible coverage
- Type checking (TS strict mode, mypy/pyright, Go race detector usage)
- Static-analysis findings if tools are already configured
- Notable technical debt visible from code (TODO/FIXME counts, deprecated dependencies, very old packages)

#### `reverse-engineering-timestamp.md`
- ISO timestamp
- Codebase last commit hash and date at time of RE
- List of artifacts produced
- Mark "current" or "stale" semantics for future runs

---

### Step 4: Stage Checklist

Generate `reverse-engineering-checklist.md` per `common/checklist-conventions.md` with items derived from Step 1's plan + Step 3 artifacts. Every item must be `[x]` or `[~] N/A: <reason>`.

---

### Step 5: Completion Message

```markdown
# Reverse Engineering — Complete ✅

**Stacks analyzed**: <list>
**Artifacts produced**: 9 top-level + N per-stack inventories

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes** — request rework on any artifact
> ✅ **Continue to Next Stage** — proceed to Requirements Analysis
```

Wait for explicit user approval. Log in `audit.md`.

---

## Notes

- Adapt depth: bugfix tier targeted-mode produces only `code-structure.md`, `dependencies.md`, and `code-quality-assessment.md` for the affected files
- Brownfield projects often have undocumented internal conventions — when an inferred convention is uncertain, mark it "Inferred — confirm with team"
- This stage produces **no recommendations** — recommendations belong to Workflow Planning (Stage 7) and the per-unit Construction stages

---

## Anti-patterns

- ❌ Producing recommendations or refactoring suggestions in RE artifacts
- ❌ Skipping per-stack inventories — full-stack projects need them all
- ❌ Including code snippets longer than 10 lines in inventories — link to source instead
- ❌ Running RE for a bugfix without first asking pod whether targeted mode suffices

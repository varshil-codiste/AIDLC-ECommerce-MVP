# Workspace Detection

**Purpose**: Determine workspace state, detect existing AI-DLC projects, identify all team stacks present (FE / BE Node / BE Python / BE Go / Mobile Flutter), and prepare the `aidlc-docs/` tree.

---

## Step 1: Resume Check

Check if `aidlc-docs/aidlc-state.md` exists:
- **If exists** → resume per `common/session-continuity.md` (do NOT continue with this rule)
- **If not exists** → continue with this rule

If a `pod.md` exists but `aidlc-state.md` does not, treat as a partial / abandoned setup: rename `pod.md` to `pod.md.backup.<ISO timestamp>` and continue fresh.

---

## Step 2: Scan for Existing Code

Determine if the workspace already has code:

1. **File-extension scan** for source files:
   - JS/TS: `.js .jsx .ts .tsx .mjs .cjs`
   - Python: `.py .pyi`
   - Go: `.go`
   - Flutter/Dart: `.dart`
   - Other: `.java .kt .rb .php .rs .c .h .cpp .cs`

2. **Build / config file detection**:
   - Node: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`
   - Python: `pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py`, `uv.lock`, `poetry.lock`
   - Go: `go.mod`, `go.sum`
   - Flutter: `pubspec.yaml`, `pubspec.lock`, `analysis_options.yaml`
   - FE: `vite.config.*`, `next.config.*`, `webpack.config.*`, `astro.config.*`, `tailwind.config.*`
   - Container / CI: `Dockerfile`, `docker-compose.yml`, `Jenkinsfile`, `.github/workflows/`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`
   - Other: `Makefile`, `pom.xml`, `build.gradle`, `Cargo.toml`

3. **Stack detection** — for each stack, set a flag:

| Stack | Signal |
|-------|--------|
| Frontend (Web) | `package.json` present AND has `react` / `next` / `vue` / `astro` / `vite` / `nuxt` in dependencies |
| Backend Node.js | `package.json` present AND has `express` / `nestjs` / `fastify` / `koa` / `hapi` / `restify` in dependencies AND/OR an `app.js` / `server.js` / `main.ts` |
| Backend Python | `pyproject.toml` or `requirements.txt` present (and not exclusively a build-tool config) |
| Backend Go | `go.mod` present |
| Mobile Flutter | `pubspec.yaml` present |

A repo can match multiple stacks (full-stack monorepo).

4. **Workspace root**: identify the absolute path of the topmost directory containing project files. NEVER use `aidlc-docs/` as the workspace root.

Record findings in a draft for Step 4.

---

## Step 3: Determine Project Type & Next Stage

| Found code? | Type | Next stage |
|-------------|------|-----------|
| No source files, no build config | **Greenfield** | Stage 1 — Business Requirements Intake |
| Source files present, no `aidlc-docs/` | **Brownfield (new to AI-DLC)** | Stage 1 — Business Requirements Intake (Reverse Engineering will run after BR sign-off if needed) |
| Source files present AND existing `aidlc-docs/inception/reverse-engineering/` artifacts that are recent | **Brownfield (continuing)** | Stage 1 — Business Requirements Intake; reuse RE artifacts |
| Source files present AND existing RE artifacts older than the codebase's last significant commit | **Brownfield (RE stale)** | Stage 1 — Business Requirements Intake; mark RE for refresh |

**Important**: AI-DLC ALWAYS goes through Business Requirements Intake before Reverse Engineering. AWS's flow ran RE first; This workflow reverses that order so that the BR captures *why* the work is being done before code analysis.

---

## Step 4: Create Initial State, Profile, Pod Roster, and Audit Files

Create the `aidlc-docs/` tree by invoking the init script (idempotent — safe to re-run):

```bash
bash .aidlc/skills/scripts/init-aidlc.sh
```

This creates `aidlc-docs/` and copies the profile template into place at `aidlc-docs/aidlc-profile.md`. The profile is the **single source of truth for adaptation context** (team name, pod roles, stack recommendations, operations preferences) — downstream stages read it instead of hard-coding any specific organization's defaults.

Final tree shape:

```
aidlc-docs/
├── aidlc-state.md
├── aidlc-profile.md       # ← team / pod / stack / ops profile (this is what makes the workflow setup-able by anyone)
├── audit.md
├── pod.md
└── inception/
    ├── business-requirements/
    └── (other subdirectories created as stages run)
```

### Profile-first prompt

After the init script runs, ask the user via the standard `.md` question file format:

```markdown
## Question 1
This is your first AI-DLC project. Would you like to apply a preset to fill the profile with sensible defaults, or fill the profile from scratch?

A) Apply a preset (e.g., the `codiste` preset — original Codiste flavor: 40-person agency, full-stack FE/BE/Mobile)
B) Fill the profile from scratch (you answer team/pod/stack questions one at a time)
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

If the user picks **A**, run `bash .aidlc/skills/scripts/init-aidlc.sh --preset <name>` and then walk the user through the placeholders that remain (team name, project name, etc. — preset doesn't fill those).

If the user picks **B**, walk the user through every section of `aidlc-profile.md` via question files (one section at a time per `common/question-format-guide.md`).

The workflow MUST refuse to advance to Stage 1 (Business Requirements) until the profile has at minimum: `team.name`, `pod.roles`, `project.name`, `project.workspace_root` filled.

### `aidlc-state.md` template

```markdown
# AI-DLC State

**Project**: <best-guess project name from package.json / pubspec / repo name>
**Created**: <ISO timestamp>
**Last updated**: <ISO timestamp>
**Workspace root**: <absolute path>
**Project type**: <Greenfield | Brownfield>

## Tier
<Not yet set — will be set by Business Requirements Intake>

## Pod
See pod.md.

## Welcome Shown
- [x] Welcome message displayed at <ISO timestamp>

## Detected Stacks
| Stack | Detected | Signals |
|-------|----------|---------|
| Frontend (Web) | <Yes/No> | <list> |
| Backend Node.js | <Yes/No> | <list> |
| Backend Python | <Yes/No> | <list> |
| Backend Go | <Yes/No> | <list> |
| Mobile Flutter | <Yes/No> | <list> |

## Current Position
**Phase**: INCEPTION
**Stage**: 1. Business Requirements Intake
**Sub-step**: not yet started

## Stage Status
| # | Stage | Status |
|---|-------|--------|
| 0 | Workspace Detection | COMPLETE |
| 1 | Business Requirements Intake | PENDING |

## Extension Configuration
<Will be populated by Requirements Analysis>

## Code Location Rules
- Application code: workspace root (NEVER in `aidlc-docs/`)
- Documentation: `aidlc-docs/` only
- Per-stack project structure: see `construction/stacks/*-conventions.md`
```

### `pod.md` template

Use the template from `common/pod-ritual.md` § Pod Roster File. Pre-fill `<name>` placeholders. Workspace Detection does NOT block on filling these in — but Business Requirements Intake (Stage 1) will refuse to advance Gate #1 until both names are filled.

### `audit.md` template

```markdown
# AI-DLC Audit Log

This file records every user input and AI response across the workflow. Append-only — never overwrite.

## Workspace Detection
**Timestamp**: <ISO>
**User Input**: "<the original "Using AI-DLC, ..." invocation, verbatim>"
**AI Response**: "AI-DLC initialized. Detected <project type>. Detected stacks: <list>."
**Context**: Initial invocation — Workspace Detection.

---
```

---

## Step 5: Workspace Detection Checklist

Generate `aidlc-docs/inception/workspace-detection-checklist.md` per `common/checklist-conventions.md`:

```markdown
# Workspace Detection Checklist

**Tier**: <not yet set>
**Generated by**: AI-DLC
**Generated at**: <ISO>

## Items

### Section 1 — Detection
- [ ] Existing `aidlc-docs/` checked (resume vs new)
- [ ] Workspace scanned for source files
- [ ] Workspace scanned for build / config files
- [ ] Per-stack detection performed (FE / BE Node / BE Python / BE Go / Mobile Flutter)
- [ ] Workspace root identified (not `aidlc-docs/`)

### Section 2 — Tree Setup
- [ ] `aidlc-docs/` created (or already existed)
- [ ] `aidlc-state.md` created with detection summary
- [ ] `audit.md` initialized with the original invocation
- [ ] `pod.md` template created (names may be empty for now)

### Section 3 — Routing
- [ ] Project type set: Greenfield / Brownfield
- [ ] Next stage identified: Business Requirements Intake (always)
- [ ] If brownfield: existing RE artifacts inventoried and marked current/stale/missing

## Modification Log
| Timestamp (ISO) | Editor | Change |
```

The AI MUST mark every item `[x]` or `[~] N/A: <reason>` before presenting completion.

---

## Step 6: Completion Message

### For Greenfield

```markdown
# Workspace Detection Complete

- **Project type**: Greenfield
- **Workspace root**: <path>
- **Stacks detected**: none yet (greenfield)
- **Next stage**: Business Requirements Intake (Stage 1)

Proceeding automatically to Business Requirements Intake.
```

### For Brownfield

```markdown
# Workspace Detection Complete

- **Project type**: Brownfield
- **Workspace root**: <path>
- **Stacks detected**: <comma-separated list with primary signal each>
- **Existing Reverse Engineering artifacts**: <None / Current / Stale>
- **Next stage**: Business Requirements Intake (Stage 1)

Reverse Engineering will be scheduled after Gate #1 if needed.

Proceeding automatically to Business Requirements Intake.
```

---

## Step 7: Auto-Proceed

No user approval required. Workspace Detection is informational. Automatically invoke `inception/business-requirements.md` next.

Log the proceed event in `audit.md`.

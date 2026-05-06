# AI-DLC — Skills Catalog

This folder contains **Agent Skills** (Anthropic-standard `SKILL.md` packages) that give the the pod on-demand expertise at each stage of the AI-DLC workflow. Skills run alongside the rule files in `../aidlc-rule-details/` and compose with them via description-match triggering and progressive disclosure (lightweight metadata at boot, body on trigger, resources on demand).

The skills here work across **Claude Code, Cursor, GitHub Copilot, Codex CLI, Gemini CLI, Cline, Windsurf, OpenCode, Aider, Kilo Code, Augment, Antigravity, OpenClaw, and Hermes** — see `skill-policy.md` § Per-Agent Notes for any per-agent quirks.

---

## How to install / use

From the project root after cloning:

```bash
bash .aidlc/skills/scripts/install-aidlc-skills.sh
```

The script creates symlink shims so each IDE finds skills in its expected location (`.claude/skills/`, `.cursor/skills/`, `.github/skills/`, `.agents/skills/`) — single source of truth at `.aidlc/skills/`. It also runs `lint-skills.py` to catch frontmatter issues that would cause silent failures in some IDEs.

For IDE-specific notes (Cursor reload, GitHub Copilot config, etc.) see `skill-policy.md`.

---

## Catalog (filled out as phases F2–F5 ship)

### Inception phase skills

| Skill | Stage | Status |
|-------|-------|--------|
| `product-discovery` | 1 — Business Requirements | ⏳ F2 |
| `figma-mcp-extractor` | 2 — Design Intake (Figma path) | ⏳ F2 |
| `screenshot-design-parser` | 2 — Design Intake (Screenshots path) | ⏳ F2 |
| `invest-story-writer` | 5 — User Stories | ⏳ F2 |

### Construction core skills

| Skill | Stage | Status |
|-------|-------|--------|
| `api-contract-designer` | 8 — Functional Design | ⏳ F3 |
| `react-best-practices` | 12 — Code Generation (FE) | ⏳ F3 |
| `nestjs-conventions` | 12 — Code Generation (BE Node) | ⏳ F3 |
| `fastapi-conventions` | 12 — Code Generation (BE Python) | ⏳ F3 |
| `go-clean-architecture` | 12 — Code Generation (BE Go) | ⏳ F3 |
| `flutter-riverpod-architecture` | 12 — Code Generation (Mobile) | ⏳ F3 |
| `property-based-test-generator` | 12 — Code Generation (PBT extension) | ⏳ F3 |

### Code Review aggregator skills

| Skill | Powers | Status |
|-------|--------|--------|
| `lint-aggregator` | Gate #4 verdict — Check 1 | ⏳ F4 |
| `sast-aggregator` | Gate #4 verdict — Check 2 | ⏳ F4 |
| `test-runner-aggregator` | Gate #4 verdict — Check 3 | ⏳ F4 |
| `multi-specialist-code-review` | Gate #4 verdict — Check 4 (AI Review) | ⏳ F4 |

### Operations & extension skills

| Skill | Stage | Status |
|-------|-------|--------|
| `dockerfile-generator` | 15 — Deployment Guide | ⏳ F5 |
| `terraform-iac-author` | 16 — IaC (SENSITIVE) | ⏳ F5 |
| `observability-wirer` | 17 — Observability Setup | ⏳ F5 |
| `production-readiness-checker` | 18 — Production Readiness | ⏳ F5 |
| `llm-eval-harness` | AI/ML extension (AIML-02) | ⏳ F5 |

Total: **20 curated skills** in v1. Honorable mentions (auth0/*, stripe, supabase, anthropic mcp-builder, cloudflare wrangler, huggingface trainer, expo) deferred to v2.

---

## How to author a new skill

See `AUTHORING.md`. In short:

1. Pick a need that recurs across projects
2. Vendor (or git-submodule) any upstream skill that already addresses it
3. Author a AI-DLC wrapper `SKILL.md` (frontmatter `name` + `description` are mandatory)
4. Add 5 trigger-test prompts and run them through the eval harness
5. Run `lint-skills.py` locally
6. Open a PR; pod reviews; merge

---

## Governance

- **Free-roam invocation, audit-logged**: any skill may be invoked at any stage. Every invocation appends an entry to `aidlc-docs/audit.md` with timestamp, skill, stage, Tier, inputs summary, outcome.
- **Sensitive skills require a per-action signoff** before live mutation (production deploy, IaC apply, payments, secrets rotation). The countersign extends the existing 5-gate model — no new gate is introduced. See `skill-policy.md` § Sensitive Skills.

---

## Files in this folder

```
skills/
├── README.md                 ← this file
├── skill-policy.md           ← governance, sensitive-skill list, per-agent notes
├── AUTHORING.md              ← skill-authoring guide
├── scripts/
│   ├── install-aidlc-skills.sh     ← post-clone shim creator + lint runner
│   └── lint-skills.py                ← frontmatter validator (CI + --diagnose)
├── inception/                ← F2 deliverables
├── construction/             ← F3 + F4 deliverables
├── operations/               ← F5 deliverables
└── extensions/               ← F5 deliverables
```

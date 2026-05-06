# AI-DLC — Skill Policy

**Owner**: the pod (Tech Lead has final say on policy changes)
**Last revised**: F1 release

This document is the governance contract for every Agent Skill in `.aidlc/skills/`. It defines who can invoke what, how invocations are logged, which skills are sensitive, and how each IDE/agent in the team's ecosystem behaves.

---

## 1. Invocation model — free-roam with audit log

Any installed skill may be invoked at any AI-DLC stage. There is **no per-skill allow-list per stage** in v1 (we may revisit in v2 once we have data on actual misuse).

The control is the **audit log**. Every skill invocation MUST emit two entries to `aidlc-docs/audit.md`:

### Pre-invocation entry

```markdown
## Skill Invocation
**Timestamp**: <ISO 8601>
**Skill**: <skill-name>
**Stage**: <current AI-DLC stage>
**Tier**: <Greenfield | Feature | Bugfix>
**Inputs (summary)**: <one-line summary; never dump raw secrets/PII>
**Sensitive**: <yes | no>
**Pre-flight mode**: <dry-run | live>
---
```

### Post-invocation entry

```markdown
## Skill Result
**Timestamp**: <ISO 8601>
**Skill**: <skill-name>
**Outcome**: <success | failure | blocked-by-policy>
**Files affected**: <list of relative paths or "none">
**Output summary**: <one paragraph or relative path to the full output artifact>
---
```

If a skill aborts mid-run, the post-invocation entry is still required, with `Outcome: failure` and a one-line cause.

---

## 2. Sensitive skills

Skills with **production blast radius** are flagged sensitive. They CANNOT perform live mutation without a per-action signoff file.

### Sensitive skills in v1

| Skill | Blast radius | Live action requiring signoff |
|-------|--------------|-------------------------------|
| `terraform-iac-author` | iac-apply | `terraform apply` (any non-dev env) |
| `dockerfile-generator` | production-deploy | image promotion to prod registry tag |
| `observability-wirer` | secrets | rotating credentials in managed observability platforms |

(Future v2: `stripe-best-practices` for live-mode operations, any future secret-rotation skill, any future `kubectl apply` skill.)

### AI-DLC extension frontmatter

Sensitive skills declare themselves with a `aidlc:` block in their wrapper SKILL.md. This is a non-standard field; agents ignore unknown frontmatter, so it's portable.

```yaml
---
name: terraform-iac-author
description: ...
aidlc:
  sensitive: true
  blast-radius: iac-apply
  countersign-required-at: per-action-signoff
---
```

The lint script (`scripts/lint-skills.py`) validates the `aidlc:` block shape; the workflow refuses to live-invoke a `sensitive: true` skill without a matching signoff file.

### Per-action signoff

Before a sensitive live action can run, the workflow generates and waits for:

```
aidlc-docs/operations/skill-actions/<ISO-timestamp>-<short-action>-signoff.md
```

Template (mirrors `common/approval-gates.md` § universal signoff):

```markdown
# Skill Action Signoff — <action>

**Skill**: <name>
**Stage**: <stage>
**Action summary**: <one paragraph>
**Plan output (dry-run)**: <relative path to dry-run artifact — must exist>
**Tier**: <…>
**Sensitive flag**: yes — blast-radius=<…>

- [ ] Tech Lead: ____________  Date: ____________  (ISO 8601)
- [ ] Dev:       ____________  Date: ____________  (ISO 8601)

## Plan summary
<paste of the dry-run plan output for human review>

## Risk acknowledgement
<single paragraph the pod writes acknowledging what the action will change in production>
```

Validation rules (enforced by the workflow before invocation):
- File exists at the canonical path
- Both `[x]` ticked
- Names match `pod.md` entries
- ISO dates within last 7 days (sensitive signoffs expire faster than gate signoffs)
- Plan-output path resolves to an existing file
- Risk acknowledgement paragraph is non-empty

If any check fails, the workflow logs a `blocked-by-policy` entry in `audit.md` and refuses.

---

## 3. Per-Agent Notes

| Agent | Discovery dir | Auto-discover | Quirks AI-DLC handles |
|-------|---------------|---------------|------------------------|
| Claude Code | `.claude/skills/` | ✅ at session start | reference impl |
| GitHub Copilot (VS Code) | `.github/skills/`, `.claude/skills/`, `.agents/skills/` (configurable via `chat.agentSkillsLocations`) | ✅ description-match | folder name MUST equal `name` field; namespace prefixes (`org/skill`) fail silently |
| Cursor | `.cursor/skills/` | ❌ manual invoke | window reload required after add/edit (Cmd+Shift+P → Developer: Reload Window) |
| Codex CLI | Codex skills dir + `.claude/skills/` | ✅ | optional `openai.yaml` for Codex-specific metadata; ignored elsewhere |
| Gemini CLI | per Gemini extensions config | ✅ | — |
| Cline | `.claude/skills/` | ✅ | — |
| Windsurf | per Windsurf docs | ✅ | — |
| Aider, Kilo Code, OpenCode, OpenClaw, Hermes, Augment, Antigravity | mix; most read `.claude/skills/` or `.agents/skills/` | most ✅ | spot-check per-agent before relying on advanced fields |

The `install-aidlc-skills.sh` script creates symlinks so each agent finds skills at its expected path while a single source of truth lives at `.aidlc/skills/`. On Windows, the script falls back to junctions or recommends WSL.

---

## 4. Frontmatter conventions (enforced by `lint-skills.py`)

Every AI-DLC wrapper SKILL.md must satisfy:

| Field | Rule |
|-------|------|
| `name` | required; regex `^[a-z][a-z0-9-]{0,63}$`; MUST equal the skill's folder name |
| `description` | required; non-empty; ≤ 1024 chars; describes WHEN to use the skill (this is the trigger) |
| `aidlc:` | optional; if present, must include `sensitive: <bool>`; if `sensitive: true`, must include `blast-radius` and `countersign-required-at` |
| `argument-hint`, `allowed-tools`, etc. | accepted but flagged as Claude-Code-specific (warning, not error) |
| `context: fork` | rejected (warning) — not portable across IDEs in v1 |

Body conventions (linted softly, warnings only):
- Top-level H1 matches the skill name (humanized)
- "When to Use", "What It Does", "Inputs", "Outputs", "Governance" sections present
- "See Also" section links to upstream and to AI-DLC stage rule files

---

## 5. Tier-aware behavior

Skills are passed the active Tier (read from `aidlc-docs/aidlc-state.md § Tier`). Skill bodies SHOULD adjust depth:

- **Greenfield**: full depth (all subroutines, full coverage)
- **Feature**: standard depth (skip nice-to-haves)
- **Bugfix**: minimal (operate only on changed files where possible)

Each wrapper documents its Tier-specific behavior under the "Team Conventions Applied" section.

---

## 6. Authoring & lifecycle

- **Source of truth**: PR review on this repo
- **Author bar**: each AI-DLC wrapper ships with ≥ 5 trigger-test prompts; trigger-accuracy ≥ 80% via `skill-creator` eval (per `AUTHORING.md`)
- **CI lint**: `lint-skills.py` runs on every PR (mandatory)
- **Quarterly safety drill**: pod runs a sensitive skill in a sandbox to confirm signoff flow works (per S10 of the plan)
- **Quarterly trigger-accuracy run**: every wrapper re-eval'd; <80% accuracy = quarantine + revise

---

## 7. Project-local overrides (per S3)

Projects may override a AI-DLC wrapper for project-specific tweaks:

```
<project-root>/.aidlc-overrides/skills/<skill-name>/SKILL.md
```

Inheritance order: project override > AI-DLC wrapper > upstream. Overrides MUST keep the same `name` field; lint applies to overrides too.

---

## 8. Promotions and demotions

- **Honorable-mention skills** (auth0, stripe, supabase, mcp-builder, cloudflare wrangler, huggingface trainer, expo) move from v2 candidates to v1 when ≥ 3 active projects request them
- **Underused skills** (no invocations across the company in 60 days) move to deprecation review at the quarterly retro
- **Promotions from project-local overrides**: per S7, the Production Readiness gate at every project closure asks "Any skill worth promoting to the central library?" — promotions go through normal PR review

---

## 9. Glossary

- **Skill**: an Anthropic-standard SKILL.md package — folder + `SKILL.md` + optional scripts/templates/upstream
- **Wrapper**: a locally-authored SKILL.md that adds team-flavored trigger description + governance metadata on top of a vendored upstream skill
- **Upstream**: the original vendor-maintained skill (Sentry, Vercel, Trail of Bits, etc.) that the AI-DLC wrapper builds on
- **Sensitive**: a skill whose live action has production blast radius; requires per-action signoff
- **Per-action signoff**: short markdown file with two pod signatures + dry-run plan that gates a single sensitive skill action
- **Trigger-accuracy**: the rate at which the agent invokes a skill on prompts that should match it (target ≥ 80%)

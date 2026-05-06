# AI-DLC — Skill Authoring Guide

This guide tells you how to author a new team skill. It blends **Anthropic's `skill-creator` workflow** (draft → eval → iterate) with **skillmatic-ai's progressive-disclosure pattern** (lightweight metadata at boot, body on trigger, resources on demand).

---

## 1. When to author a new skill

Author one when **all** of these are true:

- The need recurs across ≥ 3 projects (not a one-off)
- A clear AI-DLC stage owns its invocation (`inception/` / `construction/` / `operations/` / `extensions/`)
- An upstream skill already exists OR the topic justifies a locally-authored one
- It produces a verifiable artifact (file, report, verdict, diff) — not just chat output

If only some are true, fix that first or defer.

---

## 2. The 6-step authoring flow

### Step 1 — Decide what the skill does and roughly how

Write a one-paragraph "skill spec" before any code or files:

- **Name** (kebab-case, ≤ 64 chars, must match folder name)
- **Trigger description** (one sentence: "Use when …" — this is what makes the agent invoke the skill)
- **Stage(s)** in the AI-DLC where this skill is in scope
- **Inputs** the skill consumes
- **Outputs** the skill produces
- **Tier behavior** (Greenfield / Feature / Bugfix variations)
- **Sensitive?** (yes if production blast radius)

### Step 2 — Vendor the upstream (or skip if locally-authored)

Pick the upstream:
- Hand-curated quality source: [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- Reference examples: [anthropics/skills](https://github.com/anthropics/skills)

For each pick, vendor it under `<skill>/upstream/` using one of:

```bash
# Option A: git submodule (preferred when upstream is a stable repo)
git submodule add <upstream-url> .aidlc/skills/<phase>/<skill>/upstream

# Option B: simple copy (preferred when upstream is a single file/folder inside a larger repo)
gh repo clone <owner>/<repo> /tmp/<repo>
cp -r /tmp/<repo>/<path-to-skill> .aidlc/skills/<phase>/<skill>/upstream
```

For locally-authored skills, skip this step and put scripts/templates directly under the skill folder.

### Step 3 — Draft the wrapper SKILL.md

Use this template:

```yaml
---
name: <kebab-case-name>
description: |
  Use when <specific situation that should trigger>; produces <artifact>; in scope for AI-DLC <stage(s)>.
  Mention key inputs and outputs so the description-match trigger is precise.
aidlc:
  sensitive: <true | false>
  # if sensitive: true:
  blast-radius: <production-deploy | iac-apply | payments | secrets>
  countersign-required-at: per-action-signoff
---

# <Skill Name>

## When to Use (AI-DLC context)
<which AI-DLC stage(s) this fires in; what artifacts it reads/writes; cross-references to ../aidlc-rule-details/*>

## What It Does
<plain-English, ≤ 5 lines>

## Inputs
- <…>

## Outputs
- <relative path to artifact 1>
- <relative path to artifact 2>

## Governance
- **Free-roam invocation**: every call appended to aidlc-docs/audit.md (skill-policy.md § 1)
- **Sensitive flag**: <yes/no>
- **Tier scope**: <Greenfield | Feature | Bugfix | All>

## Team Conventions Applied
- <bullet list of behaviors layered on top of upstream>

## Tier-Specific Behavior
- **Greenfield**: <…>
- **Feature**: <…>
- **Bugfix**: <…>

## See Also
- Upstream skill: `./upstream/SKILL.md`
- AI-DLC stage rule: `../../aidlc-rule-details/<phase>/<stage>.md`
- Compliance hooks: <list of opted-in extensions this skill must respect>

## Trigger-test prompts (for the eval harness)
1. <prompt 1 that SHOULD trigger this skill>
2. <prompt 2 that SHOULD trigger this skill>
3. <prompt 3 that SHOULD trigger this skill>
4. <prompt 4 that should NOT trigger this skill — sanity check>
5. <prompt 5 — edge case>
```

### Step 4 — Run the linter locally

```bash
python3 .aidlc/skills/scripts/lint-skills.py .aidlc/skills/<phase>/<skill>/SKILL.md
```

The linter catches:
- `name` regex violation, length > 64
- `name` ≠ folder basename
- `description` empty or > 1024 chars
- Missing required fields
- Sensitive=true without blast-radius / countersign-required-at
- Claude-specific frontmatter that won't port (warning, not error)

Fix all errors before continuing.

### Step 5 — Run the trigger-accuracy eval

The bar to merge a new skill is **≥ 80% trigger-accuracy** on its 5 test prompts.

(For F1 we ship the linter. The eval harness is part of the `skill-creator` skill from `anthropics/skills` — when authoring becomes routine, vendor that upstream and we'll have the harness available. Until then, the eval is run manually: write the 5 prompts in a sandbox, ask the agent each one, count how many invoked the new skill correctly. Aim for ≥ 4/5.)

### Step 6 — Open a PR

PR description checklist:
- [ ] Skill folder name == `name` field
- [ ] `lint-skills.py` passes
- [ ] 5 trigger-test prompts included (in SKILL.md)
- [ ] Trigger-accuracy run completed with ≥ 80% (paste the result counts in the PR description)
- [ ] If sensitive: signoff template tested in dev environment
- [ ] AI-DLC stage rule(s) updated to reference this skill (if F6 has already shipped — otherwise, deferred to F6)
- [ ] README catalog updated

---

## 3. Wrapper vs upstream — what to put where

| Goes in the wrapper SKILL.md | Goes in upstream/ |
|------------------------------|--------------------|
| team-flavored trigger description | Vendor's instructions verbatim |
| AI-DLC stage references | Vendor's scripts/templates |
| Tier-specific behavior | Vendor's prompts |
| `aidlc:` governance frontmatter | (whatever the vendor packages) |
| Cross-links to aidlc-rule-details/ | — |

**Don't fork upstream content into the wrapper.** If upstream is wrong for the team, document the deviation in "Team Conventions Applied" and override behaviorally — don't edit upstream files (you'll lose updates).

---

## 4. Description writing (the most important sentence)

The `description` field is THE trigger. The agent reads it at boot and uses description-match to decide when to invoke the skill. Bad descriptions silently underuse great skills.

**Good descriptions**:

> "Use when generating React or Next.js code for the team's frontend stack; enforces App Router conventions, server components, caching strategy, and `data-testid` attributes per the construction/stacks/frontend-conventions.md."

> "Use when running the Code Review verdict block at AI-DLC Gate #4 (per construction/code-review.md); aggregates ESLint/Biome/ruff/golangci-lint/dart analyze across detected stacks; produces a unified `<unit>-lint-report.md`."

**Bad descriptions**:

> "Linter." (too vague)
> "Helps with code." (zero signal)
> "Use this for everything frontend related." (over-broad — will fight other skills)

Patterns that work:
- Lead with **"Use when …"**
- Mention the **AI-DLC stage / gate** explicitly
- Name the **artifact** the skill produces
- Name **specific tools / frameworks** the skill knows about

---

## 5. Tier-aware skill design

Skills are invoked with the active Tier from `aidlc-docs/aidlc-state.md § Tier`. Design the body so:

- **Greenfield** ⇒ full depth (all subroutines, full coverage, comprehensive output)
- **Feature** ⇒ standard depth (skip nice-to-haves; focus on the diff and integration impact)
- **Bugfix** ⇒ minimal (operate only on changed files; tests scoped to the fix; no full re-runs)

Document these branches under "Tier-Specific Behavior" in the wrapper.

---

## 6. Sensitive-skill authoring

If your skill has production blast radius, follow this extra checklist:

- [ ] `aidlc.sensitive: true` set in frontmatter
- [ ] `aidlc.blast-radius` set (one of `production-deploy | iac-apply | payments | secrets`)
- [ ] Skill body has **dry-run mode by default** — live mutation requires an explicit `--apply` (or equivalent) flag
- [ ] Skill body refuses to live-mutate without a per-action signoff file path passed in
- [ ] Skill body always emits a `<action>-plan.<ts>.md` artifact regardless of dry-run vs live
- [ ] In `skill-policy.md` § Sensitive Skills, add the skill to the table

The workflow's gate enforcement is handled by `core-workflow.md` (after F6 wires it in) — the skill itself just needs to honor the signoff-required protocol.

---

## 7. Composition with extensions

If your skill is for a project running an opt-in extension, declare the extension in "Compliance hooks":

> Compliance hooks: extensions/security/baseline (when enabled), extensions/ai-ml/lifecycle (when enabled)

Then the skill body checks `aidlc-state.md § Extension Configuration` and applies the relevant rules. Example: `code-generation.md` invokes the FE skill, which checks if Accessibility extension is enabled and applies WCAG rules during generation if so.

---

## 8. Don'ts

- ❌ Skills that wrap a single shell command — use shell directly
- ❌ Skills whose entire body is "Run `<one tool>`" — too thin to justify the indirection
- ❌ Multiple skills competing for the same trigger description — they cannibalize each other
- ❌ Skills that bypass the audit log — the log is the whole control
- ❌ Sensitive skills without dry-run mode — should be impossible by design
- ❌ Wrappers that diverge silently from upstream — document deviations explicitly
- ❌ Embedding secrets / tokens / API keys in skill bodies (loaded from env / secret manager only)

---

## 9. Reference

- `skill-policy.md` — governance, frontmatter rules, sensitive-skill list, per-agent quirks
- `README.md` — current catalog
- [anthropics/skills](https://github.com/anthropics/skills) — canonical SKILL.md examples and `skill-creator`
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) — vendor catalog
- [skillmatic-ai/awesome-agent-skills](https://github.com/skillmatic-ai/awesome-agent-skills) — methodology
- [Anthropic Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)

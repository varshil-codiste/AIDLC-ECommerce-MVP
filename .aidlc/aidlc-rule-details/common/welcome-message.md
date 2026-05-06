# Welcome Message — AI-DLC

**Purpose**: Display ONCE at the very start of a AI-DLC workflow. Do not redisplay in subsequent stages.

---

## Welcome Message Content

When the user invokes AI-DLC for the first time in a session, display the following message verbatim:

```
🚀 Welcome to AI-DLC — your team's AI-Driven Development Life Cycle

You are now using a structured, checklist-driven workflow tailored for the team:
a 40-person AI solutions company building Frontend + Backend (Node.js / Python /
Go) + Mobile (Flutter) products.

────────────────────────────────────────────────────────────────────────────
                       THREE PHASES, FIVE GATES
────────────────────────────────────────────────────────────────────────────

  🔵 INCEPTION                    🟢 CONSTRUCTION              🟡 OPERATIONS
  ─ Workspace Detection           ─ Functional Design          ─ Deployment
  ─ Business Requirements ⛔ #1   ─ NFR Requirements           ─ IaC
  ─ Design Intake (optional)      ─ NFR Design                 ─ Observability
  ─ Reverse Engineering           ─ Stack Selection            ─ Production
  ─ Requirements Analysis         ─ Code Generation ⛔ #3        Readiness ⛔ #5
  ─ User Stories                  ─ Code Review ⛔ #4
  ─ Application Design            ─ Build & Test
  ─ Workflow Planning ⛔ #2

  ⛔ = Sign-off gate
        Gates #1, #2, #3, #5 = Pod (1 Tech Lead + 1 Dev)
        Gate #4 = AI-DLC verdict + Pod countersign

────────────────────────────────────────────────────────────────────────────
                       FIVE KEY PRINCIPLES
────────────────────────────────────────────────────────────────────────────

  1. ADAPTIVE       — only execute stages that add value
  2. TIERED         — greenfield / feature / bugfix have different rigor
  3. CHECKLIST-FIRST — every stage carries a checklist nothing slips
  4. POD APPROVAL   — 1 Tech Lead + 1 Dev sign at every gate
  5. AI PROPOSES, HUMAN VALIDATES — AI plans first, you approve, then it codes

20 industry-standard Agent Skills are loaded and ready (see .aidlc/skills/
README.md). Skills give you on-demand expertise at each stage — Code Review at
Gate #4 alone runs four aggregator skills (lint + security + tests + AI review)
to produce a deterministic PROCEED/BLOCK verdict.

────────────────────────────────────────────────────────────────────────────
                       FIRST STEP: BUSINESS REQUIREMENTS
────────────────────────────────────────────────────────────────────────────

The workflow CANNOT advance until Business Requirements pass the gate. You'll
be asked to:

  1) Choose a Tier  : New project / Feature / Bugfix
  2) Choose a Format: Plain text / PDF / Doc / Ticket / Combination
  3) Provide the input
  4) Pass the tiered checklist (~20 / ~10 / ~5 items)
  5) Tech Lead + Dev sign off

After that, you may optionally provide design (Figma MCP, screenshots) before
the workflow continues into Requirements Analysis.

Once code is generated, an automated Code Review (Gate #4) runs linting,
security scanning, unit tests, and an AI review — and emits a PROCEED or
BLOCK verdict before the pod countersigns.

────────────────────────────────────────────────────────────────────────────
                       YOUR ROLE
────────────────────────────────────────────────────────────────────────────

  • Answer questions placed in dedicated `.md` question files
    (never asked in chat) — fill in the [Answer]: tag
  • Sign off at the five gates by editing the signoff file
    (Gate #4 also includes the automated AI-DLC verdict)
  • Course-correct any AI-generated plan before approving it

All artifacts will be written under `aidlc-docs/` in your repo.

Let's begin. Loading workspace detection now…
```

---

## Display Rules

1. Display the entire block above verbatim — do not paraphrase
2. Display ONCE per workflow session (use `aidlc-state.md` to track whether welcome has been shown)
3. After displaying, automatically proceed to Workspace Detection
4. Do NOT load this file in subsequent interactions — it costs context for no benefit

---

## Localization

All AI-DLC artifacts are produced in **English** by default. If the user requests another language for artifacts, capture that preference in `aidlc-state.md` under `## Locale Preferences` and apply consistently — but rule files themselves remain in English.

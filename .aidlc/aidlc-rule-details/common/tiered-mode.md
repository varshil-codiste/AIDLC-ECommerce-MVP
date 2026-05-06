# Tiered Mode

**Purpose**: Define the three Tiers (greenfield / feature / bugfix) that drive checklist size, stage selection, and depth throughout AI-DLC.

---

## Why Tiers

A new product needs full requirements rigor. A bug fix does not. AI-DLC adapts the level of ceremony to the kind of work — without removing the safety rails entirely.

| Tier | Typical scope | Time horizon | Approvers |
|------|---------------|--------------|-----------|
| **Greenfield** | New product, new repo, new domain | Weeks to months | Tech Lead + Dev (and stakeholders out-of-band) |
| **Feature** | New capability on an existing product | Days to weeks | Tech Lead + Dev |
| **Bugfix** | Defect repair, hotfix, patch | Hours to days | Tech Lead + Dev (Tech Lead alone for severity-1 hotfix is allowed if recorded) |

---

## Tier Detection

Tier is set by the user in the first question of `inception/business-requirements.md`:

```
Question 1: What kind of work are we starting?

A) New project / new product (Greenfield)
B) New feature on an existing product
C) Bug fix / patch / hotfix
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

The selected Tier is stored in `aidlc-docs/inception/business-requirements/tier.md` AND in `aidlc-docs/aidlc-state.md` under `## Tier`. ALL downstream rule files MUST read the Tier from state and adjust behavior.

---

## Tier × Behavior Matrix

| Behavior | Greenfield | Feature | Bugfix |
|----------|-----------|---------|--------|
| BR checklist size | ~20 items | ~10 items | ~5 items |
| Design Intake offered | Yes | Yes | Optional, default skip |
| Reverse Engineering | Run if brownfield | Run if brownfield | Run only if root cause is unknown |
| User Stories | Yes (default) | Yes | Skip |
| Application Design | Yes | Yes if architecture is touched | Skip |
| Units Generation | Yes if multi-service | Rarely | Skip |
| Per-unit construction loop | Full | Full | Single-file or single-component change |
| NFR Requirements | Comprehensive | Standard | Skip unless NFR regression |
| NFR Design | Standard or Comprehensive | Standard if NFR Requirements ran | Skip |
| Stack Selection | Per UoW | Per affected UoW | Use existing stack — skip selection |
| Code Generation depth | Comprehensive plan | Standard plan | Minimal plan (often a single function/file change) |
| Code Review (per UoW) | Full lint + security + tests + AI review | Full lint + security + tests + AI review | Same checks; tests scoped to fix + regression |
| Build & Test scope | Full suite + perf + integration | Full unit + integration | Regression test for the fix + impacted tests |
| Operations stages | All four | Deployment + Observability if changed | Deployment only if hotfix release |
| Approval gate strictness | All 5 gates required | All 5 gates required | Gates 1 + 3 + 4 required; Gates 2 + 5 may be light-form |

---

## "Light-form" sign-off (Bugfix-only convenience)

For bugfix tier, Gate #2 (Workflow Plan) and Gate #5 (Production Readiness) may be combined into a single line in the BR signoff file when the fix is genuinely small:

```
- [x] Tech Lead acknowledges this bugfix bypasses Gate #2 / Gate #5 due to scope.
      Reason: <one-line justification>
      Tech Lead: <name>  Date: <ISO date>
```

This is NOT permitted for greenfield or feature tiers. Gates #1, #3, and #4 are NEVER skippable regardless of Tier — Gate #4's AI-DLC verdict is non-negotiable because lint/security/tests must always run on generated code.

---

## Tier Escalation

If during the workflow the AI or pod realizes the chosen Tier is wrong (e.g., a "bugfix" turns out to require a refactor across three services), the AI MUST:

1. Pause the current stage
2. Create `aidlc-docs/inception/business-requirements/tier-escalation-questions.md` proposing the new Tier with rationale
3. Wait for the pod to confirm escalation
4. Update `tier.md` and `aidlc-state.md`
5. Re-run BR Intake at the new Tier's checklist size (preserving any items already gathered)

---

## Anti-patterns

- ❌ Choosing "bugfix" to avoid the BR checklist when the work is clearly a feature
- ❌ Skipping Tier detection and "just starting" — Tier is mandatory
- ❌ Mid-workflow Tier change without rerunning the BR checklist
- ❌ Marking a feature as bugfix to skip Gate #2 / Gate #4

The pod is responsible for honest Tier classification.

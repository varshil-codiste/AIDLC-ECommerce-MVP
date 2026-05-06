# Pod Ritual

**Purpose**: Define how the lightweight the pod (1 Tech Lead + 1 Dev) collaborates with the AI through the workflow. This replaces AWS AI-DLC's whole-team "Mob Elaboration" / "Mob Construction" rituals — the pod is intentionally small for full-team mobs.

---

## The Pod

Every project running AI-DLC has a **Pod** of exactly two named humans:

| Role | Responsibility |
|------|----------------|
| **Tech Lead** | Architectural decisions, NFR decisions, framework selection, security/compliance trade-offs, sign-off at all four gates |
| **Dev** | Implementation choices, test coverage, code-level concerns, sign-off at all four gates |

A third role — **Stakeholder** (PM, designer, founder, customer) — is **out-of-band**: their input is captured into Business Requirements, but they do not sign gate files. The Tech Lead is responsible for representing the stakeholder's intent inside the pod.

---

## When the Pod Engages

The pod engages **at gates and on demand**, not continuously. The AI does most of the routine work autonomously between gates.

### At Gates (mandatory)

| Gate | Pod activity |
|------|--------------|
| Gate #1 — Business Requirements | Both members review BR + checklist; both sign |
| Gate #2 — Workflow Plan | Both members review execution plan + Mermaid; both sign |
| Gate #3 — Code Generation (per UoW) | Both members review codegen plan; both sign before AI writes code |
| Gate #4 — Production Readiness | Both members review readiness checklist + runbook; both sign |

### Between Gates (on demand)

The AI MAY ping the pod via a question file when:
- It detects ambiguity it cannot resolve from prior artifacts
- It encounters an architectural fork the user did not anticipate
- An extension rule blocks completion (e.g., a security rule cannot be satisfied without a stakeholder decision)

The AI MUST NOT escalate trivial issues to the pod — it should attempt to resolve them via existing rules and depth-level guidance first.

---

## Sync vs Async Sign-off

AI-DLC is **async-first**. The pod does NOT need to meet live to sign a gate. Acceptable sign-off mechanisms:

1. **In-file signature**: Edit the signoff `.md` file, fill in name + ISO date
2. **Commit message**: A commit that includes `aidlc-signoff: <gate-id> by <name>` references the signoff file
3. **PR review approval**: A PR comment with `aidlc-signoff: <gate-id>` and the reviewer is mapped to Tech Lead or Dev
4. **External tool**: Slack approval, Linear comment, Notion sign-off — recorded by pasting the URL into the signoff file

The signoff file MUST end up containing two named signatures with ISO dates regardless of the channel.

---

## Pod Roster File

At workflow start, after Workspace Detection, the AI creates `aidlc-docs/pod.md`:

```markdown
# Project Pod

**Project**: <project name>
**Pod established**: <ISO date>

## Roles

| Role | Name | Email / Handle | Notes |
|------|------|----------------|-------|
| Tech Lead | <name> | <email> | <optional> |
| Dev | <name> | <email> | <optional> |
| Stakeholder (out-of-band) | <name> | <email> | Not a signer |

## Substitutes

If a primary signer is unavailable, the substitute below may sign:

| Role | Substitute name | Authorization scope |
|------|-----------------|---------------------|
| Tech Lead | <name> | <which gates the substitute may sign> |
| Dev | <name> | <which gates the substitute may sign> |

## Severity-1 Hotfix Exception

For Tier=Bugfix marked severity-1 (production down), the Tech Lead alone may sign Gate #1 and Gate #3, with the Dev signature added retroactively within 24 hours. This exception is logged in audit.md.
```

The AI MUST refuse to advance any gate if the corresponding signer's name is not in `pod.md`.

---

## Conflict Resolution

If the Tech Lead and Dev disagree at a gate (one signs, one objects):

1. The objecting signer does NOT sign
2. The objecting signer writes their objection inline in the signoff file under `## Objection`
3. The AI pauses the workflow
4. The pod resolves out-of-band; one option is to escalate to the Stakeholder
5. Resolution is recorded in `## Resolution` and both signers re-affirm

The AI never auto-resolves a pod conflict.

---

## Substitution Rules

If a primary signer is on leave, the **substitute** named in `pod.md` may sign in their stead, but the substitution must be recorded:

```markdown
- [x] Tech Lead (substitute): <name>, signing for <primary name> (out: <reason>)  Date: <ISO>
```

Without this annotation, the substitute signature is invalid.

---

## Anti-patterns

- ❌ AI proceeding past a gate without two signatures (one is never enough except documented severity-1)
- ❌ Same person signing both Tech Lead and Dev rows
- ❌ Stakeholder signing a gate (they're out-of-band)
- ❌ A signature without an ISO date
- ❌ A signature pasted from chat instead of recorded in the signoff file

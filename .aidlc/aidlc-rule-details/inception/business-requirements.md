# Business Requirements Intake

**Stage**: 1 (always-execute, hard gate)
**Gate**: Gate #1 (pod sign-off)
**Purpose**: Capture *why* this work is being done before any design or code happens. Set the Tier (greenfield / feature / bugfix) that drives the rest of the workflow. Refuse to advance until the input is concrete and the tiered checklist passes.

**Skills invoked at this stage**: `product-discovery` (Greenfield + Feature Tiers, after Step 3 sources are ingested) — surfaces gap questions, stakeholder map, and assumptions log before the tiered checklist runs at Step 4. See `.aidlc/skills/inception/product-discovery/SKILL.md`.

---

## Why This Stage Exists

AWS AI-DLC starts with Requirements Analysis — but in practice users arrive with raw business context (a brief, a Slack thread, a PDF, a Figma link, a Jira ticket). AI-DLC inserts a dedicated **Business Requirements Intake** stage so:

1. Whatever the user has — text / PDF / Doc / ticket — gets ingested and converted to markdown
2. The Tier is set explicitly (driving every downstream stage's depth and scope)
3. A tiered checklist guarantees nothing critical is forgotten before design begins
4. Gate #1 produces a written sign-off the pod can audit later

**This stage is mandatory. The workflow cannot advance without passing it.**

---

## Prerequisites

- Workspace Detection complete (`aidlc-state.md` exists)
- `pod.md` exists (names may be empty — Step 8 will refuse to advance until they are filled)

---

## Execution Steps

### Step 1: Tier Detection

Create `aidlc-docs/inception/business-requirements/tier-detection-questions.md`:

```markdown
# Tier Detection Questions

The Tier you select drives the size of the Business Requirements checklist
and which downstream stages run. See `common/tiered-mode.md`.

## Question 1
What kind of work are we starting?

A) New project / new product (Greenfield)
B) New feature on an existing product (Feature)
C) Bug fix / patch / hotfix (Bugfix)
X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2 (Bugfix only — skip if you answered A or B above)
Is this bugfix flagged severity-1 (production down or critical incident)?

A) Yes — severity-1 hotfix
B) No — standard defect
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

After the user answers:
- Validate per `common/question-format-guide.md` (no contradictions; clear tier)
- If `Other` was used and the description doesn't clearly resolve to one of the three tiers, generate a clarification file and stop
- Write the resolved Tier to `aidlc-docs/inception/business-requirements/tier.md`:

```markdown
# Tier

**Tier**: <Greenfield | Feature | Bugfix>
**Severity-1 hotfix**: <Yes | No | N/A>
**Set at**: <ISO timestamp>
**Set by**: Business Requirements Intake — Step 1
```

- Update `aidlc-state.md` `## Tier` section accordingly
- Log the answer in `audit.md`

---

### Step 2: Input Format Detection

Create `aidlc-docs/inception/business-requirements/input-format-questions.md`:

```markdown
# Business Requirements — Input Format

You can provide the business requirements in any combination of these formats.
The AI will convert everything to markdown into the `sources/` folder.

## Question 1
Which of the following will you provide? (Select all that apply by listing letters)

A) Plain text — typed or pasted in chat
B) PDF document(s)
C) Word / Google Doc(s) (.docx)
D) Ticket reference (Jira / Linear / ClickUp / Notion / GitHub Issue)
E) Combination of the above
F) None — I have nothing yet
X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2 (only if you selected D)
Provide the URL or ID for each ticket on its own line.

[Answer]:

## Question 3 (only if you selected B or C)
After you have placed the file(s) in your workspace, list the relative paths
inside the aidlc-docs/inception/business-requirements/sources/uploads/
folder (one per line). The AI will read them from there.

[Answer]:
```

**Critical handling rules**:
- **If the user answers F (None)**: refuse to advance. AI-DLC requires *some* input. Re-prompt with a one-line explanation: "Business Requirements Intake is mandatory — please share at least a paragraph of intent in plain text before we proceed."
- **If the user answers X with vague text** (e.g. "we'll figure it out"): refuse to advance.
- **If a referenced PDF/Doc cannot be read**: see `common/error-handling.md` § Business Requirements Intake errors.
- **If a ticket URL is private** (Jira/Linear/Notion behind auth): ask the user to either (a) configure the matching MCP server, or (b) paste the ticket content as plain text under option A.

---

### Step 3: Ingest and Convert Sources

Create the directory `aidlc-docs/inception/business-requirements/sources/`. For each input:

| Input | Ingestion |
|-------|-----------|
| Plain text | Save verbatim as `sources/source-001-text.md` |
| PDF | Extract text + structure to `sources/source-002-<filename>.md`; preserve headings; note any unparseable pages |
| Doc / .docx | Extract text + structure to `sources/source-003-<filename>.md` |
| Ticket URL | Fetch via available MCP server if configured; if not, ask the user to paste the ticket content; save as `sources/source-004-<ticket-id>.md` |
| Figma link | NOT handled here — Stage 2 (Design Intake) handles design |

Create a manifest at `aidlc-docs/inception/business-requirements/sources/manifest.md`:

```markdown
# Sources Manifest

| # | Original | Format | Saved as | Ingested at | Notes |
|---|----------|--------|----------|-------------|-------|
| 1 | Plain text in chat | text | source-001-text.md | <ISO> | — |
| 2 | brief.pdf | PDF | source-002-brief.md | <ISO> | 2 of 14 pages had OCR issues — flagged |
| ... | ... | ... | ... | ... | ... |
```

Log each ingestion in `audit.md` with timestamp + bytes ingested.

---

### Step 4: Generate the Tiered Checklist

Based on Tier, generate `aidlc-docs/inception/business-requirements/business-requirements-checklist.md` from the matching template below. The AI MUST pre-fill known items from the ingested sources (mark `[x]` for items the sources clearly satisfy) and leave unknown items as `[ ]`.

Use the universal checklist format from `common/checklist-conventions.md`. Add the modification log table.

#### Greenfield Checklist (~20 items, three sections)

**Section A — Problem & Outcome**
- [ ] Problem statement — what problem are we solving and for whom?
- [ ] Target users / personas — who experiences this product?
- [ ] Success metrics — how will we know we succeeded? (numeric where possible)
- [ ] Out-of-scope items — what we explicitly will NOT build in v1
- [ ] Business goals — revenue / growth / retention / brand / strategic

**Section B — Constraints & Context**
- [ ] Target platforms — Web / Mobile / Both / Other
- [ ] Expected scale — DAU / MAU / QPS / data volume estimate
- [ ] Budget range — order of magnitude (helps select tools/cloud)
- [ ] Timeline — milestones, hard deadlines
- [ ] Stakeholders — who approves what (often informs `pod.md`)
- [ ] Regulatory / compliance — GDPR / HIPAA / SOC 2 / PCI / other / none
- [ ] External integrations — payment, email, SMS, third-party APIs, AI providers
- [ ] Data classification — what kinds of data, sensitivity level
- [ ] Launch markets / locales — geography + language requirements
- [ ] Monetization model — free, subscription, ads, B2B contract, mixed

**Section C — AI-product specifics**
- [ ] AI/ML usage scope — does this product use LLMs / RAG / classifiers / none?
- [ ] Data retention policy — how long do we keep user data, training data, logs?
- [ ] Brand assets availability — logo, colors, fonts ready or to be designed?
- [ ] Existing IP / open-source dependencies — anything to inherit or avoid?
- [ ] Accessibility commitment — WCAG 2.2 AA target? other?
- [ ] Legal review status — privacy policy, terms-of-service plan

Total ≈ 20 items.

#### Feature Checklist (~10 items, two sections)

**Section A — Feature definition**
- [ ] Feature title (one line)
- [ ] Linked epic / parent product area
- [ ] Target persona — which existing user benefits?
- [ ] User value statement — "As a <persona>, I want <X> so that <Y>"
- [ ] Success metric — quantifiable measure of feature adoption / impact
- [ ] Scope boundaries — what's in v1 of this feature, what's deferred

**Section B — Integration & rollout**
- [ ] Existing components affected — which UoWs / services / FE areas
- [ ] Backwards-compatibility requirements — API contract, schema, behavior
- [ ] Feature flag plan — gated rollout, kill-switch, A/B?
- [ ] Rollout plan — internal → beta → GA, dates

Total ≈ 10 items.

#### Bugfix Checklist (~5 items)

- [ ] Bug description — observed behavior vs expected
- [ ] Reproduction steps — exact, reliable, environment-specific
- [ ] Severity / priority — sev-1 / sev-2 / sev-3, with justification
- [ ] Affected versions — which builds / branches / customers
- [ ] Regression risk areas — adjacent code/features the fix could destabilize

Total ≈ 5 items.

---

### Step 5: Hard Gate — Resolve Every Checklist Item

For each `[ ]` item, the AI MUST gather the answer. Allowed approaches:

1. **Source mining** — re-scan ingested sources for the answer; if found, mark `[x]` with a citation `(see sources/source-002-brief.md § "Goals")`
2. **Targeted question file** — generate `business-requirements-followup-questions.md` containing only the unresolved items, formatted per `common/question-format-guide.md`. The AI must NOT auto-mark `[x]` based on the followup file before the user actually answers
3. **N/A with reason** — pod can mark an item `[~] N/A: <specific reason>` if it genuinely doesn't apply (e.g. "PCI N/A — no payment processing"). Reasons must pass `common/checklist-conventions.md` quality rules

**Loop until** every checklist item is `[x]` or `[~]`. The AI cannot advance with any `[ ]` items remaining.

If after 3 rounds of follow-up questions the user is still unable or unwilling to answer items, the AI:
- Lists the unresolved items in `business-requirements-followup-questions.md` under `## Outstanding`
- Stops the workflow
- Asks the user to either (a) provide the missing information, (b) mark them N/A with reasons, or (c) declare they are intentionally deferring (in which case the items become `[~] N/A: deferred — must revisit at <stage>`)

---

### Step 6: Generate `business-requirements.md`

Once all checklist items are resolved, synthesize a single canonical `business-requirements.md` from the ingested sources + checklist. Structure:

```markdown
# Business Requirements

**Project**: <name>
**Tier**: <Greenfield | Feature | Bugfix>
**Created**: <ISO>
**Sources**: see `sources/manifest.md`

## 1. Problem & Outcome
<Tier-A content>

## 2. Constraints & Context
<Tier-B content>

## 3. AI-product specifics
<Tier-C content — Greenfield only>

## 4. Cross-Reference Matrix
| Requirement / item | Source citation |
|--------------------|-----------------|
| Problem statement | source-001-text.md § "Why" |
| Target users | source-002-brief.md § "Audience" |
| ... | ... |

## 5. Open Questions Carried Forward
<Items the pod accepted as deferred — pod must revisit at the named stage>
```

For Feature and Bugfix tiers, sections 1 and 2 are smaller and section 3 is omitted (Feature) or entirely replaced with the bugfix template (Bugfix).

---

### Step 7: Validate `pod.md`

Before generating the signoff template, ensure `pod.md`:
- Has a non-empty Tech Lead name
- Has a non-empty Dev name
- For severity-1 bugfix only: Tech Lead alone is sufficient if the `## Severity-1 Hotfix Exception` section is enabled

If names are missing, generate `pod-roster-questions.md` requesting Tech Lead and Dev names + emails. Do NOT advance to Step 8 until `pod.md` is complete.

---

### Step 8: Generate Gate #1 Signoff Template

Generate `aidlc-docs/inception/business-requirements/business-requirements-signoff.md` using the universal template from `common/approval-gates.md` § Gate #1.

Pre-fill:
- "What Is Being Approved" — one-paragraph summary of the BR
- "Artifacts Referenced" — list every file in `business-requirements/`
- "Compliance Summary" — empty for Gate #1 (extensions opt-in happens later in Stage 4)
- "Open Risks / Caveats" — list any deferred checklist items, sources flagged with parsing issues, etc.

Inform the user:

```
"I've prepared business-requirements-signoff.md (Gate #1).

Tech Lead and Dev — please review:
  - business-requirements.md (the synthesized BR)
  - business-requirements-checklist.md (every item resolved)
  - sources/manifest.md (what was ingested)

Then sign by ticking your line and adding your name + ISO date.
Async sign-off (PR / commit / Slack URL pasted into the file) is fine.

I'll resume automatically once both signatures are recorded."
```

---

### Step 9: Wait for Both Signatures

The AI polls / re-checks `business-requirements-signoff.md` whenever the user indicates progress (e.g., "signed", "ready", "go"). On each check, validate per `common/approval-gates.md` § Validation Rules:

1. Both signature lines `[x]`
2. Both names match entries in `pod.md` (or registered substitutes)
3. Both dates are valid ISO 8601 within the last 30 days
4. No unresolved `## Objection` section

If validation fails: log the specific failure in `audit.md` and inform the user which check failed. Do NOT advance.

---

### Step 10: Update State and Proceed

Once Gate #1 passes:

1. Update `aidlc-state.md`:

```markdown
## Stage Status
| # | Stage | Status |
|---|-------|--------|
| 0 | Workspace Detection | COMPLETE |
| 1 | Business Requirements Intake | COMPLETE |
| 2 | Design Intake | PENDING |

## Tier
<Greenfield | Feature | Bugfix>
**Set at**: <ISO>
```

2. Log Gate #1 pass in `audit.md` with both signers' names + dates.

3. Present the standardized 2-option completion message:

```markdown
# Business Requirements Intake — Complete ✅

- **Tier**: <Greenfield | Feature | Bugfix>
- **Sources ingested**: <count>
- **Checklist**: <X/X items resolved>
- **Gate #1**: signed by <Tech Lead name> and <Dev name>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes** — request edits to business-requirements.md before proceeding
> ✅ **Continue to Next Stage** — proceed to Design Intake (optional)
```

Wait for the user's choice. If "Continue", invoke `inception/design-intake.md`. If "Request Changes", run the appropriate workflow change per `common/workflow-changes.md`.

---

## Tier Escalation During This Stage

If during Step 4–5 the AI realizes the chosen Tier is wrong (e.g., the user picked "Bugfix" but the checklist reveals architectural impact across three services), the AI:

1. Pauses
2. Creates `business-requirements/tier-escalation-questions.md` proposing the new Tier with rationale
3. Waits for the pod to confirm
4. If escalated: updates `tier.md` + state file, swaps to the new Tier's checklist (preserving items already filled), and resumes from Step 4

See `common/tiered-mode.md` § Tier Escalation.

---

## Stage Checklist

The stage's own checklist (`workspace-detection-checklist.md` was for Stage 0; this one is `business-requirements-intake-checklist.md`):

```markdown
# Business Requirements Intake — Stage Checklist

- [ ] Tier detected and recorded in tier.md
- [ ] Input format identified (≥ 1 source)
- [ ] All sources ingested into sources/ with manifest
- [ ] Tiered checklist generated and matches Tier
- [ ] Every checklist item resolved ([x] or [~] N/A)
- [ ] business-requirements.md synthesized
- [ ] pod.md has Tech Lead and Dev names
- [ ] Gate #1 signoff template generated
- [ ] Gate #1 signed by Tech Lead and Dev
- [ ] aidlc-state.md updated to STAGE 1: COMPLETE
- [ ] audit.md updated with all interactions
```

This stage's checklist must reach all `[x]` or `[~]` before completion message is shown.

---

## Anti-patterns

- ❌ Advancing without a real input — the user MUST provide something
- ❌ Auto-marking checklist items `[x]` from inferred answers without a citation
- ❌ Accepting "we'll figure it out later" as an answer — push for either a definite answer, an N/A with reason, or a deferred-with-revisit-stage commitment
- ❌ Letting Greenfield projects pass with the Bugfix checklist
- ❌ Generating Gate #1 signoff before `pod.md` has names
- ❌ Pod signing before checklist is fully resolved

# Mid-Workflow Changes

**Purpose**: Handle pod requests to add, skip, restart, or restructure stages once the workflow is in progress.

---

## Types of Mid-Workflow Changes

### 1. Adding a Skipped Stage

**Example**: pod wants to add User Stories after they were originally skipped.

**Process**:
1. Confirm in a question file: "You want to add User Stories. This will create stories and personas. Confirm?"
2. Check dependencies: ensure all prerequisite stages are complete
3. Update `execution-plan.md` with the new stage and rationale
4. Mark the stage PENDING in `aidlc-state.md`
5. Execute the stage normally
6. Log the change in `audit.md`

**Considerations**:
- Existing artifacts downstream may need revision
- Timeline extends
- If the stage was originally skipped because the BR Tier was Bugfix, escalate the Tier first

### 2. Skipping a Planned Stage

**Example**: pod wants to skip NFR Design.

**Process**:
1. Confirm: "Skipping NFR Design means no NFR patterns or logical components will be incorporated. Confirm?"
2. Warn about consequences (e.g., later Code Generation cannot reference patterns that don't exist)
3. Get explicit confirmation in writing
4. Mark stage SKIPPED in state file with reason
5. Adjust later stages to handle the gap (manual setup may be required)
6. Log change

**Note**: Some stages cannot be skipped regardless of pod request:
- Workspace Detection
- Business Requirements Intake
- Requirements Analysis
- Workflow Planning (and Gate #2)
- Stack Selection (per UoW)
- Code Generation (per UoW) (and Gate #3)
- Code Review (per UoW) (and Gate #4) — the AI-DLC verdict is mandatory; lint/security/tests must always run on generated code
- Production Readiness (and Gate #5)

If the pod requests skipping any of these, refuse and explain that they are mandatory.

### 3. Restarting Current Stage

**Example**: pod is unhappy with the User Stories produced.

**Process**:
1. Ask what specifically should change ("Modify existing artifacts" vs "Complete restart")
2. If restart:
   - Archive existing artifacts: `<artifact>.backup.<ISO timestamp>`
   - Reset stage checkboxes
   - Mark stage IN PROGRESS in state file
3. Re-execute from beginning
4. Log change

### 4. Restarting a Previous Stage

**Example**: pod wants to change an architectural decision after Code Generation has started for some units.

**Process**:
1. Identify all dependent stages
2. Warn explicitly: "Restarting Application Design will require redoing: Units Generation, per-unit design (all units), Code Generation. Confirm?"
3. Get explicit pod confirmation
4. Archive ALL affected artifacts
5. Reset all affected stages
6. **Invalidate downstream signoffs** — Gates #2, #3 (per affected unit), and #4 must be re-signed
7. Re-execute from the restarted stage
8. Log change

### 5. Changing Stage Depth

**Example**: pod wants Requirements Analysis at Comprehensive instead of Standard.

**Process**:
1. Confirm: "Comprehensive depth produces more detailed artifacts but takes longer. Confirm?"
2. Update execution plan
3. Adjust approach per `depth-levels.md`
4. Communicate new timeline estimate
5. Log change

Depth can only be changed before or during the stage, not after completion (use restart instead).

### 6. Pausing the Workflow

**Process**:
1. Finish the current step in progress if possible
2. Update checkboxes for any completed steps
3. Ensure `aidlc-state.md` reflects current status
4. Log pause in `audit.md`
5. Provide resume guidance: "When you return, I'll detect your existing project and offer to continue from <stage>:<step>"

**On resume**: see `session-continuity.md`.

### 7. Changing Architectural Decision

**Example**: pod wants to switch from monolith to microservices after Application Design.

**Process**:
1. Assess current progress and impact
2. Explain consequences:
   - Before Units Generation: minimal impact
   - After Units Generation: redo Units Generation + per-unit design
   - After Code Generation: significant rework
3. Recommend approach (restart from Application Design vs incremental modification)
4. Get explicit confirmation
5. Execute restart procedure for affected stages

### 8. Adding / Removing Units

**Example**: pod wants to split the Payment unit into Payment + Billing.

**Process**:
1. Identify which units have completed design / code
2. Explain consequences:
   - Adding unit: full design + code for new unit
   - Removing unit: redistribute functionality
   - Splitting unit: re-do design + code for both
3. Update unit artifacts: `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`
4. Reset affected units
5. Invalidate Gate #3 signoffs for affected units
6. Execute changes per affected unit

### 9. Tier Change

If the pod realizes the Tier was wrong (most common: "this is not a bugfix"):

1. Run Tier escalation per `tiered-mode.md`
2. Re-run BR checklist at the new Tier's size (preserving prior items)
3. Re-evaluate which stages should run
4. **Invalidate Gate #1 signoff** — must be re-signed at the new Tier
5. Update state file

### 10. Pod Member Change

If a Tech Lead or Dev becomes unavailable mid-workflow:

1. Update `pod.md` with the new primary signer or registered substitute
2. New signers cover signoffs from this point forward
3. Past signoffs remain valid (signed by the prior pod)
4. Log change in `audit.md`

---

## General Guidelines

### Before Making Changes
- Understand the request — ask clarifying questions
- Assess impact — identify all affected stages, artifacts, dependencies, and signoffs
- Explain consequences clearly
- Offer alternatives — sometimes modify is better than restart
- Get explicit confirmation in writing

### During Changes
- Archive existing work before destructive changes
- Update all tracking files (state, plans, audit)
- Communicate progress
- Validate consistency
- Test continuity — verify workflow can continue smoothly

### After Changes
- Verify consistency
- Update documentation
- Log completely in `audit.md`
- Confirm with pod
- Resume normal execution

---

## Decision Tree

```
User requests change
    |
    +- Is it the current stage?
    |     +- Yes: modify or restart current stage
    |     +- No: continue
    |
    +- Is it a completed stage?
    |     +- Yes: assess impact on dependents
    |     |     +- Low impact: modify and update dependents
    |     |     +- High impact: recommend restart from that stage; invalidate signoffs
    |     +- No: continue
    |
    +- Is it adding a skipped stage?
    |     +- Yes: check prerequisites, add to plan, execute
    |     +- No: continue
    |
    +- Is it skipping a planned stage?
    |     +- Yes: check whether stage is mandatory; if not, warn + confirm + skip
    |     +- No: continue
    |
    +- Is it changing depth?
    |     +- Yes: update plan, adjust approach
    |     +- No: clarify request with user
```

---

## Logging Format

```markdown
## Change Request — <Stage Name>
**Timestamp**: <ISO>
**Request**: <what user wants to change>
**Current State**: <where in workflow>
**Impact Assessment**: <what is affected, including which signoffs invalidate>
**User Confirmation**: <explicit confirmation>
**Action Taken**: <what was done>
**Artifacts Affected**: <list>
**Signoffs Invalidated**: <list, if any>

---
```

---

## Best Practices

1. Never make destructive changes without explicit user confirmation
2. Explain impact before deciding
3. Offer options
4. Archive first
5. Update everything (state, plans, audit, signoffs)
6. Log thoroughly
7. Validate after
8. Be flexible — workflow adapts to pod needs, not the reverse

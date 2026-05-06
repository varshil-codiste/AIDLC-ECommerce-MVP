# Error Handling and Recovery

## General Principles

When an error occurs:
1. **Identify** — clearly state what went wrong
2. **Assess impact** — blocking or workaround-able?
3. **Communicate** — inform the user
4. **Offer solutions** — provide clear resolution steps
5. **Document** — log the error and resolution in `audit.md`

---

## Severity Levels

| Severity | Meaning |
|----------|---------|
| **Critical** | Workflow cannot continue (missing required files, invalid input that can't be processed, file system errors) |
| **High** | Stage cannot complete as planned (incomplete answers, contradictory responses, missing dependencies) |
| **Medium** | Stage continues with workarounds (optional artifacts missing, non-critical validation failures) |
| **Low** | Minor issues (formatting inconsistencies, optional info missing, non-blocking warnings) |

---

## Stage-Specific Error Handling

### Workspace Detection

| Error | Cause | Resolution |
|-------|-------|-----------|
| Cannot read workspace files | Permissions, missing dirs | Ask user to verify path / permissions |
| `aidlc-state.md` corrupted | Manual edit, interrupted run | Backup, ask user to start fresh or attempt repair |
| Cannot determine project type | Insufficient info | Ask clarifying questions |

### Business Requirements Intake

| Error | Cause | Resolution |
|-------|-------|-----------|
| User has nothing to provide | Premature start | Refuse to advance — BR is mandatory |
| PDF / Doc cannot be parsed | Corrupted, unsupported | Ask for re-upload or alternative format |
| Tier and scope contradict | Mismatched answers | Run Tier Escalation per `tiered-mode.md` |
| Required checklist item unanswered | Partial input | Cannot pass Gate #1 — re-prompt for the specific item |

### Design Intake

| Error | Cause | Resolution |
|-------|-------|-----------|
| Figma MCP not configured | MCP server not installed | Ask user to install or fall back to screenshots |
| Figma frames empty | Wrong file URL | Ask for correct URL or screenshots |
| Screenshots ambiguous | Low resolution, partial coverage | Ask for additional screenshots |

### Reverse Engineering (brownfield)

| Error | Cause | Resolution |
|-------|-------|-----------|
| Cannot identify build system | Unconventional layout | Ask user to point to build files |
| Mixed-language codebase confusion | Multiple stacks | Process each stack separately and merge in `architecture.md` |

### Requirements Analysis

| Error | Cause | Resolution |
|-------|-------|-----------|
| Contradictory requirements | Unclear understanding | Create clarification file; do not proceed |
| Doc cannot be converted | Format issue | Ask for alternative format |
| Verification questions unanswered | User skipped | Highlight unanswered questions; do not proceed |

### User Stories

| Error | Cause | Resolution |
|-------|-------|-----------|
| Cannot map requirements to stories | Vague requirements | Return to Requirements Analysis |
| Ambiguous planning answers | Unclear options | Add follow-up questions |

### Application Design

| Error | Cause | Resolution |
|-------|-------|-----------|
| Architectural decision unclear | Conflicting requirements | Add follow-up questions; do not proceed |
| Cannot determine number of services | Insufficient boundary info | Ask about deployment, team structure, scaling |

### Workflow Planning

| Error | Cause | Resolution |
|-------|-------|-----------|
| Cannot decide which stages to run | Tier vs content mismatch | Default to Tier baseline, ask pod to confirm |
| Mermaid won't parse | Special chars | Use text alternative |

### Per-Unit Construction Loop

| Error | Cause | Resolution |
|-------|-------|-----------|
| Circular unit dependency | Poor boundary definition | Re-do Units Generation |
| Stack incompatible with NFR | Wrong framework choice | Re-run Stack Selection |
| Gate #3 signoff stale (>30 days) | Long pause | Re-sign before proceeding |

### Code Generation

| Error | Cause | Resolution |
|-------|-------|-----------|
| Cannot generate code for a step | Insufficient design info | Skip step, document gap, return after gathering info |
| Generated code has syntax errors | Template issues | Fix and regenerate |
| Test generation fails | Complex logic, no framework setup | Generate basic structure, mark for manual completion |
| Brownfield: would create `*_modified.<ext>` | Wrong codegen mode | STOP — modify in place per `code-generation.md` |

### Build & Test

| Error | Cause | Resolution |
|-------|-------|-----------|
| Cannot determine build tool | Unusual project structure | Ask user to specify |
| Tests fail | Bug in generated code | Fix and re-run; if persistent, return to Code Generation |

### Operations Stages

| Error | Cause | Resolution |
|-------|-------|-----------|
| IaC tool not selected | NFR didn't decide | Ask pod to choose Terraform / Pulumi / CDK |
| Observability tool not configured | Missing creds | Mark `HUMAN TASK` and proceed with placeholder |
| Production Readiness item cannot be checked | External dependency | Pod marks N/A with reason if truly out of scope |

---

## Recovery Procedures

### Partial Stage Completion (interrupted mid-execution)

1. Load the stage plan file
2. Identify last completed step (last `[x]`)
3. Resume from next uncompleted step
4. Verify all prior steps actually complete
5. Continue normally

### Corrupted State File

1. Backup: `aidlc-state.md.backup.<ts>`
2. Ask user which stage they're on
3. Regenerate state file from scratch
4. Mark completed stages based on existing artifacts
5. Resume

### Missing Artifacts

1. Identify which artifacts are missing
2. If regenerable: return to that stage and regenerate
3. If not: ask user to provide info manually
4. Document gap in `audit.md`

### Stale Signoff File

A signoff file older than 30 days is stale and must be re-signed.

1. Notify the pod
2. Generate a fresh signoff template
3. Block stage until both signatures recorded again
4. Log in `audit.md`

### User Wants to Restart Stage

1. Confirm (data will be archived, not lost)
2. Archive: `<artifact>.backup.<ts>`
3. Reset stage status in state file
4. Clear stage checkboxes in plan files
5. Re-execute stage from beginning

### User Wants to Skip Stage

1. Confirm understanding of implications
2. Document skip reason in `audit.md`
3. Mark stage as SKIPPED in state file
4. Proceed to next stage
5. Note dependencies that may now fail downstream

### Pod Conflict at Gate

See `pod-ritual.md` § Conflict Resolution.

---

## Session Resumption Errors

### Missing Artifacts During Resumption

- **Cause**: files deleted, moved, or never created
- **Resolution**:
  1. Identify which stage created the missing artifacts
  2. If state says complete but artifacts missing → re-execute that stage
  3. If not marked complete → resume from that stage

### Inconsistent State

- **State complete but artifacts don't exist**: mark stage incomplete; re-execute
- **Artifacts exist but state says incomplete**: verify artifacts; update state
- **Multiple stages marked "current"**: ask user; correct state

### Stale Signoff at Resume

- **Cause**: long pause between sign-off and current session
- **Resolution**: validation rule from `approval-gates.md` flags it; pod re-signs the gate file

---

## Logging Format

### Error Log

```markdown
## Error — <Stage Name>
**Timestamp**: <ISO>
**Severity**: <Critical | High | Medium | Low>
**Description**: <what went wrong>
**Cause**: <why>
**Resolution**: <how resolved>
**Impact**: <effect on workflow>

---
```

### Recovery Log

```markdown
## Recovery — <Stage Name>
**Timestamp**: <ISO>
**Issue**: <what needed recovery>
**Recovery Steps**: <what was done>
**Outcome**: <result>
**Artifacts Affected**: <list>

---
```

---

## Escalation

### Ask user immediately when

- Contradictory or ambiguous user input
- Missing required information
- Technical constraints AI cannot resolve
- Decisions requiring business judgment

### Suggest starting over when

- Multiple stages have errors
- State file severely corrupted
- Requirements have changed significantly
- Architectural decision must be reversed
- Artifacts inconsistent across phases

Before starting over: archive all existing work and get explicit user confirmation.

---

## Prevention Best Practices

1. **Validate early** — check inputs and dependencies before starting work
2. **Checkpoint often** — update checkboxes immediately
3. **Communicate clearly** — explain what you're doing and why
4. **Ask questions** — clarify ambiguities immediately
5. **Document everything** — log all decisions and changes in `audit.md`

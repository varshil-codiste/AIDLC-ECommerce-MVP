# Question Format Guide

## MANDATORY: All Questions Must Use This Format

### Rule: Never Ask Questions in Chat

**CRITICAL**: NEVER ask questions directly in chat. ALL questions must be placed in dedicated `.md` question files inside the project's `aidlc-docs/` tree.

### Question File Naming Convention

- Use descriptive names: `{stage-name}-questions.md`
- Examples:
  - `business-requirements-questions.md`
  - `design-intake-questions.md`
  - `tier-detection-questions.md`
  - `requirements-questions.md`
  - `story-planning-questions.md`
  - `stack-selection-questions.md`
  - `extension-opt-in-questions.md`

### Question Structure

Every question must include meaningful options plus "Other" as the last option:

```markdown
## Question [Number]
[Clear, specific question text]

A) [First meaningful option]
B) [Second meaningful option]
[...additional options as needed...]
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

**CRITICAL**:
- "Other" is MANDATORY as the LAST option for every question
- Only include meaningful options — don't make up options to fill slots
- Use as many or as few options as make sense (minimum 2 + Other)

### Complete Example

```markdown
# Business Requirements — Tier Detection

Please answer the following questions to set the Tier for this work.

## Question 1
What kind of work are we starting?

A) New project / new product (Greenfield)
B) New feature on an existing product
C) Bug fix / patch / hotfix
X) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2
In what format will you provide the business requirements?

A) Plain text in chat
B) PDF document
C) Word / Google Doc
D) Ticket reference (Jira / Linear / ClickUp / Notion)
E) Combination of the above
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

### User Response Format

The user answers by filling in the letter choice after the `[Answer]:` tag:

```markdown
## Question 1
What kind of work are we starting?

A) New project / new product (Greenfield)
B) New feature on an existing product
C) Bug fix / patch / hotfix

[Answer]: B
```

### Reading User Responses

After the user confirms completion:
1. Read the question file
2. Extract answers after `[Answer]:` tags
3. Validate that all questions are answered
4. Detect contradictions and ambiguities (see below)
5. Proceed with analysis based on responses

### Multiple-Choice Guidelines

#### Option Count
- Minimum: 2 meaningful options + "Other" (A, B, C)
- Typical: 3–4 meaningful options + "Other" (A, B, C, D, E)
- Maximum: 5 meaningful options + "Other" (A, B, C, D, E, F)
- Don't make up options just to fill slots

#### Option Quality
- Make options mutually exclusive
- Cover the most common scenarios
- Only include meaningful, realistic options
- ALWAYS include "Other" as the LAST option (MANDATORY)
- Be specific and clear

### Workflow Integration

#### Step 1: Create Question File
Create `aidlc-docs/{phase}/{stage}-questions.md` with all questions for that stage.

#### Step 2: Inform User
```
"I've created {phase}/{stage}-questions.md with [X] questions.
Please answer each question by filling in the letter choice after the [Answer]: tag.
If none of the options match your needs, choose the last option (Other) and describe your preference.
Let me know when you're done."
```

#### Step 3: Wait for Confirmation
Wait for user to say "done", "completed", "finished", or similar.

#### Step 4: Read and Analyze
Read the question file, extract all answers, validate completeness, run contradiction detection, and proceed.

### Error Handling

#### Missing Answers
```
"I noticed Question [X] is not answered. Please provide an answer using one of the
letter choices for all questions before proceeding."
```

#### Invalid Answers
```
"Question [X] has an invalid answer '[answer]'. Please use only the letter choices
provided in the question."
```

#### Ambiguous Answers
```
"For Question [X], please provide the letter choice that best matches your answer.
If none match, choose 'Other' and add your description after the [Answer]: tag."
```

### Contradiction and Ambiguity Detection

**MANDATORY**: After reading user responses, you MUST check for contradictions and ambiguities.

#### Detecting Contradictions
- Tier mismatch: "Bug fix" Tier but "entire codebase affected"
- Scope mismatch: "Single component" but "significant architecture changes"
- Risk mismatch: "Low risk" but "breaking changes"
- Timeline mismatch: "Quick fix" but "multiple subsystems"

#### Detecting Ambiguities
- Vague responses: "depends", "maybe", "not sure", "mix of", "somewhere between"
- Answers that fit multiple classifications
- Conflicting indicators across multiple questions

#### Creating Clarification Questions

If contradictions or ambiguities are detected:

1. **Create clarification file**: `{stage}-clarification-questions.md`
2. **Explain the issue**: Clearly state what was detected
3. **Ask targeted questions**: Use multiple-choice format
4. **Reference original questions**: Show which had conflicting answers

Example:

```markdown
# Business Requirements — Clarification Questions

I detected contradictions in your responses that need clarification:

## Contradiction 1: Tier vs Scope
You indicated "Bug fix" (Q1: C) but also "Entire codebase affected" (Q3: D).
These responses conflict because a bugfix should not require codebase-wide changes.

### Clarification Question 1
Which is more accurate?

A) This is actually a Feature — the original Tier was wrong
B) This is actually a Refactor that should escalate to Greenfield
C) The scope is narrower than I described — only one component
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

#### Workflow for Clarifications

1. **Detect**: Analyze all responses for contradictions / ambiguities
2. **Create**: Generate clarification question file if issues found
3. **Inform**: Tell user about the issues and clarification file
4. **Wait**: Do not proceed until user provides clarifications
5. **Re-validate**: After clarifications, check again for consistency
6. **Proceed**: Only move forward when all contradictions are resolved

### Best Practices

1. **Be Specific**: Questions should be clear and unambiguous
2. **Be Comprehensive**: Cover all necessary information for the stage
3. **Be Concise**: Keep each question focused on one topic
4. **Be Practical**: Options should be realistic and actionable
5. **Be Consistent**: Use the same format throughout all question files

## Summary

- ✅ Always create question files (never ask in chat)
- ✅ Always use multiple-choice format
- ✅ Always include "Other" as the LAST option
- ✅ Only include meaningful options
- ✅ Always use `[Answer]:` tags
- ✅ Always wait for user completion
- ✅ Always validate responses for contradictions
- ✅ Always create clarification files if needed
- ✅ Always resolve contradictions before proceeding
- ❌ Never ask questions in chat
- ❌ Never make up options to fill A/B/C/D
- ❌ Never proceed without answers
- ❌ Never proceed with unresolved contradictions
- ❌ Never make assumptions about ambiguous responses

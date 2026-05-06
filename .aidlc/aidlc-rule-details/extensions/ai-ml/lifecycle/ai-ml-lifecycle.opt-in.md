# AI/ML Lifecycle — Opt-In

**Extension**: AI/ML Lifecycle (team-specific — prompt management, eval suites, RAG checks, hallucination & safety guardrails)
**Full rule file**: `extensions/ai-ml/lifecycle/ai-ml-lifecycle.md`

This extension is the most relevant for the team's core practice (AI solutions for clients) — opt in any time the project uses LLMs, embeddings, classifiers, or any other ML model.

---

## Opt-In Prompt

```markdown
## Question: AI/ML Lifecycle Extension
Does this project use LLMs, embeddings, RAG, fine-tuning, or any ML model?

A) Yes — enforce AI/ML lifecycle rules (prompt versioning, eval suites, RAG quality, hallucination guardrails, PII handling) — Recommended for any LLM-using project
B) Partial — only LLM calls without RAG / fine-tuning (enforce prompt versioning + eval + hallucination guardrails; skip RAG-specific rules)
C) No — this project has no AI/ML component
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

- `A` → load full `ai-ml-lifecycle.md`; all rules apply
- `B` → load `ai-ml-lifecycle.md`; RAG-specific rules (AIML-04, AIML-05) marked N/A
- `C` → never load
- `X` → clarify

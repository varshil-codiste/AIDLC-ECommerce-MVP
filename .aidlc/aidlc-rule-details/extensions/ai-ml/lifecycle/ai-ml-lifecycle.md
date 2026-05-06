# AI/ML Lifecycle (team-specific)

**Extension**: AI/ML Lifecycle — prompt management, eval suites, RAG quality, hallucination & safety guardrails
**Loaded by**: Requirements Analysis when user opts in
**Enforced at**: Functional Design (Stage 8), NFR Requirements (Stage 9), Code Generation (Stage 12), Code Review (Stage 13), Build & Test (Stage 14), Observability Setup (Stage 17), Production Readiness (Stage 18)

**Skill that implements this extension**: [`llm-eval-harness`](../../../../skills/extensions/llm-eval-harness/SKILL.md). The skill is the concrete implementer of:
- **AIML-02 Eval Suite** — scaffolds `evals/<task>/` at Stage 12 Step 8; runs the golden set at Stages 13/14; pass rate below NFR-MLQ-001 threshold blocks Gate #4
- **AIML-04 RAG-Specific Quality** — when RAG is in scope, additionally evaluates retrieval recall@k, precision@k, and grounding rate

The other AIML rules (01 Prompt Versioning, 03 Regression Tracking, 05 Vector Store Hygiene, 06 Hallucination Guardrails, 07 PII Handling, 08 Prompt Injection, 09 Cost Budgets, 10 Provider Fallback) are enforced by the per-stack code-conventions skills + `observability-wirer` rather than a single dedicated skill.

This extension is the most distinctive team-specific addition because the company is an AI solutions provider — most projects involve LLMs, embeddings, retrieval, or fine-tuning, and they need rigor that the general Security + PBT extensions don't cover.

---

## The 10 Rules

### AIML-01 — Prompt Versioning & Registry

**Statement**: Every prompt sent to a model is stored as a versioned file, never inline-concatenated in code.

Layout:
```
prompts/
├── <task>/
│   ├── v1.md            # initial version
│   ├── v2.md            # revised version
│   └── current → v2.md  # symlink or pointer file
```

- Prompts are markdown with front-matter:

  ```yaml
  ---
  task: classify-intent
  version: 2
  model: claude-opus-4-7
  inputs: [user_message, conversation_history]
  outputs: [intent, confidence]
  created: 2026-04-15T10:00:00Z
  author: <name>
  ---
  ```

- Code loads prompts via a `loadPrompt(task: string, version: 'current' | number)` helper — never `const p = "You are..."` inline
- Production pins a specific version (no `current` in production code paths)
- Prompt diffs are reviewed in PR like code

**Per-stack**: helpers under `lib/prompts/` (Node), `<package>/prompts.py` (Python), `internal/prompts/` (Go). Frontend / Mobile typically don't load prompts directly — they call backend.

### AIML-02 — Eval Suite (Golden Set)

**Statement**: Every LLM-using feature has an eval suite with a golden set, scored by deterministic metrics.

Components:
- **Golden set**: curated examples of (input, expected output / score) — versioned in `evals/<task>/golden.jsonl` (one example per line)
- **Metrics**: task-specific (e.g., exact match, BLEU, ROUGE, F1, custom rubric) — declared per task
- **Runner**: `evals/run.py` (or equivalent per stack) that runs the prompt against the golden set and reports pass rate
- **Threshold**: NFR-MLQ-001 declares the pass-rate threshold (e.g., ≥ 0.95)

Run cadence:
- On every prompt change (CI gate)
- Nightly against production prompt + production model
- Before each release (Stage 14 Build & Test invokes this)

### AIML-03 — Regression Tracking

**Statement**: Eval results are tracked over time so regressions are visible.

- Eval runner writes results to `evals/<task>/results/<ISO-timestamp>.json`
- Results include: prompt version, model, pass rate, per-example outcomes
- Dashboard panel (Stage 17) shows pass-rate trend over time
- Alert when pass rate drops > 2 percentage points vs prior 7-day average

### AIML-04 — RAG-Specific Quality (skip in Partial mode)

**Statement**: Retrieval-Augmented Generation systems have explicit retrieval-quality and grounding tests.

| Concern | Test |
|---------|------|
| Chunking | Document corpus split with documented chunk size + overlap; chunking quality tested via golden retrievals |
| Retrieval recall | For golden queries, top-k retrieval includes the known-correct passages — measured as recall@k |
| Retrieval precision | Top-k results don't include irrelevant passages — measured as precision@k or MRR |
| Grounding | Generated answer cites the retrieved passages; non-grounded answers (no source) are flagged |
| Stale-data | Retrieval freshness target: index updated within X hours of source change |

These tests live alongside AIML-02 evals in `evals/<rag-task>/`.

### AIML-05 — Vector Store Hygiene (skip in Partial mode)

**Statement**: The vector store is treated as a managed component with explicit ops:

- Backup / snapshot policy
- Reindex procedure documented
- Embedding model version pinned per index (changing the embedding model requires reindexing)
- Index parameters (HNSW M / ef, IVF nlist, etc.) tuned + documented
- Capacity monitoring (memory, recall vs latency tradeoff)

### AIML-06 — Hallucination Guardrails

**Statement**: Outputs go through guardrail checks before reaching users.

Layers:
1. **Structured output**: prefer JSON-mode / function-calling so outputs are schema-validated before emission
2. **Refusal handling**: explicit `cannot_answer` path when the model expresses uncertainty or refuses
3. **Grounding check** (RAG): if the answer doesn't cite any retrieved passage, treat as ungrounded → return refusal or fall back
4. **Toxicity / policy filter**: appropriate to use case (e.g., Anthropic / OpenAI moderation, Perspective API, custom)
5. **Confidence threshold**: if the model returns confidence (function-calling supports this), enforce a minimum

The guardrail layer is its own module with unit tests; failures are logged with the input + output (PII-scrubbed) for analysis.

### AIML-07 — PII Handling

**Statement**: PII is scrubbed before being sent to LLM providers, and outputs are scanned for echoed PII before logging or persistence.

- Inputs: redact emails, phone numbers, IDs, addresses where the task doesn't require them; replace with placeholders
- Outputs: scan for credit-card patterns, SSN patterns, etc. — block / redact before returning
- LLM provider data-retention setting: zero-retention mode where supported (e.g., Anthropic / OpenAI no-train, no-store options)
- Logs: never log full prompts / completions in production; log lengths + IDs
- Vendor agreements: ensure DPA covers the data classifications from BR

### AIML-08 — Prompt Injection Defense

**Statement**: User-controlled content embedded in prompts is bounded and labeled.

- Use clear delimiters between system instructions and user content (`<user_input>...</user_input>` or framework-provided primitives)
- Treat tool / function outputs that include user data the same as user content
- Sensitive operations (delete data, send email, charge card) are NEVER triggered solely by LLM output without an explicit out-of-band confirmation step
- Test prompt-injection resistance: include adversarial examples in the eval suite (jailbreak attempts, instruction-override attempts)

### AIML-09 — Cost & Latency Budgets

**Statement**: Each LLM-using flow has explicit cost-per-call and latency budgets.

- Budget recorded in NFR Requirements `## AI/ML Quality`
- Track tokens-in / tokens-out per call; emit as metrics (Stage 17)
- Alert when daily / per-tenant cost exceeds budget
- Streaming preferred when user-facing (improves perceived latency)
- Consider caching deterministic prompts (same input → same output) — Recommended for high-volume flows

### AIML-10 — Provider Fallback & Degradation

**Statement**: When the primary LLM provider is unavailable, the system has a defined fallback.

Options:
- Secondary provider / model
- Cached deterministic responses
- Graceful UX message ("AI assistant temporarily unavailable")
- Skip-the-feature fallback (the feature is missing, but the rest of the product works)

The chosen fallback is documented in `runbook.md` § "LLM provider outage" and tested at least once before launch.

---

## Stage-by-Stage Application

| Stage | What this extension does |
|-------|--------------------------|
| 4 Requirements Analysis | Captures AI/ML goals; opt-in question; loads this rule file |
| 6 Application Design | Adds "## 7. AI/ML Architecture" section: model choice, prompt registry, eval harness, RAG store, guardrail layer |
| 8 Functional Design | Identifies prompts; lists guardrails; declares RAG retrieval pipeline (if applicable) |
| 9 NFR Requirements | AI/ML Quality category — eval thresholds, latency-per-token, hallucination tolerance, cost budgets |
| 10 NFR Design | Vector store + prompt registry + guardrail layer as logical components |
| 12 Code Generation | Generates prompt files, eval scaffold, guardrail module, retry/fallback for provider |
| 13 Code Review | Verifies AIML-01 (no inline prompts), AIML-06 (guardrails wired), AIML-07 (PII scrubbing in place) |
| 14 Build & Test | Runs eval suite (AIML-02 / -03); RAG tests (AIML-04) if applicable |
| 17 Observability Setup | LLM-specific metrics: prompt latency, tokens, eval pass rate, hallucination guardrail rate, cost |
| 18 Production Readiness | Section I checklist: eval passing, prompts pinned, guardrails enabled, cost monitoring active, fallback tested |

---

## Partial Mode (Question B in opt-in)

If user chose `B) Partial` (LLM but no RAG / fine-tuning), AIML-04 and AIML-05 become N/A. All other rules apply.

---

## Team Defaults

- **Prompts**: stored in `prompts/<task>/v<n>.md` with front-matter; production pins specific versions
- **Eval framework**: pytest-based for Python; vitest-based for Node; custom small runner for Go (Recommended)
- **Vector store default**: pgvector for projects with Postgres already; Pinecone or Qdrant for high-scale or multi-tenant cases
- **Tracing**: Langfuse / OpenTelemetry GenAI semantic conventions (Recommended for production LLM apps)

---

## Anti-patterns

- ❌ Hard-coded prompt strings in source files
- ❌ No eval suite ("we'll test it manually")
- ❌ RAG without retrieval-quality measurement
- ❌ Sending raw user-submitted PII to LLM provider
- ❌ Sensitive actions triggered directly by LLM output without confirmation
- ❌ No cost monitoring → discovering a $10K LLM bill at month-end
- ❌ Production using `current` symlink for prompts (must be pinned)

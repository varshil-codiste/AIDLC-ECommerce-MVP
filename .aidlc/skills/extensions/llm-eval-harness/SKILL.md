---
name: llm-eval-harness
description: |
  Use when authoring or running an LLM evaluation suite for any project where the AI/ML lifecycle extension is enabled. Reads the project's prompt registry under prompts/ and the eval golden set under evals/, then runs each prompt against the production model with deterministic metrics (exact match, F1, BLEU, ROUGE, custom rubric) and emits a pass-rate report. Wires directly to AIML-02 enforcement of the AI/ML lifecycle extension - pass rate below the NFR-MLQ threshold blocks Gate #4 Code Review and surfaces in the Build & Test summary. For RAG projects (AIML-04), additionally evaluates retrieval recall, precision, and grounding.
aidlc:
  sensitive: false
---

# LLM Eval Harness

## When to Use (AI-DLC context)

This skill fires whenever the AI/ML lifecycle extension is enabled (`aidlc-state.md § Extension Configuration`) and the project crosses any of these stages:

- **Stage 12 — Code Generation** (Step 8: AI/ML Layer): scaffolds the `evals/` directory + golden-set template + runner
- **Stage 13 — Code Review** Check 3: a degenerate eval pass-rate counts as a test failure → Gate #4 BLOCK
- **Stage 14 — Build & Test**: full eval run on production prompts + production model; pass rate appears in `build-and-test-summary.md`
- **Stage 17 — Observability Setup**: emits the `ai-ml.json` dashboard's "eval pass rate (rolling)" panel data

It is the concrete implementer of the AI/ML extension's **AIML-02 Eval Suite** rule and (when RAG is used) **AIML-04 RAG-Specific Quality** rule.

## What It Does

### Sub-action 1: Scaffold (Stage 12)

For each LLM-using task identified in Functional Design:

1. Creates `evals/<task>/golden.jsonl` template with example schema
2. Creates `evals/<task>/metrics.py` (or `.ts` etc. per stack) that scores outputs
3. Creates `evals/run.py` (or per-stack equivalent) that loops the golden set and reports
4. Creates `evals/<task>/results/` directory for archival
5. Imports prompts from `prompts/<task>/v<n>.md` per AIML-01 (versioned, never inline)

### Sub-action 2: Run (Stages 13 / 14)

For each task:

1. Loads the golden set (one JSON-Lines file per task)
2. Loads the pinned prompt version (production prompts pin a specific version per AIML-01)
3. Runs the prompt against the production model for each example
4. Scores outputs against expected results using task-appropriate metrics
5. Computes pass rate
6. Compares pass rate to NFR-MLQ-001 threshold (typically ≥ 0.95 for production)
7. Writes results JSON to `evals/<task>/results/<ISO-ts>.json` (append-only audit trail)
8. Emits a summary report

### Sub-action 3: Verify RAG quality (when AIML-04 applies)

For RAG tasks:

1. Runs golden retrieval queries against the vector store
2. Computes retrieval recall@k (top-k contains the known-correct passage)
3. Computes retrieval precision@k or MRR
4. For generated answers: verifies grounding (every claim cites a retrieved passage)
5. Reports stale-data lag if metadata indicates it
6. Surfaces these as additional rows in the eval report

## Metrics

Per-task metrics are declared in `evals/<task>/metrics.py`. Common patterns:

| Task type | Recommended metric |
|-----------|--------------------|
| Classification (intent, sentiment, label) | exact match, F1 |
| Extraction / structured output | JSON-schema validation + field-level F1 |
| Summarization | ROUGE, BLEU, plus a custom-rubric LLM-as-judge for nuance |
| RAG / Q&A | retrieval recall@k, precision@k, grounding rate, exact-match on answer |
| Code generation | functional correctness (run the generated code against tests) |

Custom rubrics are encouraged over single-metric scoring for nuanced tasks; the rubric must be deterministic (or a fixed-temperature LLM judge) to be useful for regression tracking.

## Inputs

- `<workspace-root>/prompts/<task>/v<n>.md` (the production-pinned prompt per AIML-01)
- `<workspace-root>/evals/<task>/golden.jsonl` (the golden set)
- `<workspace-root>/evals/<task>/metrics.<ext>` (the scorer)
- `aidlc-docs/construction/{unit}/nfr-requirements/<unit>-nfr-requirements.md` § AI/ML Quality (NFR-MLQ thresholds)
- `aidlc-docs/aidlc-state.md` (Extension Configuration verifies AI/ML enabled)

## Outputs

- `<workspace-root>/evals/<task>/results/<ISO-ts>.json` (per-run results, append-only)
- `aidlc-docs/construction/{unit}/code-review/<unit>-llm-eval-report.md` (Stage 13 invocation: shows up as a row in the test report)
- `aidlc-docs/construction/build-and-test/llm-eval-summary.md` (Stage 14 invocation: feeds into `build-and-test-summary.md`)
- A dashboard data feed for the `ai-ml.json` dashboard's "eval pass rate (rolling)" panel

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no (read-only against production model — does not mutate infra)
- **Tier scope**: All — Bugfix scopes the eval to tasks affected by the bug

## Team Conventions Applied

- **Production pins prompts** by version (per AIML-01) — eval refuses to run against `current` symlink in production paths
- **Golden set is versioned** — adding/removing examples is a code change and goes through PR review like any other source change
- **Pass-rate threshold from NFR-MLQ-001** — extension is hard-gated; below threshold means Gate #4 BLOCK
- **Results are append-only** — `evals/<task>/results/<ts>.json` files are never overwritten; the dashboard reads the time-series
- **No PII in eval inputs** — golden examples are scrubbed; if the production task requires PII handling, eval uses synthetic equivalents
- **Cost tracked** — every run emits tokens-in/out and projected cost so the AIML-09 cost budget alert can fire if eval cost grows unexpectedly
- **Provider-agnostic** — eval calls go through the project's existing model-provider client (Anthropic / OpenAI / Vercel AI / LangChain) rather than reinventing
- **Deterministic where possible** — temperature 0 for scoring tasks; if a probabilistic task requires variance reporting, run N times and report mean ± std

## Tier-Specific Behavior

- **Greenfield**: full eval suite scaffolded; full golden set authored; full RAG quality checks if AIML-04 in scope
- **Feature**: scoped to the new task(s); existing eval suites untouched
- **Bugfix**: targeted regression eval — add a golden-set example that captures the bug, run only the affected task

## RAG-specific behavior (AIML-04 only)

When the project uses RAG (vector store + retrieval):

- Retrieval queries from `evals/<task>/retrieval-golden.jsonl` (separate golden set for retrieval evaluation)
- recall@k where k is per-task (often 5 or 10)
- precision@k or MRR for ranked relevance
- Grounding check: each generated claim must cite at least one retrieved passage; ungrounded claims trip a Reject finding
- Index-freshness: if metadata indicates `<task>-freshness-target: 24h` and the latest index update is older, trip a warning

## Failure modes

- **AI/ML extension not enabled**: skill emits a clear note and refuses (it has nothing to enforce against)
- **Golden set empty**: setup error — refuse with remediation
- **Prompt registry doesn't pin a version for production**: setup error per AIML-01 violation
- **Model provider unreachable**: fail closed with retry; persistent failure → eval marked incomplete in summary
- **Cost budget exceeded mid-run**: pause + ask pod whether to continue (cost is real)

## See Also

- AI/ML extension rule: `../../aidlc-rule-details/extensions/ai-ml/lifecycle/ai-ml-lifecycle.md` (defines AIML-01..10; this skill enforces AIML-02 and AIML-04)
- Stage rules where this fires: `../../aidlc-rule-details/construction/code-generation.md` (Stage 12 Step 8), `../../aidlc-rule-details/construction/code-review.md` (Stage 13 Check 3), `../../aidlc-rule-details/construction/build-and-test.md` (Stage 14)
- Sibling skills: `../../skills/construction/test-runner-aggregator/SKILL.md` (Stage 13 Check 3 absorbs eval results), `../../skills/operations/observability-wirer/SKILL.md` (dashboard data)
- Upstream: `./upstream/README.md` (huggingface/hugging-face-evaluation, getsentry/sentry-setup-ai-monitoring, openai eval libraries)

## Trigger-test prompts

1. "Using AI-DLC, scaffold the eval suite for the summarizer task." (should trigger Stage 12 Step 8)
2. "Run the LLM eval golden set against production prompts." (should trigger Stage 13/14)
3. "Check the RAG retrieval recall on the customer-support task." (should trigger sub-action 3 when AIML-04 applies)
4. "Run the unit tests." (should NOT trigger — that's test-runner-aggregator)
5. "Apply the Terraform plan." (should NOT trigger — wrong skill)

# Upstream — llm-eval-harness

Placeholder for the vendored upstream content.

**Recommended upstream(s)**:

- `huggingface/hugging-face-evaluation` — model benchmarking with vLLM / lighteval (per VoltAgent/awesome-agent-skills)
- `getsentry/sentry-setup-ai-monitoring` — instrumentation for OpenAI / Anthropic / Vercel AI / LangChain (so eval results flow into the same observability stack as production)
- Optional: vendor patterns from `replicate/replicate` if the project uses Replicate models

To vendor:

```bash
gh repo clone huggingface/<repo> /tmp/hugging-face-eval
rm -rf .aidlc/skills/extensions/llm-eval-harness/upstream
cp -r /tmp/hugging-face-eval/<path-to-skill> .aidlc/skills/extensions/llm-eval-harness/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds: the AIML-02 + AIML-04 enforcement logic, the prompt-version-pinning check (AIML-01 dependency), the per-task metric pattern table, the deterministic-scoring requirement (temperature 0 where possible), the cost-tracking emission for AIML-09 budget alerts, and the RAG-specific retrieval/grounding evaluation when AIML-04 is in scope.

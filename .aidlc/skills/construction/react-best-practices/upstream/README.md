# Upstream — react-best-practices

Placeholder for the vendored upstream content.

**Recommended upstream(s)**:
- `vercel-labs/react-best-practices` — React patterns and composition
- `vercel-labs/next-best-practices` — Next.js 13+ App Router, caching, SSR
- `vercel-labs/next-cache-components` — cache-aware component architecture (depth)
- Optional: `google-labs-code/react-components` (Stitch → React conversion) and `google-labs-code/shadcn-ui` (UI primitives)

To vendor (example for the Vercel Labs bundle):

```bash
gh repo clone vercel-labs/<repo> /tmp/vercel-labs-react
rm -rf .aidlc/skills/construction/react-best-practices/upstream
cp -r /tmp/vercel-labs-react/<path-to-skill> .aidlc/skills/construction/react-best-practices/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds the mandatory `data-testid` convention, the design-tokens pull from `inception/design/design-tokens.md`, and Tier-aware generation behavior — all layered on top of the upstream's React/Next idioms.

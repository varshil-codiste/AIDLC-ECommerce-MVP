# Upstream — screenshot-design-parser

This folder is a placeholder. The AI-DLC wrapper at `../SKILL.md` is largely locally-authored because no single upstream skill specializes in screenshot-input design parsing — most upstream design skills assume Figma or live tooling.

**Recommended companion upstream**: anthropics/skills `frontend-design` (provides the underlying design-token authoring conventions). To vendor:

```bash
# from project root
gh repo clone anthropics/skills /tmp/anthropics-skills
rm -rf .aidlc/skills/inception/screenshot-design-parser/upstream
cp -r /tmp/anthropics-skills/skills/frontend-design .aidlc/skills/inception/screenshot-design-parser/upstream
```

The screenshot-specific extraction logic (color palette inspection, typography estimation, navigation-question generation) is locally-authored in the wrapper itself.

# Upstream — figma-mcp-extractor

This folder is a placeholder for the vendored upstream content. When promoted from F2 placeholder to fully-operational, vendor here:

**Recommended upstream**: anthropics/skills `frontend-design` (`https://github.com/anthropics/skills/tree/main/skills/frontend-design`) — provides the design-token extraction and styling primitives this skill builds on.

To vendor:

```bash
# from project root
git submodule add https://github.com/anthropics/skills .aidlc/skills/inception/figma-mcp-extractor/upstream
# Or vendor only the relevant subtree:
gh repo clone anthropics/skills /tmp/anthropics-skills
rm -rf .aidlc/skills/inception/figma-mcp-extractor/upstream
cp -r /tmp/anthropics-skills/skills/frontend-design .aidlc/skills/inception/figma-mcp-extractor/upstream
```

The Figma MCP integration itself is an in-IDE capability (e.g., the Figma MCP server). The wrapper SKILL.md at `../SKILL.md` documents how to configure it; the upstream provides the artistic/design-token extraction logic the wrapper invokes.

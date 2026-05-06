# Upstream — invest-story-writer

This folder is a placeholder for the vendored upstream content.

**Recommended upstream**: deanpeters product / user-stories skill bundle (see VoltAgent/awesome-agent-skills entry under deanpeters — 46 PM-focused skills covering discovery, story decomposition, INVEST patterns).

To vendor:

```bash
# from project root
git submodule add <upstream-repo-url> .aidlc/skills/inception/invest-story-writer/upstream
```

OR

```bash
gh repo clone <owner>/<repo> /tmp/<repo>
rm -rf .aidlc/skills/inception/invest-story-writer/upstream
cp -r /tmp/<repo>/<path-to-skill> .aidlc/skills/inception/invest-story-writer/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds the cross-stack-notes convention, t-shirt-sized effort estimation, and Tier-1/2/3 ranking which are team-specific layered on top of the upstream INVEST methodology.

# Upstream — product-discovery

This folder is a placeholder for the vendored upstream content. When this skill is promoted from F2 placeholder to fully-operational, replace this README with the vendored upstream artifacts.

**Recommended upstream**: deanpeters product-discovery skills bundle (see VoltAgent/awesome-agent-skills entry under deanpeters).

To vendor:

```bash
# from project root
git submodule add <upstream-repo-url> .aidlc/skills/inception/product-discovery/upstream
```

OR

```bash
# from project root
gh repo clone <owner>/<repo> /tmp/<repo>
rm -rf .aidlc/skills/inception/product-discovery/upstream
cp -r /tmp/<repo>/<path-to-skill> .aidlc/skills/inception/product-discovery/upstream
```

Until vendored, the wrapper SKILL.md at `../SKILL.md` carries the team's full instructions; the upstream is referenced as a stretch resource for future depth.

# Upstream — dockerfile-generator

This skill is **largely locally-authored** because the team's Dockerfile templates encode specific conventions (multi-stage non-root with digest-pinned bases, lockfile-respecting installs, HEALTHCHECK + scripts/ci.sh integration) that no single upstream covers.

**Companion upstream(s)** (cross-apply):

- Vendor docs from Docker / Distroless for image-hardening patterns
- `getsentry/sentry-*-sdk` family — useful in the runtime stages for error tracking
- Any "Dockerfile best practices" skill if it shows up in VoltAgent's catalog

To vendor a future companion:

```bash
gh repo clone <vendor>/<repo> /tmp/<repo>
rm -rf .aidlc/skills/operations/dockerfile-generator/upstream
cp -r /tmp/<repo>/<path-to-skill> .aidlc/skills/operations/dockerfile-generator/upstream
```

The wrapper at `../SKILL.md` carries: per-stack Dockerfile templates, digest-pinning enforcement, HEALTHCHECK convention, the docker-compose generation, and the sensitive sub-action 3 (image-promote-prod) which exercises the per-action signoff machinery from `skill-policy.md`.

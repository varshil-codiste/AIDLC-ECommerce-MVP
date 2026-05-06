# Upstream — api-contract-designer

Placeholder for the vendored upstream content.

**Recommended upstream(s)**:
- For GraphQL: `apollographql/graphql-schema` and `apollographql/apollo-server` (see VoltAgent/awesome-agent-skills entry under apollographql — 13 skills covering Apollo Server, Federation, Rover, schema design)
- For OpenAPI: a curated OpenAPI authoring skill from VoltAgent's catalog (or the locally-authored portion of the wrapper handles OpenAPI directly)
- For gRPC: a Protocol Buffers / gRPC skill if available in the catalog

To vendor:

```bash
git submodule add <upstream-repo-url> .aidlc/skills/construction/api-contract-designer/upstream
```

OR

```bash
gh repo clone <owner>/<repo> /tmp/<repo>
rm -rf .aidlc/skills/construction/api-contract-designer/upstream
cp -r /tmp/<repo>/<path-to-skill> .aidlc/skills/construction/api-contract-designer/upstream
```

The team-specific layer (cross-stack codegen-readiness check, error-envelope enforcement, validation report) lives in the wrapper at `../SKILL.md`.

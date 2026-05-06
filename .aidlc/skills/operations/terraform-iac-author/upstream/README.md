# Upstream — terraform-iac-author

Placeholder for the vendored upstream content.

**Recommended upstream(s)** (HashiCorp's official Terraform skills bundle):

- `hashicorp/terraform-style-guide` — HCL best practices
- `hashicorp/terraform-test` — `.tftest.hcl` testing framework

To vendor:

```bash
gh repo clone hashicorp/<repo> /tmp/hashicorp-terraform
rm -rf .aidlc/skills/operations/terraform-iac-author/upstream
cp -r /tmp/hashicorp-terraform/<path-to-skill> .aidlc/skills/operations/terraform-iac-author/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds the most important team-specific layer: the **sub-action 3 sensitive gate** that enforces the per-action signoff before any non-dev `terraform apply`. The wrapper also encodes the team's modular envs/dev|staging|prod structure, OIDC requirement for CI, mandatory tags/labels, and encryption-at-rest defaults.

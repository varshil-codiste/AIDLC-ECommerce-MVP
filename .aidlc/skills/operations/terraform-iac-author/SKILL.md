---
name: terraform-iac-author
description: |
  Use when authoring or applying Terraform IaC at AI-DLC Stage 16 (Infrastructure-as-Code) for projects whose cloud target was set to AWS, GCP, or Azure at Stack Selection Block F.2. Sub-actions: (1) Author modular Terraform under infra/ with envs/dev/staging/prod separation, OIDC for CI auth, encryption-at-rest by default, tags/labels for cost tracking - read-write but NOT sensitive. (2) Run terraform plan - read-write but NOT sensitive. (3) Run terraform apply against any non-dev environment - SENSITIVE, requires per-action signoff per skill-policy.md before live mutation. Refuses to apply without a valid signoff.
aidlc:
  sensitive: true
  blast-radius: iac-apply
  countersign-required-at: per-action-signoff
---

# Terraform IaC Author

## When to Use (AI-DLC context)

This skill fires at **Stage 16 — Infrastructure-as-Code** (`../../aidlc-rule-details/operations/infrastructure-as-code.md`) for projects with cloud target = AWS / GCP / Azure / Mixed where the IaC tool decision (Stage 16 Step 1) picked Terraform. (Pulumi and AWS CDK would have their own variant skills.)

It has three sub-actions, only one of which is sensitive — keep the distinction clear because `terraform plan` is safe; `terraform apply` to non-dev is the explosive one.

## What It Does

### Sub-action 1: Author IaC source (read-write to workspace, NOT sensitive)

Generates the `infra/` tree under workspace root following `operations/infrastructure-as-code.md` § Step 3:

```
infra/
├── README.md
├── modules/
│   ├── network/
│   ├── service/      # one container service deployment
│   └── data/
├── envs/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── terraform.tf      # provider + remote state config
```

For each cloud target:
- **AWS**: provider config; modules typically use ECS / Fargate / RDS / ElastiCache / S3 / ALB
- **GCP**: provider config; Cloud Run / Cloud SQL / Memorystore / Cloud Storage / Cloud LB
- **Azure**: provider config; Container Apps or App Service / Azure SQL / Azure Cache / Blob Storage / Application Gateway

### Sub-action 2: Run `terraform plan` (read-write to workspace, NOT sensitive)

Runs `terraform plan -out=tfplan` per environment, captures the plan output, and saves it to:

```
aidlc-docs/operations/infrastructure/plans/<env>-<ISO-ts>.txt
```

The plan output is also the **dry-run artifact** that becomes part of the signoff for sub-action 3.

### Sub-action 3: Run `terraform apply` against non-dev (SENSITIVE)

Refuses to run `terraform apply` against staging or production unless:

1. A valid per-action signoff exists at:
   ```
   aidlc-docs/operations/skill-actions/<ts>-terraform-apply-<env>-signoff.md
   ```
2. The signoff validates per `skill-policy.md` § 2:
   - Both `[x]` ticked
   - Names match `pod.md` entries
   - ISO dates within last 7 days
   - Plan-output path resolves to a real file (the same plan being applied)
   - Risk acknowledgement paragraph is non-empty
3. The plan referenced in the signoff matches the current state (Terraform's lock-state-id from `terraform plan` matches what's about to be applied — prevents apply-after-changes)

If any check fails: blocked-by-policy audit entry, refusal with explicit remediation steps.

For `dev` environment, `terraform apply` runs without signoff (dev is treated as ephemeral/throwaway).

## Inputs

- `aidlc-docs/operations/infrastructure/iac-resource-plan.md` (Step 2 of the stage rule)
- `aidlc-docs/aidlc-state.md` (cloud target, Tier)
- `aidlc-docs/inception/units/unit-of-work.md` (which services need infra)
- For sub-action 3: `aidlc-docs/operations/skill-actions/<ts>-terraform-apply-<env>-signoff.md`

## Outputs

For sub-actions 1–2:
- `<workspace-root>/infra/` tree (HCL source)
- `aidlc-docs/operations/infrastructure/plans/<env>-<ts>.txt` (plan outputs)

For sub-action 3:
- `aidlc-docs/operations/infrastructure/<env>-outputs.md` (LB URLs, DB endpoints, etc.)
- `aidlc-docs/operations/infrastructure/apply-history.md` entry
- Two audit.md entries (pre-invocation + post-invocation)

## Governance

- **Free-roam invocation** for sub-actions 1 (author) and 2 (plan): standard audit.md entries, no countersign
- **Sensitive flag**: yes for sub-action 3 (apply to non-dev)
- **Blast radius**: iac-apply
- **Countersign required at**: per-action-signoff
- **Tier scope**: Greenfield, Feature; Bugfix only when infra is the root cause

## Team Conventions Applied

- **Modular structure** — never one monolithic Terraform file with hundreds of resources
- **Per-env directories** — at least dev + prod; staging recommended; values differ (instance sizes, scaling bounds, DB class, multi-AZ flags)
- **Production-only hardening**: multi-AZ databases, read replicas, longer backup retention, stricter network ACLs
- **No hardcoded credentials in HCL** — all sensitive values come from secret manager or Terraform variables loaded from secure backends
- **OIDC / federated auth for CI** — never long-lived access keys checked into pipeline configs
- **Encryption-at-rest enforced** on every storage resource (S3 SSE, RDS encryption, GCS CMEK, etc.) — when Security extension is enabled, this is hard-gated
- **Tags / labels mandatory**: `project`, `env`, `owner`, `cost-center` — Code Review and `terraform plan` flag missing tags
- **Remote state backend** required (Terraform Cloud / S3+DynamoDB / GCS / Azure Blob) — local state is dev-only
- **Plan-then-apply workflow** — apply must reference a saved plan file (`terraform apply tfplan`); ad-hoc `terraform apply` against shared envs is rejected
- **Destroy is dev-only** by convention — `terraform destroy` against staging/prod requires a separate sensitive-action signoff (different blast-radius classification)

## Tier-Specific Behavior

- **Greenfield**: full module structure (network/service/data), all 3 envs, full provisioning
- **Feature**: extend existing modules / add resources scoped to the feature; preserve unchanged resources
- **Bugfix**: skip unless infra is the bug; in that case scope changes to the affected resource(s) only with the same signoff requirement for non-dev apply

## Per-action signoff template (sub-action 3 only)

When this skill needs to apply to staging/prod, it pre-fills the signoff:

```
aidlc-docs/operations/skill-actions/<ISO-timestamp>-terraform-apply-<env>-signoff.md
```

Following the universal template from `skill-policy.md` § 2:

```markdown
# Skill Action Signoff — terraform apply <env>

**Skill**: terraform-iac-author
**Stage**: 16 — Infrastructure-as-Code
**Action summary**: Apply Terraform plan against <env>; modifies <N resources> in <cloud> account <id>
**Plan output (dry-run)**: ../infrastructure/plans/<env>-<ts>.txt
**Plan lock-state-id**: <lock-state-id from terraform plan>
**Tier**: <…>
**Sensitive flag**: yes — blast-radius=iac-apply

- [ ] Tech Lead: ____________  Date: ____________  (ISO 8601)
- [ ] Dev:       ____________  Date: ____________  (ISO 8601)

## Plan summary
<paste of terraform plan output: resources to add / change / destroy with counts and key resource names>

## Risk acknowledgement
<one paragraph from the pod naming what's changing, what could break, and what the rollback is>
```

The skill refuses live-apply without all of:
- both signatures with ISO dates within last 7 days
- plan-output file existing at the cited path
- plan lock-state-id matching the one Terraform sees right now (catches stale signoff)
- risk acknowledgement paragraph non-empty

## Failure modes

- **Cloud credentials unavailable**: setup error → refuse with remediation pointing to OIDC config
- **Remote state backend not configured for shared env**: setup error → refuse
- **Plan-output stale** (state changed since signoff was generated): blocked-by-policy with "regenerate plan and signoff"
- **Signoff missing for non-dev apply**: blocked-by-policy with concrete remediation
- **Tag/label missing on resource** (when Security extension on): blocked at plan time

## See Also

- AI-DLC stage rule: `../../aidlc-rule-details/operations/infrastructure-as-code.md`
- Sensitive-skill governance: `../../skills/skill-policy.md` § 2 (Sensitive Skills)
- Sibling skills: `../dockerfile-generator/SKILL.md` (also sensitive sub-action), `../observability-wirer/SKILL.md`
- Upstream: `./upstream/README.md` (hashicorp/terraform-style-guide, hashicorp/terraform-test)

## Trigger-test prompts

1. "Using AI-DLC, scaffold the Terraform infra for AWS dev/staging/prod." (should trigger Stage 16 sub-action 1)
2. "Run terraform plan against staging." (should trigger sub-action 2; produces plan output but does not apply)
3. "Apply the Terraform plan against production." (should trigger sub-action 3 — SENSITIVE; refuses without signoff)
4. "Generate the Dockerfile for backend-node." (should NOT trigger — that's dockerfile-generator)
5. "Wire Sentry into the FE." (should NOT trigger — that's observability-wirer)

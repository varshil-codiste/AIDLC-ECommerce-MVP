# Infrastructure-as-Code

**Stage**: 16 (conditional)
**Purpose**: Generate IaC for the chosen cloud target so infrastructure is versioned, reproducible, and reviewable. This workflow supports Terraform, Pulumi, and AWS CDK depending on team preference and stack.

**Skills invoked at this stage** (when Terraform is chosen at Step 1): [`terraform-iac-author`](../../skills/operations/terraform-iac-author/SKILL.md). Sub-actions 1 (author HCL) and 2 (`terraform plan`) are not sensitive. Sub-action 3 (`terraform apply` to staging or production) is **sensitive** — refuses to run without a per-action signoff at `aidlc-docs/operations/skill-actions/<ts>-terraform-apply-<env>-signoff.md` per `.aidlc/skills/skill-policy.md` § 2. Pulumi and AWS CDK projects would invoke equivalent variant skills (deferred to v2).

---

## When to Execute

**Execute IF**:
- Cloud target is AWS / GCP / Azure / Mixed (set in Stack Selection Block F.2)
- New infrastructure resources are needed (compute, DB, storage, networking)

**Skip IF**:
- Cloud target is Self-hosted / on-prem (use docker-compose from Deployment Guide directly)
- Infrastructure is unchanged from existing (brownfield with no infra delta)
- Bugfix Tier (almost always)

---

## Prerequisites

- Stage 15 (Deployment Guide) complete
- Cloud target selected
- NFR Design produced `logical-components.md` (lists DB, cache, queue, vector store, etc. that need provisioning)

---

## Execution Steps

### Step 1: Choose IaC Tool

Generate `iac-tool-questions.md`:

```markdown
## Question 1
Which IaC tool will you use?

A) Terraform — multi-cloud, mature, HCL syntax
B) Pulumi — multi-cloud, real programming languages (TS/Python/Go)
C) AWS CDK — AWS-only, real programming languages, generates CloudFormation
D) Cloud-native tools — gcloud config / az cli scripts (Recommended only for very small footprints)
X) Other

[Answer]:

## Question 2
Will you use a remote state backend (Terraform / Pulumi)?

A) Yes — managed (Terraform Cloud / Pulumi Service)
B) Yes — self-managed (S3+DynamoDB / GCS / Azure Blob)
C) No — local state (NOT recommended for team work)
X) Other

[Answer]:

## Question 3
Environment topology?

A) dev + staging + prod (Recommended for product work)
B) dev + prod (small projects)
C) prod only (POCs / internal tools)
X) Other

[Answer]:
```

Wait for answers. Validate.

### Step 2: Plan the Resources

From `logical-components.md` + Stack Selection cloud target, list every cloud resource needed:

| Layer | Typical resources |
|-------|-------------------|
| Compute | ECS / Fargate / Cloud Run / App Engine / EKS / GKE / AKS / VMs |
| Database | RDS Postgres / Cloud SQL / Cosmos DB |
| Cache | ElastiCache Redis / Memorystore / Azure Cache |
| Queue | SQS / Pub/Sub / Service Bus / SNS |
| Object storage | S3 / GCS / Azure Blob |
| Vector store (AI/ML extension) | pgvector via RDS / Pinecone (managed) / Qdrant Cloud |
| CDN | CloudFront / Cloud CDN / Azure Front Door |
| DNS | Route53 / Cloud DNS / Azure DNS |
| Secrets | Secrets Manager / Secret Manager / Key Vault |
| Networking | VPC, subnets (public + private), NAT, ALB / Cloud LB / Application Gateway |
| Monitoring | CloudWatch / Cloud Monitoring / Azure Monitor |
| Identity | IAM roles & policies; OIDC for CI |

Save the plan as `operations/infrastructure/iac-resource-plan.md`.

### Step 3: Generate IaC Source

Place under `<workspace-root>/infra/` (separate from app code):

```
infra/
├── README.md                    # how to plan/apply
├── modules/                     # reusable modules
│   ├── network/
│   ├── service/                 # one container service deployment
│   └── data/
├── envs/
│   ├── dev/
│   ├── staging/
│   └── prod/
├── terraform.tf | Pulumi.yaml | cdk.json
└── .gitignore                   # ignores .terraform, *.tfstate*
```

#### Terraform (sketch)

`infra/modules/service/main.tf`:

```hcl
variable "name"          { type = string }
variable "image"         { type = string }
variable "container_port" { type = number }
variable "min_instances" { type = number, default = 1 }
variable "max_instances" { type = number, default = 4 }
variable "env"           { type = map(string), default = {} }
variable "vpc_id"        { type = string }
variable "subnet_ids"    { type = list(string) }

# ECS service / Cloud Run / App Service depending on cloud
resource "aws_ecs_task_definition" "this" { /* ... */ }
resource "aws_ecs_service" "this"         { /* ... */ }
# ALB target group, listener rule, etc.
```

`infra/envs/staging/main.tf`:

```hcl
module "network"        { source = "../../modules/network"; cidr = "10.20.0.0/16"  }
module "data"           { source = "../../modules/data";    vpc_id = module.network.vpc_id; subnet_ids = module.network.private_subnet_ids }

module "frontend" {
  source         = "../../modules/service"
  name           = "frontend"
  image          = "<registry>/frontend:${var.frontend_tag}"
  container_port = 3000
  vpc_id         = module.network.vpc_id
  subnet_ids     = module.network.private_subnet_ids
  env = {
    NEXT_PUBLIC_API_BASE_URL = "https://api.staging.example.com"
  }
}

# similar modules for backend-node, backend-python, backend-go
```

#### Pulumi (sketch — TypeScript)

```typescript
import * as gcp from "@pulumi/gcp";
import { Service } from "./modules/service";

const network = new Network("staging", { cidr: "10.20.0.0/16" });
const db      = new ManagedPostgres("staging", { tier: "db-g1-small", network });

new Service("frontend", {
  image: `${process.env.REGISTRY}/frontend:${process.env.FE_TAG}`,
  port:  3000,
  env:   { NEXT_PUBLIC_API_BASE_URL: "https://api.staging.example.com" },
});
```

#### AWS CDK (sketch)

```typescript
class StagingStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2 });
    const cluster = new ecs.Cluster(this, "Cluster", { vpc });
    new FrontendService(this, "Frontend", { cluster, image: this.frontendImage });
    new BackendNodeService(this, "BackendNode", { cluster, image: this.beNodeImage });
  }
}
```

### Step 4: Per-Environment Configuration

Each env (dev / staging / prod) has its own variable values:
- Instance sizes
- Auto-scaling bounds
- DB instance class
- Domain name
- Feature flags
- Whether to provision optional services (e.g., ElastiCache only in staging+prod)

Production-only settings:
- Multi-AZ databases
- Read replicas
- Backup retention
- Stricter network ACLs

### Step 5: Plan / Apply Procedure

`operations/infrastructure/runbook.md` (deployment runbook for IaC):

```markdown
# IaC Runbook

## Bootstrap
1. Authenticate to cloud: `aws sso login` / `gcloud auth application-default login` / `az login`
2. Initialize state backend (one-time)
3. `cd infra/envs/dev && terraform init`

## Plan
- `terraform plan -out=tfplan`
- Review `tfplan` summary; confirm resource counts
- Plan output saved to `operations/infrastructure/plans/<env>-<ts>.txt`

## Apply
- `terraform apply tfplan`
- Wait for completion; log start/end times
- Capture output (load balancer URL, DB endpoint) in `operations/infrastructure/<env>-outputs.md`

## Destroy (dev only)
- `terraform destroy` — NEVER run against prod without explicit pod sign-off in audit.md
```

### Step 6: Stage Checklist

`infrastructure-as-code-checklist.md`:
- [ ] Tool selected and recorded in state file
- [ ] Remote state backend configured (or local-state acknowledged for solo work)
- [ ] Module structure: network / service / data / monitoring
- [ ] Per-env directories: at minimum dev + prod
- [ ] No hardcoded credentials in IaC files
- [ ] OIDC / federated auth for CI configured (no long-lived keys)
- [ ] Plan output reviewed before apply (artifact archived)
- [ ] Outputs captured per env
- [ ] Tags / labels applied: `project`, `env`, `owner`, `cost-center` (if the team tracks)
- [ ] Encryption-at-rest enforced on every storage resource (Security extension if on)

### Step 7: Completion Message

```markdown
# Infrastructure-as-Code — Complete ✅

- **Tool**: <Terraform | Pulumi | CDK>
- **Cloud target**: <…>
- **Environments provisioned**: <list>
- **Resources**: <count>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to Observability Setup (Stage 17)
```

---

## Anti-patterns

- ❌ Plain access keys for CI auth — use OIDC / federated identity
- ❌ Hardcoded secrets in IaC source
- ❌ Local state for team projects
- ❌ One monolithic Terraform file with hundreds of resources — modularize
- ❌ No tags / labels — operations can't track cost or ownership
- ❌ Same module config across dev / prod — production needs harder limits
- ❌ Skipping encryption-at-rest when Security extension is enabled

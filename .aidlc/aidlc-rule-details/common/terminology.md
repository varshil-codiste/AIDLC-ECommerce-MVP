# AI-DLC Terminology

## Core Terminology

### Phase vs Stage

**Phase**: One of the three high-level lifecycle phases:
- 🔵 **INCEPTION** — Planning & architecture (WHAT and WHY)
- 🟢 **CONSTRUCTION** — Design, implementation & test (HOW)
- 🟡 **OPERATIONS** — Deployment & operations (DEPLOY and RUN)

**Stage**: An individual workflow activity within a phase. AI-DLC has 17 numbered stages plus 4 gates.

Usage:
- ✅ "The CONSTRUCTION phase contains 6 stage types"
- ✅ "The Code Generation stage is always executed"
- ❌ "The Requirements Analysis phase" (it's a stage)
- ❌ "The CONSTRUCTION stage" (it's a phase)

---

## Customizable Terminology

### Tier
Set by Business Requirements Intake (Stage 1). One of:
- **Greenfield** — new product
- **Feature** — new capability on existing product
- **Bugfix** — defect repair / patch / hotfix

Tier drives checklist size, stage selection, and default depth. See `tiered-mode.md`.

### Pod
A two-person review/approval group: **1 Tech Lead + 1 Dev**. Replaces AWS's "Mob". Defined in `aidlc-docs/pod.md`. See `pod-ritual.md`.

### Gate
A written sign-off checkpoint. AI-DLC has five:
- **Gate #1** — Business Requirements (Pod)
- **Gate #2** — Workflow Plan (Pod)
- **Gate #3** — Code Generation (per Unit of Work) (Pod)
- **Gate #4** — Code Review (per Unit of Work) (AI-DLC verdict + Pod countersign)
- **Gate #5** — Production Readiness (Pod)

Each gate has a signoff `.md` file with the required signatures and ISO dates. Gate #4 additionally carries the AI-DLC's automated PROCEED / BLOCK verdict. See `approval-gates.md`.

### AI-DLC Verdict
The automated PROCEED / BLOCK decision emitted by `construction/code-review.md` after running lint, security scan, unit tests, and AI review on a unit's generated code. The verdict is recorded in the Gate #4 signoff file. PROCEED unblocks Build & Test; BLOCK forces a return to Code Generation Part 2.

### Bolt
A short development cycle (hours to days). Replaces "sprint" in the team's vocabulary. Greenfield projects may run 2-week macro-bolts of multiple sub-bolts; bugfix work fits inside a single bolt.

### Unit of Work (UoW)
A logical grouping of stories for development purposes. The term used during Units Generation and the Construction per-unit loop. Replaces "epic". For a microservices architecture, a UoW typically becomes one independently deployable service. For a full-stack feature, a UoW typically bundles related FE + BE + Mobile work.

### aidlc-docs
The artifact root directory inside the project repo. Contains all generated documentation, plans, signoffs, and state files. **Application code is NEVER stored here.**

---

## Architecture Terminology

### Service
An independently deployable component. In a microservices architecture each service is a separate UoW. In a monolith the whole application is one service.

### Module
A logical grouping of functionality within a single service. Modules are not independently deployable.

### Component
A reusable building block within a service or module — a class, function, package, React component, Flutter widget, or Go package.

### Stack
One of the four primary technology surfaces the team works in:
- **Frontend** — Web (React / Next.js / Vue)
- **Backend Node.js** — JS/TS APIs
- **Backend Python** — Python APIs (often AI/ML)
- **Backend Go** — Go services
- **Mobile** — Flutter (iOS + Android)

A full-stack project typically spans Frontend + at least one Backend stack + Mobile.

---

## Workflow Terminology

### Planning vs Generation
Some stages have two parts:
- **Planning** — produce a plan with checkboxes and questions
- **Generation** — execute the plan to create artifacts

Examples:
- Story Planning → Story Generation
- Units Planning → Units Generation
- Code Generation Part 1 (Planning) → Code Generation Part 2 (Generation)

The pod may sit between Planning and Generation (Gate #3 sits exactly there for Code Generation).

### Depth Levels
- **Minimal** — quick, focused execution
- **Standard** — normal depth with standard artifacts
- **Comprehensive** — full depth for complex / high-risk projects

Default depth comes from Tier — see `depth-levels.md`.

### Always-Execute Stages
Stages that run regardless of Tier:
- Workspace Detection
- Business Requirements Intake
- Requirements Analysis
- Workflow Planning
- Stack Selection (per UoW)
- Code Generation (per UoW)
- Code Review (per UoW)
- Build & Test
- Deployment Guide
- Production Readiness

### Conditional Stages
Stages run based on Tier and content:
- Reverse Engineering (brownfield only)
- User Stories
- Application Design
- Units Generation
- Functional Design
- NFR Requirements
- NFR Design
- Infrastructure-as-Code
- Observability Setup

### Optional Stages
Stages run only if user opts in:
- Design Intake

---

## Artifact Types

### Plans
Documents with checkboxes and questions that guide execution. Located in `aidlc-docs/{phase}/plans/` or per-stage directories.

### Checklists
Universal stage artifact — every stage produces `*-checklist.md`. See `checklist-conventions.md`.

### Signoffs
Gate sign-off artifacts — one per gate. Two signatures + ISO dates. See `approval-gates.md`.

### State Files
- `aidlc-state.md` — overall workflow state
- `audit.md` — append-only audit trail
- `pod.md` — pod roster
- `tier.md` — active Tier

### Reverse Engineering Artifacts (brownfield only)
`business-overview.md`, `architecture.md`, `code-structure.md`, `api-documentation.md`, `component-inventory.md`, `technology-stack.md`, `dependencies.md`, `code-quality-assessment.md`.

---

## Common Abbreviations

| Abbrev | Meaning |
|--------|---------|
| AI-DLC | AI-Driven Development Life Cycle |
| BR | Business Requirements |
| FE | Frontend |
| BE | Backend |
| NFR | Non-Functional Requirements |
| UoW | Unit of Work |
| API | Application Programming Interface |
| IaC | Infrastructure-as-Code |
| WCAG | Web Content Accessibility Guidelines |
| PBT | Property-Based Testing |
| RAG | Retrieval-Augmented Generation |
| MCP | Model Context Protocol |
| SLO | Service-Level Objective |
| SLA | Service-Level Agreement |

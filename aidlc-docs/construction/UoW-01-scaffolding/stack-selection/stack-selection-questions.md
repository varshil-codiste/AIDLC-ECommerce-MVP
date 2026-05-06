# Stack Selection — UoW-01 Project Scaffolding

**Unit**: UoW-01
**Generated**: 2026-05-04T00:27:00Z

Most picks are pre-locked from the codiste preset (`aidlc-profile.md`). UoW-01 is the **right place to lock the few that are still open** because every later UoW inherits them. 6 questions, 5 are confirms (recommendation pre-stated), 1 is genuinely open (package manager).

---

## Q1 — Frontend framework (confirm)

A) **Next.js 14 (App Router)** ← codiste preset
B) Other

[Answer]:A

---

## Q2 — Backend framework (confirm)

A) **NestJS 10** ← codiste preset
B) Other

[Answer]:A

---

## Q3 — ORM (confirm)

A) **Prisma 5** ← codiste preset
B) Other

[Answer]:A

---

## Q4 — Test runner (confirm)

A) **Vitest** ← codiste preset (matches FE + BE; one tool to learn)
B) Jest (Nest's default)
C) Mixed (Vitest FE, Jest BE)
X) Other

[Answer]:A

---

## Q5 — Lint / format (confirm)

A) **ESLint + Prettier** ← codiste preset
B) Biome (single tool, faster)
C) Other

[Answer]:A

---

## Q6 — Package manager (genuinely open)

This is the one decision that isn't pre-fixed. The choice affects monorepo workspace tooling, lockfile discipline, and CI cache configuration.

A) **pnpm** — fastest install in monorepos; built-in workspaces; aligns with codiste-flavored monorepo defaults ← **AI recommends A**
B) npm 10+ — built into Node; workspaces work but slower in big monorepos
C) Yarn 4 (Berry) — workspace-strong, but adds complexity (PnP, .yarnrc.yml)
D) Bun — fastest dev experience but Bun's runtime is not yet 1:1 with Node for NestJS production
X) Other

[Answer]:A

---

## Q7 — Node.js version pin

A) **Node 22 LTS** ← latest LTS as of 2026-05; aligns with NestJS 10, Next.js 14, Prisma 5
B) Node 20 LTS
C) Node 24 (current, non-LTS)
X) Other

[Answer]:A

---

## Note

After answers are recorded I'll generate `tech-stack-decisions.md` and load `construction/stacks/web-conventions.md` + `construction/stacks/be-node-conventions.md` so Stage 12 codegen knows the conventions per stack.

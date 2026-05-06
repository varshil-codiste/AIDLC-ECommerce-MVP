# Business Requirements — Clarification Round 2

**Round**: 2
**Generated**: 2026-05-04T00:05:00Z
**Reason**: Contradictions detected between Round 1 answers. Cannot advance to BR synthesis / Gate #1 until resolved.

---

## C1 — HARD CONTRADICTION: Q5 vs Q10

You answered:
- **Q5 (Monetization)** = **A** — *Pilot, free; one DTC merchant gets it free in exchange for feedback and a logo*
- **Q10 (Legal review)** = **D** — *Internal-only / no public TOS — applies only if Q5 = "Internal / demo"*

Q10 option D was scoped to apply **only when the platform is internal/demo (Q5 = C)**. With a real DTC merchant onboarded under Q5 = A, **real shoppers will hit the system, sign up, share PII, and pay**. Indian DPDP Act 2023 (operative since Q4 2025), GDPR-readiness commitments in your PRD § 9, and even the pilot merchant's own legal exposure all require a published Privacy Policy + Terms of Service before the first shopper transaction.

**Pick one of the following to resolve:**

A) Switch **Q10 to C** — *Not started; will use a SaaS template (iubenda / Termly / Indian DPDP-ready boilerplate) before Closed Beta (M6, week 15)*. This is the lowest-effort fix.

B) Switch **Q10 to B** — *Drafting; engage Codiste's legal counsel by M3, draft ready by M5*.

C) Switch **Q5 to C** — *Internal / demo only; no real external shoppers in MVP*. Then Q10 = D stays valid. (This significantly changes scope: no real merchant onboarding, no real shopper signups, no real payments. PRD § 14 M6 "Closed Beta with 5 merchants + real shoppers" would be cut.)

X) Other — describe

[Answer]:C

---

## C2 — SOFT FLAG: Q2 Lean budget vs codiste-preset operations defaults

You answered **Q2 = A** (Lean, under $25K total for build + 6 months runtime).

Your codiste-preset operations defaults assume:
- **Datadog** APM (≈ $15+/host/month — adds up fast)
- **Terraform Cloud** (free for ≤ 5 users; paid tier kicks in fast)
- **AWS** as cloud target (managed Postgres, ElastiCache Redis, ECS/EKS)
- **Sentry** error tracker

A lean budget likely means a different operations posture. Pick one (this is a soft flag — no contradiction, but worth confirming now so Stage 11 Stack Selection and Stages 16–17 don't propose tools you can't afford):

A) **Keep codiste defaults** — budget will stretch (LLM costs are the dominant variable; operations tooling is fixed); proceed as preset
B) **Substitute lean alternatives** — OTel + self-hosted Grafana instead of Datadog; S3+DynamoDB Terraform state instead of TFC; Hetzner / Vultr / OCI free tier instead of AWS
C) **Hybrid** — keep Sentry (free tier) and GitHub Actions; drop Datadog (use OTel + Grafana); evaluate cloud target at Stage 11
X) Other

[Answer]:C

---

## C3 — SOFT FLAG: Q9 No formal accessibility target

You answered **Q9 = D** (no formal accessibility target, best-effort only).

Two consequences I want you to acknowledge before BR synthesis:

1. **Legal exposure** if a real shopper from the Indian DPDP / EU GDPR jurisdiction reports lack of WCAG 2.2 AA. India's Rights of Persons with Disabilities Act, 2016 obligates digital products to be accessible.
2. **Tech-debt cost** — retrofitting accessibility after launch typically costs 5–10× the cost of building it in. A chat UI with rich widgets is *especially* prone to a11y issues (focus management during streaming, screen-reader announcements for widget renders, keyboard control of carousels).

Pick one to record the decision precisely:

A) **Acknowledged — accept the risk for MVP**; revisit before public/non-pilot launch. (Will be recorded as `risk-accepted-by-pod` in BR.)
B) **Reconsider — switch to WCAG 2.2 AA** as a soft target ("we aim for AA, but won't gate launch on it")
C) **Reconsider — commit to WCAG 2.2 AA** as a hard target (recommended; gates launch)
X) Other

[Answer]:A

---

## Once all three are answered

Reply "done" and I will:
1. Update `business-requirements-checklist.md` with the resolved values
2. Synthesize `business-requirements.md` (the canonical doc)
3. Generate `business-requirements-signoff.md` (Gate #1 template)
4. Hand off to Tech Lead + Dev for sign-off

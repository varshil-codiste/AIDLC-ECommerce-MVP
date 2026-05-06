# Question Round 1 — Profile Setup

**Stage**: 0 — Workspace Detection (post-init)
**Generated**: 2026-05-04
**Why this matters**: AI-DLC must know your team profile (team name, pod, stack defaults, ops preferences) before Stage 1 can begin. The profile drives every adaptation decision downstream.

Please fill in each `[Answer]:` tag, save the file, and tell me you're done.

---

## Question 1 — Apply preset, or fill from scratch?

This is your first AI-DLC project. Would you like to apply a preset to fill the profile with sensible defaults, or fill the profile from scratch?

A) Apply the **codiste** preset — original Codiste flavor: 40-person AI solutions agency, full-stack FE / BE (Node/Python/Go) / Mobile (Flutter); recommended defaults Next.js + NestJS + FastAPI + Flutter Riverpod
B) Fill the profile from scratch (you answer team / pod / stack questions one at a time)
X) Other (please describe after `[Answer]:` tag)

[Answer]: A

---

## Question 2 — Project name

What's the name of this project? (Used in artifacts, README, and the directory layout.)

A) ECommmer-AIDLC (current folder name)
B) Other (please type)

[Answer]:A

---

## Question 3 — Tech Lead (pod signer #1)

Provide the Tech Lead's name and email/handle. Required for Gate #1 sign-off.

Format: `Name <email-or-handle>`

[Answer]: Chintan Bhai (chintan.p@codiste.com)

---

## Question 4 — Dev (pod signer #2)

Provide the Dev's name and email/handle. Required for Gate #1 sign-off.

Format: `Name <email-or-handle>`

[Answer]: Varshil(varshil.g@codiste.in)

---

## Question 5 — Stakeholder (out-of-band, optional)

Optional product stakeholder (PM, designer, founder, customer). They are NOT a gate signer — the Tech Lead represents their intent.

Format: `Name <email-or-handle>` or `none`

[Answer]: None

---

## Notes

- After you answer Question 1 with **A**, the codiste preset will populate stack defaults. You only need to answer Questions 2–5.
- If you answer **B** to Question 1, I'll generate a follow-up question file (Q02) walking each profile section.
- Stage 1 (Business Requirements Intake) will not advance Gate #1 until at minimum `team.name`, `pod.roles` (with names), `project.name`, and `project.workspace_root` are filled in `aidlc-profile.md`.

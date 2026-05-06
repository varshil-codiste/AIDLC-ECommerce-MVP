# Property-Based Testing — Opt-In

**Extension**: Property-Based Testing (10 rules with framework recommendations per stack)
**Full rule file**: `extensions/testing/property-based/property-based-testing.md`

---

## Opt-In Prompt

```markdown
## Question: Property-Based Testing Extension
Should Property-Based Testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (Recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)
C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers)
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

- `A` → load full `property-based-testing.md`; enforce all 10 rules at applicable stages
- `B` → load `property-based-testing.md`; enforce only the partial rule subset (PBT-02, 03, 07, 08, 09)
- `C` → never load the rule file
- `X` → clarify

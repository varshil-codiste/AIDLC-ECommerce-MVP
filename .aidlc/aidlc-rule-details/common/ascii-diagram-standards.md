# ASCII Diagram Standards

## MANDATORY: Use Basic ASCII Only

ALWAYS use basic ASCII characters for diagrams (maximum compatibility across editors and renderers).

### ✅ ALLOWED
`+` `-` `|` `^` `v` `<` `>` and alphanumeric text

### ❌ FORBIDDEN — Unicode box-drawing characters

`┌` `─` `│` `└` `┐` `┘` `├` `┤` `┬` `┴` `┼` `▼` `▲` `►` `◄`

Reason: inconsistent rendering across fonts and platforms.

---

## Standard ASCII Diagram Patterns

### CRITICAL: Character-Width Rule

**Every line in a box MUST have EXACTLY the same character count (including spaces).**

✅ CORRECT (every line is 67 chars):

```
+---------------------------------------------------------------+
|                      Component Name                           |
|  Description text here                                        |
+---------------------------------------------------------------+
```

❌ WRONG (inconsistent widths):

```
+---------------------------------------------------------------+
|                      Component Name                           |
|  Description text here                                   |
+---------------------------------------------------------------+
```

### Box Pattern

```
+-----------------------------------------------------+
|                                                     |
|              Example App                 |
|                                                     |
|  Provides a public-facing showcase of the team's     |
|  case studies, services, and contact form           |
|                                                     |
+-----------------------------------------------------+
```

### Nested Boxes

```
+-------------------------------------------------------+
|              Frontend (Next.js)                       |
|  +-------------------------------------------------+  |
|  |  app/ — App Router                              |  |
|  |  +-------------------------------------------+  |  |
|  |  |  components/ (shadcn + custom widgets)    |  |  |
|  |  |  - Header                                 |  |  |
|  |  |  - Hero                                   |  |  |
|  |  +-------------------------------------------+  |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
```

### Arrows and Connections

```
+----------+
|  Source  |
+----------+
     |
     | HTTP POST /api/contact
     v
+----------+
|  API     |
+----------+
```

### Horizontal Flow

```
+-------+     +--------+     +--------+
| User  | --> | NextJS | --> | API    |
+-------+     +--------+     +--------+
```

### Vertical Flow with Labels

```
User Action Flow:
    |
    v
+----------+
|  Input   |
+----------+
    |
    | validates
    v
+----------+
| Process  |
+----------+
    |
    | returns
    v
+----------+
|  Output  |
+----------+
```

### Customizable Pattern: Three-Stack Block

For full-stack diagrams (the team's most common shape):

```
+---------------------------+   +---------------------------+   +---------------------------+
|        Frontend           |   |         Backend           |   |          Mobile           |
|  React / Next.js / Vue    |<->|  Node / Python / Go       |<->|  Flutter (iOS+Android)    |
|                           |   |                           |   |                           |
+---------------------------+   +---------------------------+   +---------------------------+
              ^                               ^                              ^
              |                               |                              |
              +---------------+---------------+------------------------------+
                              |
                              v
                  +---------------------------+
                  |    Shared Services        |
                  |  (DB, Auth, Storage)      |
                  +---------------------------+
```

---

## Validation Checklist

Before creating any diagram:

- [ ] Basic ASCII only: `+` `-` `|` `^` `v` `<` `>`
- [ ] No Unicode box-drawing characters
- [ ] Spaces (not tabs) for alignment
- [ ] Corners use `+`
- [ ] ALL box lines same character width (count characters including spaces)
- [ ] Test: corners align vertically in a monospace font
- [ ] Diagram has a one-line caption or label above it

---

## Alternative

For complex diagrams, prefer Mermaid. See `content-validation.md` for Mermaid validation rules.

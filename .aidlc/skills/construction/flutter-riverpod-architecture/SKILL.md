---
name: flutter-riverpod-architecture
description: |
  Use when generating Flutter mobile code at AI-DLC Stage 12 (Code Generation) for any UoW where Mobile was chosen and Stack Selection Block E.1 = Riverpod. Enforces the layered lib/features layout with presentation, domain, and data sublayers (per Block E.2), code-gen Riverpod providers, theme tokens pulled from inception/design/design-tokens.md, mocktail-based widget tests, and the mandatory ValueKey naming pattern on every interactive widget. Skips when Mobile isn't in scope or Block E.1 picked BLoC/Provider instead.
aidlc:
  sensitive: false
---

# Flutter Riverpod Architecture

## When to Use (AI-DLC context)

This skill fires at **Stage 12 — Code Generation** Step 7 (Mobile code generation), only when:
- The UoW has Mobile in `unit-of-work.md § Stacks involved`
- Stack Selection Block E.1 picked **Riverpod** (BLoC and Provider would have their own variant skills)

It generates idiomatic Flutter code following the team's `flutter-conventions.md`.

## What It Does

For each mobile screen / feature in the UoW:

1. Generates the layered structure under `lib/features/<feature>/`:
   - `presentation/screens/<screen>.dart` + `presentation/widgets/<widget>.dart`
   - `presentation/providers/<provider>.dart` (code-gen Riverpod with `@riverpod` annotation)
   - `domain/entities/`, `domain/use_cases/`, `domain/repositories/` (interfaces)
   - `data/repositories/` (impls), `data/sources/`, `data/dtos/`
2. Pulls theme from `lib/app/theme.dart` which sources values from `inception/design/design-tokens.md`
3. Adds the **mandatory `Key(ValueKey('<screen>-<role>'))` attribute** to every interactive widget — Code Review Gate #4 enforces
4. Authors widget tests under `test/widget/` and unit tests under `test/unit/` using mocktail (Recommended) or mockito per Block E.3
5. Configures `analysis_options.yaml` with strict rules (strict-casts, strict-inference, strict-raw-types) extending `package:flutter_lints/flutter.yaml`
6. Updates `pubspec.yaml` with new deps; commits `pubspec.lock`

## Inputs

- `aidlc-docs/construction/{unit}/functional-design/mobile-screens.md`
- `aidlc-docs/inception/design/design-tokens.md` (if Design Intake produced one)
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (Block E)
- `aidlc-docs/construction/{unit}/nfr-design/nfr-design-patterns.md`

## Outputs

Source code under the workspace root (NEVER under `aidlc-docs/`) following the Flutter layout in `flutter-conventions.md`:

```
lib/
├── main.dart
├── app/
│   ├── app.dart
│   ├── router.dart
│   └── theme.dart
├── core/
└── features/<feature>/
    ├── presentation/
    ├── domain/
    └── data/
test/
├── unit/
├── widget/
└── integration_test/
pubspec.yaml      ← updated
analysis_options.yaml
```

Plus the code-summary entry in `<unit>-code-summary.md`.

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature; rare on Bugfix

## Team Conventions Applied

- **Code-gen Riverpod** (`@riverpod`) for new code; manual provider authoring rejected
- **Notifier providers** for stateful logic; future / stream providers for async data; `select` to minimize rebuilds
- **`Key(ValueKey('<screen-or-component>-<role>'))`** on every interactive widget (TextFormField, ElevatedButton, GestureDetector, etc.) — naming examples: `signup-form-email`, `signup-form-password`, `signup-form-submit`
- **No hardcoded colors / fonts / sizes** in widgets — always `Theme.of(context).<token>` (theme defined in `lib/app/theme.dart` from design-tokens.md)
- **No `print()`** in production code; use `developer.log` or a logging package
- **No `dynamic` types**
- **MediaQuery.textScaleFactor honored** (no hardcoded font sizes)
- **Tap targets ≥ 44×44 px** (a11y baseline; AA enforced when extension enabled)
- **Synchronous heavy work runs on `compute`** (separate isolate)
- **`dart format --set-exit-if-changed`** and **`dart analyze --fatal-infos --fatal-warnings`** are mandatory at Code Review

## Tier-Specific Behavior

- **Greenfield**: full feature scaffolding with all three layers, full theme/router config, full widget+integration test suite
- **Feature**: scope to the new feature folder; reuse existing core/ and app/ infrastructure
- **Bugfix**: surgical change in the affected widget/provider; preserve everything else

## See Also

- Upstream skill: `./upstream/README.md` (flutter/* official skills + getsentry/sentry-flutter-sdk)
- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-generation.md`
- Stack convention: `../../aidlc-rule-details/construction/stacks/flutter-conventions.md`
- Stack Selection: `../../aidlc-rule-details/construction/stack-selection.md` Block E
- Compliance hooks: extensions/accessibility/wcag22-aa (when enabled — Semantics widgets, contrast, tap targets enforced), extensions/security/baseline (SECURITY-12 secure storage with flutter_secure_storage)

## Trigger-test prompts

1. "Using AI-DLC, scaffold the auth feature in Flutter with Riverpod." (should trigger Stage 12 Mobile)
2. "Generate the SignupScreen widget tree with code-gen Riverpod providers." (should trigger)
3. "Build the profile feature in Flutter with the layered architecture." (should trigger)
4. "Generate the React Native screen for the same flow." (should NOT trigger — wrong stack)
5. "Run flutter test." (should NOT trigger — that's test-runner-aggregator)

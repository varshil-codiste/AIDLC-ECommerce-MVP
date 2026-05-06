# Flutter Mobile Conventions

**Loaded by**: `construction/stack-selection.md` when Mobile Flutter is in scope for a UoW.
**Applies to**: Riverpod / BLoC / Provider per Block E.1.

---

## Project Layout (Recommended: presentation / domain / data)

```
<app-root>/
├── pubspec.yaml
├── pubspec.lock
├── analysis_options.yaml
├── .fvmrc                       # Flutter version pinning
├── lib/
│   ├── main.dart
│   ├── app/                     # MaterialApp + routing + theme
│   │   ├── app.dart
│   │   ├── router.dart
│   │   └── theme.dart
│   ├── core/                    # cross-cutting (errors, network, storage, logger)
│   ├── features/
│   │   └── <feature>/
│   │       ├── presentation/    # widgets / screens
│   │       │   ├── screens/
│   │       │   ├── widgets/
│   │       │   └── providers/   # Riverpod providers (or blocs/)
│   │       ├── domain/          # entities, use cases, repositories (interfaces)
│   │       └── data/            # repository implementations, data sources, dtos
│   └── l10n/
├── test/
│   ├── unit/
│   ├── widget/
│   └── integration_test/
├── android/
├── ios/
├── assets/
└── .env.example
```

### Feature-first alternative
```
lib/features/<feature>/
├── presentation/
├── domain/
└── data/
```

Same structure; just nested under `features/` for module isolation.

---

## Lint / Format / Analyze

| Tool | Team rule |
|------|--------------|
| `dart format --set-exit-if-changed .` | MUST output empty |
| `dart analyze --fatal-infos --fatal-warnings` | MUST pass |
| `analysis_options.yaml` | extend `package:flutter_lints/flutter.yaml` + team-extra strict rules |

Recommended `analysis_options.yaml` baseline:

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  errors:
    invalid_annotation_target: ignore

linter:
  rules:
    - prefer_const_constructors
    - avoid_print
    - require_trailing_commas
    - sort_pub_dependencies
    - use_super_parameters
    - prefer_relative_imports
```

---

## Testing

| Concern | Convention |
|---------|------------|
| Framework | `flutter_test` (built-in) |
| Mocking | `mocktail` (Recommended — null-safe; no codegen) or `mockito` |
| Widget tests | `test/widget/<feature>_screen_test.dart` |
| Unit tests | `test/unit/<feature>_use_case_test.dart` |
| Integration tests | `integration_test/` — run via `flutter test integration_test/` |
| Goldens | `test/goldens/` — opt-in per feature |
| Coverage | `flutter test --coverage` — target 80% line (greenfield) |

### Mandatory `Key()` Convention

Every interactive widget gets a `Key('<screen-or-component>-<role>')`:

```dart
TextFormField(
  key: const ValueKey('signup-form-email'),
  decoration: InputDecoration(labelText: 'Email'),
  ...
)

ElevatedButton(
  key: const ValueKey('signup-form-submit'),
  onPressed: ...,
  child: const Text('Sign up'),
)
```

This is enforced at Code Review (Stage 13).

---

## State Management

### Riverpod (Recommended)

```dart
@riverpod
class SignupController extends _$SignupController {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<void> signup({required String email, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(authRepositoryProvider).signup(email, password);
    });
  }
}
```

- Use code-gen Riverpod (`@riverpod`) for new code
- Notifier providers for stateful logic; future / stream providers for async data
- `select` to minimize rebuilds

### BLoC

- One Bloc per feature use case
- States are immutable (Freezed or sealed classes)
- Events are sealed classes
- `BlocProvider` at the appropriate widget tree level

### Provider (simpler MVVM)

- ChangeNotifier per ViewModel
- ProxyProvider for dependencies between view models
- Acceptable for smaller apps — Riverpod preferred for new production work

---

## Networking

- HTTP client: `dio` (Recommended) or `http` package
- Generated typed clients via `openapi-generator-cli` or `chopper` when contract is OpenAPI
- Interceptors for auth header injection, retry, logging
- Error envelope: parse RFC 7807 problem+json into a typed `AppError`

---

## Persistence

- `shared_preferences` for small key-value
- `flutter_secure_storage` for tokens / sensitive data
- `drift` (Recommended) or `sqflite` for relational data
- `hive` or `isar` for fast NoSQL local data

---

## Theming & Design Tokens

- Theme defined once in `lib/app/theme.dart` from `inception/design/design-tokens.md`
- Use `Theme.of(context)` — never hardcode colors / fonts / sizes in widgets
- Support light + dark themes by default

---

## Accessibility (when extension on)

- Every actionable widget has `Semantics(label: ...)` or relies on built-in semantics
- `MediaQuery.textScaleFactor` honored — avoid hardcoded font sizes
- Tap targets ≥ 44×44 px
- Sufficient contrast via theme tokens

---

## Platform Specifics

- **iOS**: configure signing, capabilities (push, sign-in-with-Apple if used), Info.plist usage descriptions
- **Android**: configure signing, ProGuard / R8 rules, Manifest permissions, target SDK matching app-store-review requirements
- **Web** (if enabled): configure CanvasKit vs HTML renderer per app-design-decisions

---

## Anti-patterns

- ❌ `print()` in production code (use `developer.log` or a logging package)
- ❌ Hardcoded colors / fonts / sizes — use theme tokens
- ❌ `setState` in deeply nested widgets — promote to a provider
- ❌ Missing `Key()` on interactive widgets
- ❌ `dynamic` types
- ❌ Skipping `dart analyze` warnings
- ❌ Synchronous heavy work on the main isolate (use `compute`)

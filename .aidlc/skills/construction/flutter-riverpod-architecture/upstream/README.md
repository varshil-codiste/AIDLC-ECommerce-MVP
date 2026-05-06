# Upstream — flutter-riverpod-architecture

Placeholder for the vendored upstream content.

**Recommended upstream(s)**:
- `flutter/*` official skills bundle (22 skills covering UI, state management, performance, Firebase per VoltAgent's catalog)
- `getsentry/sentry-flutter-sdk` — Sentry instrumentation for Flutter/Dart across iOS/Android/Web

To vendor:

```bash
gh repo clone flutter/<repo> /tmp/flutter-skills
rm -rf .aidlc/skills/construction/flutter-riverpod-architecture/upstream
cp -r /tmp/flutter-skills/<path-to-skill> .aidlc/skills/construction/flutter-riverpod-architecture/upstream
```

The AI-DLC wrapper at `../SKILL.md` adds the mandatory `Key(ValueKey(...))` convention, design-tokens pull from `inception/design/design-tokens.md`, and the layered presentation/domain/data architecture enforcement.

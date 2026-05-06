# NFR Requirements Checklist — UoW-05-chat-shell

- [x] Performance NFRs defined (FCP, first token, widget render, bundle size, React frame time)
- [x] Scalability NFRs defined (SSE per-tab, message list performance)
- [x] Availability NFRs defined (SSE reconnect, graceful degradation)
- [x] Security NFRs defined (JWT storage, CSP, widget payload validation, SSE auth)
- [x] Reliability NFRs defined (Last-Event-ID, sessionStorage persistence, schema validation fallback)
- [x] Observability NFRs defined (Sentry, traceparent, SSE logging)
- [x] Maintainability NFRs defined (80% coverage, ESLint+Prettier, TypeScript strict, widget extensibility)
- [x] Accessibility NFRs defined (keyboard nav, aria-live, contrast, focus management)
- [x] AI/ML NFRs: N/A — UoW-05 is pure FE shell, no LLM integration

import * as Sentry from '@sentry/nestjs';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.GIT_SHA ?? 'dev',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Breadcrumbs and stack traces only — no PII in payloads
    beforeSend(event) {
      if (event.request?.data) {
        event.request.data = '[redacted]';
      }
      return event;
    },
  });
}

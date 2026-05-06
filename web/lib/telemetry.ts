'use client';

import * as Sentry from '@sentry/nextjs';

export function getTraceparent(): string | undefined {
  try {
    const span = Sentry.getActiveSpan?.();
    if (!span) return undefined;
    const ctx = span.spanContext?.();
    if (!ctx) return undefined;
    return `00-${ctx.traceId}-${ctx.spanId}-01`;
  } catch {
    return undefined;
  }
}

export function reportError(err: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

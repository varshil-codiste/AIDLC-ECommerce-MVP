/**
 * Frontend logging shim.
 * Wired to OTel browser-SDK + Sentry in UoW-04.
 * For UoW-01, emits structured-JSON via console.* with the codiste-required base fields.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const base = {
  service: 'web',
  version: process.env.NEXT_PUBLIC_GIT_SHA ?? 'dev',
  environment: process.env.NODE_ENV ?? 'development',
};

function emit(level: Level, message: string, fields: Record<string, unknown> = {}) {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...base,
    ...fields,
  };
  // eslint-disable-next-line no-console
  (console[level] ?? console.log)(JSON.stringify(line));
}

export const log = {
  debug: (msg: string, f?: Record<string, unknown>) => emit('debug', msg, f),
  info: (msg: string, f?: Record<string, unknown>) => emit('info', msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => emit('warn', msg, f),
  error: (msg: string, f?: Record<string, unknown>) => emit('error', msg, f),
};

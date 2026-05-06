import pino from 'pino';
import { trace } from '@opentelemetry/api';
import { requestContext } from '../common/context/request-context';

export function createPinoLogger(): pino.Logger {
  return pino({
    base: {
      service: process.env.OTEL_SERVICE_NAME ?? 'api',
      version: process.env.OTEL_SERVICE_VERSION ?? process.env.GIT_SHA ?? 'dev',
      environment: process.env.NODE_ENV ?? 'development',
    },
    formatters: { level: (label) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin() {
      const span = trace.getActiveSpan();
      const store = requestContext.getStore();
      return {
        traceId: span?.spanContext().traceId ?? store?.traceId ?? 'N/A',
        spanId: span?.spanContext().spanId ?? store?.spanId ?? 'N/A',
        requestId: store?.requestId ?? 'N/A',
      };
    },
  });
}

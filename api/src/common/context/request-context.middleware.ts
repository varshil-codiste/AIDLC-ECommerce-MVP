import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { trace } from '@opentelemetry/api';
import { requestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    const span = trace.getActiveSpan();
    const traceId =
      span?.spanContext().traceId ??
      (req.headers['x-trace-id'] as string | undefined) ??
      randomUUID().replace(/-/g, '');
    const spanId = span?.spanContext().spanId ?? '0000000000000000';

    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Trace-ID', traceId);

    requestContext.run({ requestId, traceId, spanId }, next);
  }
}

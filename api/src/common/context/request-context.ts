import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  traceId: string;
  spanId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

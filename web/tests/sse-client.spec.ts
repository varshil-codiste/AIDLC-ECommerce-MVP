import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SseClient } from '../lib/sse-client';
import type { SseHandlers } from '../lib/types/chat.types';

function makeHandlers(): SseHandlers & { statuses: string[] } {
  const statuses: string[] = [];
  return {
    statuses,
    onToken: vi.fn(),
    onWidget: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
    onStatusChange: (s) => statuses.push(s),
  };
}

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, cb: (e: MessageEvent) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event: string, data: unknown) {
    const e = { data: JSON.stringify(data) } as MessageEvent;
    this.listeners[event]?.forEach((cb) => cb(e));
  }

  close = vi.fn();
}

describe('SseClient', () => {
  let client: SseClient;
  let handlers: ReturnType<typeof makeHandlers>;

  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
    vi.useFakeTimers();
    client = new SseClient();
    handlers = makeHandlers();
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('routes token event to onToken handler', () => {
    client.connect('/stream', handlers);
    const es = MockEventSource.instances[0];
    es.emit('token', { delta: 'Hi ' });
    expect(handlers.onToken).toHaveBeenCalledWith('Hi ');
  });

  it('routes widget event to onWidget handler', () => {
    client.connect('/stream', handlers);
    const es = MockEventSource.instances[0];
    const widget = { type: 'product_card', data: { productId: 'p1', title: 'Shoe', priceUsd: 50 } };
    es.emit('widget', widget);
    expect(handlers.onWidget).toHaveBeenCalledWith(widget);
  });

  it('routes done event to onDone handler and closes connection', () => {
    client.connect('/stream', handlers);
    const es = MockEventSource.instances[0];
    es.emit('done', { messageId: 'msg-1' });
    expect(handlers.onDone).toHaveBeenCalledWith('msg-1');
    expect(es.close).toHaveBeenCalled();
  });

  it('routes error SSE event to onError handler', () => {
    client.connect('/stream', handlers);
    const es = MockEventSource.instances[0];
    es.emit('error', { code: 'server.error', message: 'Internal error' });
    expect(handlers.onError).toHaveBeenCalledWith('server.error', 'Internal error');
  });

  it('schedules reconnect on EventSource onerror with backoff', () => {
    client.connect('/stream', handlers);
    const es1 = MockEventSource.instances[0];
    es1.onerror?.();

    expect(handlers.statuses).toContain('reconnecting');
    expect(MockEventSource.instances).toHaveLength(1); // not yet reconnected

    vi.advanceTimersByTime(1000);
    expect(MockEventSource.instances).toHaveLength(2); // reconnected after 1s
  });

  it('transitions to failed after 3 reconnect attempts', () => {
    client.connect('/stream', handlers);

    // Attempt 0 → fail → reconnect after 1s
    MockEventSource.instances[0].onerror?.();
    vi.advanceTimersByTime(1000);

    // Attempt 1 → fail → reconnect after 2s
    MockEventSource.instances[1].onerror?.();
    vi.advanceTimersByTime(2000);

    // Attempt 2 → fail → reconnect after 4s
    MockEventSource.instances[2].onerror?.();
    vi.advanceTimersByTime(4000);

    // Attempt 3 → fail → no more instances → status = failed
    MockEventSource.instances[3].onerror?.();

    expect(handlers.statuses).toContain('failed');
    expect(handlers.onError).toHaveBeenCalledWith('sse.connection.failed', expect.any(String));
  });

  it('disconnect clears timers and closes connection', () => {
    client.connect('/stream', handlers);
    const es = MockEventSource.instances[0];
    client.disconnect();
    expect(es.close).toHaveBeenCalled();
  });
});

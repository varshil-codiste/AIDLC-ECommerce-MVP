import type { SseHandlers } from './types/chat.types';

const BACKOFF_MS = [1000, 2000, 4000];

export class SseClient {
  private es: EventSource | null = null;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventId: string | null = null;
  private currentUrl: string | null = null;
  private currentHandlers: SseHandlers | null = null;
  // Prevents Chrome's onerror-after-clean-close from triggering a reconnect
  private completedCleanly = false;

  connect(url: string, handlers: SseHandlers): void {
    this.currentUrl = url;
    this.currentHandlers = handlers;
    this.attempts = 0;
    this.completedCleanly = false;
    this._open(url, handlers);
  }

  disconnect(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.es?.close();
    this.es = null;
    this.currentUrl = null;
    this.currentHandlers = null;
    this.lastEventId = null;
    this.attempts = 0;
    this.completedCleanly = false;
  }

  private _open(url: string, handlers: SseHandlers): void {
    const fullUrl = this.lastEventId
      ? `${url}${url.includes('?') ? '&' : '?'}lastEventId=${encodeURIComponent(this.lastEventId)}`
      : url;

    handlers.onStatusChange('connecting');
    this.es = new EventSource(fullUrl, { withCredentials: true });

    this.es.addEventListener('token', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { delta: string };
      handlers.onToken(data.delta);
    });

    this.es.addEventListener('widget', (e: MessageEvent) => {
      handlers.onWidget(JSON.parse(e.data));
    });

    this.es.addEventListener('done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { messageId: string };
      this.lastEventId = data.messageId;
      // Mark clean completion BEFORE closing so Chrome's onerror is ignored
      this.completedCleanly = true;
      handlers.onDone(data.messageId);
      handlers.onStatusChange('idle');
      this.es?.close();
      this.es = null;
    });

    this.es.addEventListener('error', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { code: string; message: string };
      handlers.onError(data.code, data.message);
      handlers.onStatusChange('idle');
      this.es?.close();
      this.es = null;
    });

    this.es.onopen = () => {
      this.attempts = 0;
      handlers.onStatusChange('connected');
    };

    this.es.onerror = () => {
      // Chrome fires onerror when the server closes the connection normally after
      // the 'done' event. Ignore it if the stream already completed cleanly.
      if (this.completedCleanly) return;
      this.es?.close();
      this.es = null;
      this._scheduleReconnect(handlers);
    };
  }

  private _scheduleReconnect(handlers: SseHandlers): void {
    if (this.attempts >= BACKOFF_MS.length) {
      handlers.onStatusChange('failed');
      handlers.onError('sse.connection.failed', 'Connection lost. Please refresh to continue.');
      return;
    }
    handlers.onStatusChange('reconnecting');
    const delay = BACKOFF_MS[this.attempts++];
    this.retryTimer = setTimeout(() => {
      if (this.currentUrl && this.currentHandlers) {
        this.completedCleanly = false;
        this._open(this.currentUrl, this.currentHandlers);
      }
    }, delay);
  }
}

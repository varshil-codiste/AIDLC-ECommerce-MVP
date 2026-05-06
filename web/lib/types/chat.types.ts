export type WidgetType =
  | 'product_card'
  | 'product_carousel'
  | 'product_edit_preview'
  | 'bulk_product_preview'
  | 'order_status_update'
  | 'attention_summary'
  | 'cart_summary'
  | 'order_card'
  | 'order_list'
  | 'tracking_widget'
  | 'payment_widget'
  | 'customer_card'
  | 'dashboard_digest'
  | 'confirmation_prompt'
  | 'notification_inbox';

export interface WidgetIntent {
  intent: string;
  [key: string]: unknown;
}

export type SseStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface WidgetPayload {
  type: WidgetType | string;
  data: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'widget' | 'error';
  content: string;
  widget: WidgetPayload | null;
  streaming: boolean;
  timestamp: number;
}

export interface ChatSessionState {
  messages: ChatMessage[];
  streaming: boolean;
  composerDisabled: boolean;
  role: 'shopper' | 'merchant' | null;
  error: string | null;
  sseStatus: SseStatus;
}

export type ChatAction =
  | { type: 'ADD_USER_MESSAGE'; id: string; content: string }
  | { type: 'START_STREAMING'; messageId: string }
  | { type: 'APPEND_TOKEN'; delta: string }
  | { type: 'ADD_WIDGET'; id: string; widget: WidgetPayload }
  | { type: 'STREAMING_DONE' }
  | { type: 'ADD_ASSISTANT_TEXT'; id: string; content: string }
  | { type: 'ADD_ERROR_MESSAGE'; id: string; message: string }
  | { type: 'SET_SSE_STATUS'; status: SseStatus }
  | { type: 'SET_ROLE'; role: 'shopper' | 'merchant' }
  | { type: 'RESTORE_MESSAGES'; messages: ChatMessage[] };

export interface SseHandlers {
  onToken: (delta: string) => void;
  onWidget: (widget: WidgetPayload) => void;
  onDone: (messageId: string) => void;
  onError: (code: string, message: string) => void;
  onStatusChange: (status: SseStatus) => void;
}

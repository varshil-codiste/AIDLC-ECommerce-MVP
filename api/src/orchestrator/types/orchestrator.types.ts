import type { UserRole } from '../../auth/types/jwt-payload.type';

export type AgentName = 'router' | 'product' | 'cart' | 'order' | 'customer' | 'checkout' | 'noop';

export interface TurnBudget {
  maxTokensIn: number;
  maxTokensOut: number;
  softDeadlineMs: number;
}

export interface ContextSlice {
  role: 'user' | 'assistant';
  content: string;
}

export type WidgetIntentType =
  | 'cart.add'
  | 'cart.update_quantity'
  | 'cart.remove'
  | 'cart.clear'
  | 'cart.checkout'
  | 'product.add_more_variant_clicked'
  | 'product.confirm_create'
  | 'product.edit_more'
  | 'order.track'
  | 'order.start_return'
  | 'confirmation.confirm'
  | 'confirmation.cancel'
  | 'notification.open';

export interface WidgetIntent {
  intent: WidgetIntentType;
  [key: string]: unknown;
}

export interface AgentInput {
  requestId: string;
  conversationId: string;
  user: { id: string; role: UserRole };
  message: string;
  priorContext?: ContextSlice[];
  intent?: WidgetIntent;
  budget: TurnBudget;
}

export type AgentOutput =
  | { type: 'text'; content: string; tokensIn: number; tokensOut: number; costUsd: number }
  | { type: 'widget'; widget: WidgetPayload; tokensIn: number; tokensOut: number; costUsd: number }
  | { type: 'error'; problem: ProblemDetails }
  | { type: 'handoff'; toAgent: AgentName; reason: string; payload: Record<string, unknown> };

export interface WidgetPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface LlmParams {
  systemPrompt: string;
  context: ContextSlice[];
  userMessage: string;
  budget: TurnBudget;
  model: string;
  signal?: AbortSignal;
  tools?: LlmTool[];
}

export interface LlmResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

export interface LlmTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LlmToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface SseTokenEvent {
  event: 'token';
  data: { delta: string };
}

export interface SseWidgetEvent {
  event: 'widget';
  data: WidgetPayload;
}

export interface SseDoneEvent {
  event: 'done';
  data: { messageId: string; usage: { tokensIn: number; tokensOut: number; costUsd: number } };
}

export interface SseErrorEvent {
  event: 'error';
  data: ProblemDetails;
}

export type SseEvent = SseTokenEvent | SseWidgetEvent | SseDoneEvent | SseErrorEvent;

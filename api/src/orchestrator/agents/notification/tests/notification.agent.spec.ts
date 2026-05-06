import { describe, it, expect, vi } from 'vitest';
import type { AgentInput } from '../../../types/orchestrator.types';

const makeInput = (role: 'merchant' | 'shopper' = 'merchant'): AgentInput => ({
  requestId: 'req-1',
  conversationId: 'conv-1',
  user: { id: 'user-1', role },
  message: 'Show me my notifications',
  priorContext: [],
  budget: { maxTokensIn: 4000, maxTokensOut: 800, softDeadlineMs: 8000 },
});

const makeLlm = (response: string) => ({
  modelName: 'gpt-4o-mini',
  complete: vi.fn().mockResolvedValue({ content: response, tokensIn: 10, tokensOut: 20 }),
  streamCompletion: vi.fn(),
});

const makePromptLoader = () => ({ get: vi.fn().mockReturnValue('system prompt') });

const makeNotificationService = () => ({
  list: vi.fn().mockResolvedValue({
    notifications: [
      {
        id: 'notif-1',
        type: 'order.created',
        payload: { orderId: 'ord-1', totalCents: 4999, currency: 'INR' },
        readAt: null,
        createdAt: new Date('2026-05-01T10:00:00Z'),
      },
    ],
    unreadCount: 1,
  }),
  markAllRead: vi.fn().mockResolvedValue(undefined),
});

async function collectOutputs(agent: { execute: (input: AgentInput) => AsyncIterable<unknown> }, input: AgentInput) {
  const outputs = [];
  for await (const o of agent.execute(input)) {
    outputs.push(o);
  }
  return outputs;
}

describe('NotificationAgent', () => {
  it('emits text output for plain text LLM response', async () => {
    const { NotificationAgent } = await import('../notification.agent');
    const llm = makeLlm('You have no new notifications.');
    const agent = new NotificationAgent(llm as never, makePromptLoader() as never, makeNotificationService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    expect(outputs).toHaveLength(1);
    expect((outputs[0] as { type: string }).type).toBe('text');
  });

  it('dispatches notification_list and emits notification_inbox widget', async () => {
    const { NotificationAgent } = await import('../notification.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'notification_list', arguments: { limit: 20 } } });
    const llm = makeLlm(toolResponse);
    const agent = new NotificationAgent(llm as never, makePromptLoader() as never, makeNotificationService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('notification_inbox');
  });

  it('blocks notification_mark_all_read for shopper role with 403', async () => {
    const { NotificationAgent } = await import('../notification.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'notification_mark_all_read', arguments: {} } });
    const llm = makeLlm(toolResponse);
    const agent = new NotificationAgent(llm as never, makePromptLoader() as never, makeNotificationService() as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(403);
  });

  it('emits error after exceeding MAX_TOOL_ITERATIONS', async () => {
    const { NotificationAgent } = await import('../notification.agent');
    // notification_mark_all_read returns {type:'data'} — does not short-circuit, so loop runs to limit
    const toolResponse = JSON.stringify({ tool_call: { name: 'notification_mark_all_read', arguments: {} } });
    const llm = makeLlm(toolResponse);
    const agent = new NotificationAgent(llm as never, makePromptLoader() as never, makeNotificationService() as never);
    const outputs = await collectOutputs(agent, makeInput('merchant'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(500);
  });

  it('notification_inbox widget contains correct notification data shape', async () => {
    const { NotificationAgent } = await import('../notification.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'notification_list', arguments: {} } });
    const llm = makeLlm(toolResponse);
    const agent = new NotificationAgent(llm as never, makePromptLoader() as never, makeNotificationService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widget = outputs.find((o) => (o as { type: string }).type === 'widget') as {
      widget: { data: { notifications: { id: string; type: string; read: boolean }[]; unreadCount: number } };
    };
    expect(widget.widget.data.unreadCount).toBe(1);
    expect(widget.widget.data.notifications[0].id).toBe('notif-1');
    expect(widget.widget.data.notifications[0].type).toBe('order.created');
    expect(widget.widget.data.notifications[0].read).toBe(false);
  });
});

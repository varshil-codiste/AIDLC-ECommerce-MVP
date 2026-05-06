import { Inject, Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LLM_PROVIDER, type ILlmProvider } from '../../llm/llm-provider.interface';
import { PromptLoaderService } from '../../prompts/prompt-loader.service';
import { NotificationService } from '../../../notifications/notification.service';
import { NOTIFICATION_TOOLS, NOTIFICATION_WRITE_TOOLS } from './notification.tools';
import type { IAgent } from '../agent.interface';
import type {
  AgentInput,
  AgentOutput,
  ContextSlice,
  LlmToolCall,
  WidgetPayload,
} from '../../types/orchestrator.types';

const MAX_TOOL_ITERATIONS = 5;

@Injectable()
export class NotificationAgent implements IAgent {
  private readonly logger = new Logger(NotificationAgent.name);
  private readonly tracer = trace.getTracer('notification-agent');

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
    private readonly notificationService: NotificationService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    const systemPrompt = this.promptLoader.get('notification-agent');
    const context: ContextSlice[] = input.priorContext ?? [];

    let iterationCount = 0;
    let userMessage = input.message;

    while (iterationCount < MAX_TOOL_ITERATIONS) {
      iterationCount++;

      const result = await this.llm.complete({
        systemPrompt,
        context,
        userMessage,
        budget: input.budget,
        model: this.llm.modelName,
        tools: NOTIFICATION_TOOLS,
      });

      let toolCall: LlmToolCall | null = null;
      try {
        const parsed = JSON.parse(result.content) as { tool_call?: LlmToolCall };
        if (parsed.tool_call?.name) toolCall = parsed.tool_call;
      } catch {
        // Not JSON — plain text response
      }

      if (!toolCall) {
        yield { type: 'text', content: result.content, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: 0 };
        return;
      }

      if (NOTIFICATION_WRITE_TOOLS.has(toolCall.name) && input.user.role === 'shopper') {
        yield {
          type: 'error',
          problem: {
            type: 'https://errors.ecommmer-aidlc/notification.unauthorized',
            title: 'Notifications are only available to store merchants.',
            status: 403,
          },
        };
        return;
      }

      const toolResult = await this.tracer.startActiveSpan(
        `tool.notification.${toolCall.name}`,
        async (span) => {
          try {
            const r = await this.dispatchTool(toolCall!, input);
            span.setAttribute('success', true);
            return r;
          } catch (err) {
            span.setAttribute('success', false);
            throw err;
          } finally {
            span.end();
          }
        },
      );

      if (toolResult.type === 'widget') {
        yield { type: 'widget', widget: toolResult.widget, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: 0 };
        return;
      }

      if (toolResult.type === 'error') {
        yield toolResult;
        return;
      }

      context.push({ role: 'assistant', content: result.content });
      context.push({ role: 'user', content: `Tool result for ${toolCall.name}: ${JSON.stringify(toolResult.data)}` });
      userMessage = 'Continue based on the tool result above.';
    }

    this.logger.error({ event: 'agent.notification.loop_limit', userId: input.user.id });
    yield {
      type: 'error',
      problem: {
        type: 'https://errors.ecommmer-aidlc/agent.loop_limit',
        title: 'Notification agent exceeded maximum tool iterations',
        status: 500,
      },
    };
  }

  private async dispatchTool(
    toolCall: LlmToolCall,
    input: AgentInput,
  ): Promise<
    | { type: 'data'; data: unknown }
    | { type: 'widget'; widget: WidgetPayload }
    | { type: 'error'; problem: import('../../types/orchestrator.types').ProblemDetails }
  > {
    const args = toolCall.arguments;
    const { id: actorId } = input.user;

    try {
      switch (toolCall.name) {
        case 'notification_list': {
          const limit = (args['limit'] as number | undefined) ?? 20;
          const { notifications, unreadCount } = await this.notificationService.list(actorId, limit);
          const widget: WidgetPayload = {
            type: 'notification_inbox',
            data: {
              notifications: notifications.map((n) => ({
                id: n.id,
                type: n.type,
                message: this.buildMessage(n.type, n.payload as Record<string, unknown>),
                read: n.readAt !== null,
                createdAt: n.createdAt.toISOString(),
                payload: n.payload,
              })),
              unreadCount,
            },
          };
          return { type: 'widget', widget };
        }

        case 'notification_mark_all_read': {
          await this.notificationService.markAllRead(actorId);
          return { type: 'data', data: { markedRead: true } };
        }

        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'tool_execution_failed';
      this.logger.warn({ event: 'tool.call.failed', tool: toolCall.name, error: msg, actorId });
      return {
        type: 'error',
        problem: {
          type: `https://errors.ecommmer-aidlc/${toolCall.name}.failed`,
          title: msg,
          status: 400,
        },
      };
    }
  }

  private buildMessage(type: string, payload: Record<string, unknown>): string {
    if (type === 'order.created') {
      const cents = payload['totalCents'] as number | undefined;
      const currency = (payload['currency'] as string | undefined) ?? 'INR';
      return cents !== undefined
        ? `New order received — ${currency} ${(cents / 100).toFixed(2)}`
        : 'New order received';
    }
    if (type === 'low_stock') {
      return (payload['label'] as string | undefined) ?? 'Low stock alert';
    }
    return type;
  }
}

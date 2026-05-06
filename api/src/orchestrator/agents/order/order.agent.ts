import { Inject, Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LLM_PROVIDER, type ILlmProvider } from '../../llm/llm-provider.interface';
import { PromptLoaderService } from '../../prompts/prompt-loader.service';
import { OrderService } from './order.service';
import { AttentionService } from './attention.service';
import { CustomerService } from '../customer/customer.service';
import { ORDER_TOOLS, ORDER_WRITE_TOOLS } from './order.tools';
import { extractToolCall, stripToolXml } from '../../utils/llm-response';
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
export class OrderAgent implements IAgent {
  private readonly logger = new Logger(OrderAgent.name);
  private readonly tracer = trace.getTracer('order-agent');

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
    private readonly orderService: OrderService,
    private readonly attentionService: AttentionService,
    private readonly customerService: CustomerService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    const systemPrompt = this.promptLoader.get('order-agent');
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
        tools: ORDER_TOOLS,
      });

      const toolCall = extractToolCall(result.content);

      if (!toolCall) {
        yield { type: 'text', content: stripToolXml(result.content), tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: 0 };
        return;
      }

      if (ORDER_WRITE_TOOLS.has(toolCall.name) && input.user.role === 'shopper') {
        yield {
          type: 'error',
          problem: {
            type: 'https://errors.ecommmer-aidlc/order.unauthorized',
            title: 'Order management is only available to store merchants.',
            status: 403,
          },
        };
        return;
      }

      const toolResult = await this.tracer.startActiveSpan(
        `tool.order.${toolCall.name}`,
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

    this.logger.error({ event: 'agent.order.loop_limit', userId: input.user.id });
    yield {
      type: 'error',
      problem: {
        type: 'https://errors.ecommmer-aidlc/agent.loop_limit',
        title: 'Order agent exceeded maximum tool iterations',
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
    const { id: actorId, role: actorRole } = input.user;

    try {
      switch (toolCall.name) {
        case 'order_list': {
          const orders = await this.orderService.list({
            status: args['status'] as string | undefined,
            dateFrom: args['dateFrom'] as string | undefined,
            dateTo: args['dateTo'] as string | undefined,
            limit: args['limit'] as number | undefined,
          });
          const widget: WidgetPayload = {
            type: 'order_list',
            data: {
              orders: orders.map((o) => ({
                orderId: o.id,
                status: o.status,
                totalCents: o.totalCents,
                currency: o.currency,
                placedAt: o.placedAt.toISOString(),
                items: o.items.map((i) => ({
                  title: (i.variant.product as { title: string }).title,
                  quantity: i.quantity,
                  priceAtPurchaseCents: i.priceAtPurchaseCents,
                })),
              })),
              totalCount: orders.length,
            },
          };
          return { type: 'widget', widget };
        }

        case 'order_get': {
          const order = await this.orderService.getById(args['orderId'] as string);
          if (!order) throw new Error('order.not_found');
          const widget: WidgetPayload = {
            type: 'order_card',
            data: {
              orderId: order.id,
              status: order.status,
              totalCents: order.totalCents,
              currency: order.currency,
              placedAt: order.placedAt.toISOString(),
              trackingNumber: order.trackingNumber ?? undefined,
              trackingCarrier: order.trackingCarrier ?? undefined,
              items: order.items.map((i) => ({
                title: (i.variant.product as { title: string }).title,
                quantity: i.quantity,
                priceAtPurchaseCents: i.priceAtPurchaseCents,
              })),
              cancelAction: ['pending', 'confirmed', 'shipped'].includes(order.status)
                ? { intent: 'order.cancel' }
                : undefined,
              refundAction: order.status === 'confirmed' ? { intent: 'order.refund' } : undefined,
            },
          };
          return { type: 'widget', widget };
        }

        case 'order_update_status': {
          const order = await this.orderService.updateStatus(
            args['orderId'] as string,
            args['status'] as string,
            actorId,
            actorRole,
          );
          return { type: 'data', data: { orderId: order.id, status: order.status } };
        }

        case 'order_update_status_bulk': {
          const result = await this.orderService.updateStatusBulk(
            args['orderIds'] as string[],
            args['status'] as string,
            args['trackingNumbers'] as Record<string, string> | undefined,
            args['carrier'] as string | undefined,
            actorId,
            actorRole,
          );
          const widget: WidgetPayload = {
            type: 'order_status_update',
            data: {
              updatedCount: result.succeeded.length,
              failedCount: result.failed.length,
              status: args['status'] as string,
              orders: [
                ...result.succeeded.map((id) => ({ orderId: id, result: 'success' as const })),
                ...result.failed.map((f) => ({ orderId: f.orderId, result: 'failed' as const, error: f.error })),
              ],
            },
          };
          return { type: 'widget', widget };
        }

        case 'order_add_tracking': {
          const order = await this.orderService.addTracking(
            args['orderId'] as string,
            args['trackingNumber'] as string,
            args['carrier'] as string,
            actorId,
            actorRole,
          );
          return { type: 'data', data: { orderId: order.id, trackingNumber: order.trackingNumber, status: order.status } };
        }

        case 'order_cancel': {
          await this.orderService.cancel(args['orderId'] as string, actorId, actorRole);
          return { type: 'data', data: { cancelled: true, orderId: args['orderId'] } };
        }

        case 'order_refund': {
          await this.orderService.refund(args['orderId'] as string, args['reason'] as string | undefined, actorId, actorRole);
          return { type: 'data', data: { refunded: true, orderId: args['orderId'] } };
        }

        case 'merchant_attention': {
          const items = await this.attentionService.summarize();
          if (items.length === 0) {
            return { type: 'data', data: { empty: true } };
          }
          const widget: WidgetPayload = {
            type: 'attention_summary',
            data: {
              items,
              generatedAt: new Date().toISOString(),
            },
          };
          return { type: 'widget', widget };
        }

        case 'customer_add_tag': {
          await this.customerService.addTag(
            args['customerId'] as string,
            args['tags'] as string[],
            actorId,
            actorRole,
          );
          return { type: 'data', data: { tagged: true, customerId: args['customerId'] } };
        }

        case 'order_get_tracking': {
          const result = await this.orderService.getTracking(
            actorId,
            args['orderId'] as string | undefined,
          );
          if (!result) {
            return {
              type: 'error',
              problem: {
                type: 'https://errors.ecommmer-aidlc/order.not_found',
                title: "I don't see that order under your account.",
                status: 404,
              },
            };
          }
          const widget: WidgetPayload = {
            type: 'tracking_widget',
            data: {
              orderId: result.orderId,
              status: result.status,
              trackingNumber: result.trackingNumber,
              trackingCarrier: result.trackingCarrier,
              events: result.events,
            },
          };
          return { type: 'widget', widget };
        }

        case 'order_start_return': {
          const order = await this.orderService.startReturn(
            actorId,
            args['orderId'] as string,
            args['reason'] as string,
          );
          const widget: WidgetPayload = {
            type: 'order_card',
            data: {
              orderId: order.id,
              status: order.status,
              totalCents: order.totalCents,
              currency: order.currency,
              placedAt: order.placedAt.toISOString(),
              items: [],
              ...(order.trackingNumber && { trackingNumber: order.trackingNumber }),
              ...(order.trackingCarrier && { trackingCarrier: order.trackingCarrier }),
            },
          };
          return { type: 'widget', widget };
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
}

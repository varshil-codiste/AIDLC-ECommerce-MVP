import { Inject, Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LLM_PROVIDER, type ILlmProvider } from '../../llm/llm-provider.interface';
import { PromptLoaderService } from '../../prompts/prompt-loader.service';
import { CheckoutService } from './checkout.service';
import { CHECKOUT_TOOLS } from './checkout.tools';
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
export class CheckoutAgent implements IAgent {
  private readonly logger = new Logger(CheckoutAgent.name);
  private readonly tracer = trace.getTracer('checkout-agent');

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
    private readonly checkoutService: CheckoutService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    if (input.user.role !== 'shopper') {
      yield {
        type: 'error',
        problem: {
          type: 'https://errors.ecommmer-aidlc/checkout.unauthorized',
          title: 'Checkout is only available to shoppers.',
          status: 403,
        },
      };
      return;
    }

    const systemPrompt = this.promptLoader.get('checkout-agent');
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
        tools: CHECKOUT_TOOLS,
      });

      const toolCall = extractToolCall(result.content);

      if (!toolCall) {
        yield { type: 'text', content: stripToolXml(result.content), tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: 0 };
        return;
      }

      const toolResult = await this.tracer.startActiveSpan(
        `tool.checkout.${toolCall.name}`,
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

    this.logger.error({ event: 'agent.checkout.loop_limit', userId: input.user.id });
    yield {
      type: 'error',
      problem: {
        type: 'https://errors.ecommmer-aidlc/agent.loop_limit',
        title: 'Checkout agent exceeded maximum tool iterations',
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
    const userId = input.user.id;

    try {
      switch (toolCall.name) {
        case 'address_get_default': {
          const result = await this.checkoutService.checkoutStart(userId);
          return { type: 'data', data: { address: result.address } };
        }

        case 'checkout_start': {
          const result = await this.checkoutService.checkoutStart(userId);
          const widget: WidgetPayload = {
            type: 'payment_widget',
            data: {
              cartId: result.cart.cartId,
              totalCents: result.totalCents,
              currency: result.currency,
              items: result.cart.items.map((i) => ({
                title: i.title,
                variantLabel: i.variantLabel,
                quantity: i.quantity,
                lineTotalCents: i.lineTotalCents,
              })),
              address: result.address,
            },
          };
          return { type: 'widget', widget };
        }

        case 'checkout_pay': {
          const cartId = args['cartId'] as string;
          this.checkoutService.simulatePayment();
          const order = await this.checkoutService.createOrder(userId, cartId);
          const widget: WidgetPayload = {
            type: 'order_card',
            data: {
              orderId: order.id,
              status: order.status,
              totalCents: order.totalCents,
              currency: order.currency,
              placedAt: order.placedAt.toISOString(),
              items: [],
            },
          };
          return { type: 'widget', widget };
        }

        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'tool_execution_failed';
      this.logger.warn({ event: 'tool.call.failed', tool: toolCall.name, error: msg, userId });

      if (msg.startsWith('checkout.stock_conflict:')) {
        return {
          type: 'error',
          problem: {
            type: 'https://errors.ecommmer-aidlc/checkout.stock_conflict',
            title: msg,
            status: 409,
          },
        };
      }

      if (msg === 'checkout.empty_cart') {
        return {
          type: 'error',
          problem: {
            type: 'https://errors.ecommmer-aidlc/checkout.empty_cart',
            title: 'Your cart is empty. Add items before checking out.',
            status: 400,
          },
        };
      }

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

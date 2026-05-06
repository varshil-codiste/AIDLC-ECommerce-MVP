import { Inject, Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LLM_PROVIDER, type ILlmProvider } from '../../llm/llm-provider.interface';
import { PromptLoaderService } from '../../prompts/prompt-loader.service';
import { CartService } from './cart.service';
import { CART_TOOLS, CART_WRITE_TOOLS } from './cart.tools';
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
export class CartAgent implements IAgent {
  private readonly logger = new Logger(CartAgent.name);
  private readonly tracer = trace.getTracer('cart-agent');

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
    private readonly cartService: CartService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    if (input.user.role !== 'shopper') {
      yield {
        type: 'error',
        problem: {
          type: 'https://errors.ecommmer-aidlc/cart.unauthorized',
          title: 'Cart is only available to shoppers.',
          status: 403,
        },
      };
      return;
    }

    const systemPrompt = this.promptLoader.get('cart-agent');
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
        tools: CART_TOOLS,
      });

      const toolCall = extractToolCall(result.content);

      if (!toolCall) {
        yield { type: 'text', content: stripToolXml(result.content), tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: 0 };
        return;
      }

      // Confirmation gate: cart_clear requires a prior confirmation.confirm intent
      if (toolCall.name === 'cart_clear') {
        const confirmed =
          input.intent?.intent === 'confirmation.confirm' &&
          (input.intent as Record<string, unknown>)['action'] === 'cart.clear';

        if (!confirmed) {
          const widget: WidgetPayload = {
            type: 'confirmation_prompt',
            data: {
              message: 'Are you sure you want to clear your entire cart? This cannot be undone.',
              confirmIntent: { intent: 'confirmation.confirm', action: 'cart.clear' },
              cancelIntent: { intent: 'confirmation.cancel' },
            },
          };
          yield { type: 'widget', widget, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: 0 };
          return;
        }
      }

      const toolResult = await this.tracer.startActiveSpan(
        `tool.cart.${toolCall.name}`,
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

    this.logger.error({ event: 'agent.cart.loop_limit', userId: input.user.id });
    yield {
      type: 'error',
      problem: {
        type: 'https://errors.ecommmer-aidlc/agent.loop_limit',
        title: 'Cart agent exceeded maximum tool iterations',
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
        case 'cart_get': {
          const cart = await this.cartService.getEnrichedCart(userId);
          const widget: WidgetPayload = { type: 'cart_summary', data: buildCartSummaryData(cart) };
          return { type: 'widget', widget };
        }

        case 'cart_add': {
          const cart = await this.cartService.addItem(
            userId,
            args['variantId'] as string,
            (args['quantity'] as number | undefined) ?? 1,
          );
          const widget: WidgetPayload = { type: 'cart_summary', data: buildCartSummaryData(cart) };
          return { type: 'widget', widget };
        }

        case 'cart_update_qty': {
          const cart = await this.cartService.updateQty(
            userId,
            args['itemId'] as string,
            args['quantity'] as number,
          );
          const widget: WidgetPayload = { type: 'cart_summary', data: buildCartSummaryData(cart) };
          return { type: 'widget', widget };
        }

        case 'cart_remove': {
          const cart = await this.cartService.removeItem(userId, args['itemId'] as string);
          const widget: WidgetPayload = { type: 'cart_summary', data: buildCartSummaryData(cart) };
          return { type: 'widget', widget };
        }

        case 'cart_clear': {
          const cart = await this.cartService.clearCart(userId);
          const widget: WidgetPayload = { type: 'cart_summary', data: buildCartSummaryData(cart) };
          return { type: 'widget', widget };
        }

        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'tool_execution_failed';
      this.logger.warn({ event: 'tool.call.failed', tool: toolCall.name, error: msg, userId });
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

// Keep CART_WRITE_TOOLS imported to satisfy linter (used in role guard pattern reference)
void CART_WRITE_TOOLS;

function buildCartSummaryData(cart: import('./cart.service').EnrichedCart): Record<string, unknown> {
  return {
    cartId: cart.cartId,
    items: cart.items.map((i) => ({
      itemId: i.itemId,
      variantId: i.variantId,
      title: i.title,
      variantLabel: i.variantLabel,
      priceCents: i.priceCents,
      currency: i.currency,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
      ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}),
    })),
    totalCents: cart.totalCents,
    currency: cart.currency,
    itemCount: cart.itemCount,
  };
}

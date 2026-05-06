import { Inject, Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LLM_PROVIDER, type ILlmProvider } from '../../llm/llm-provider.interface';
import { PromptLoaderService } from '../../prompts/prompt-loader.service';
import { CustomerService } from './customer.service';
import { CUSTOMER_TOOLS, CUSTOMER_WRITE_TOOLS } from './customer.tools';
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
export class CustomerAgent implements IAgent {
  private readonly logger = new Logger(CustomerAgent.name);
  private readonly tracer = trace.getTracer('customer-agent');

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
    private readonly customerService: CustomerService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    const systemPrompt = this.promptLoader.get('customer-agent');
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
        tools: CUSTOMER_TOOLS,
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

      if (CUSTOMER_WRITE_TOOLS.has(toolCall.name) && input.user.role === 'shopper') {
        yield {
          type: 'error',
          problem: {
            type: 'https://errors.ecommmer-aidlc/customer.unauthorized',
            title: 'Customer management is only available to store merchants.',
            status: 403,
          },
        };
        return;
      }

      const toolResult = await this.tracer.startActiveSpan(
        `tool.customer.${toolCall.name}`,
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

    this.logger.error({ event: 'agent.customer.loop_limit', userId: input.user.id });
    yield {
      type: 'error',
      problem: {
        type: 'https://errors.ecommmer-aidlc/agent.loop_limit',
        title: 'Customer agent exceeded maximum tool iterations',
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
        case 'customer_search': {
          const customers = await this.customerService.search(
            args['query'] as string,
            args['limit'] as number | undefined,
          );
          const widget: WidgetPayload = {
            type: 'customer_card',
            data: {
              customers: customers.map((c) => ({
                customerId: c.id,
                email: (c.user as { email: string }).email,
                name: (c.user as { name: string | null }).name,
                ltvCents: c.ltvCents,
                currency: 'INR',
                orderCount: c.orderCount,
                tags: c.tags,
                anonymized: (c.user as { status: string }).status === 'anonymized',
              })),
            },
          };
          return { type: 'widget', widget };
        }

        case 'customer_get': {
          const customer = await this.customerService.getById(args['customerId'] as string);
          if (!customer) throw new Error('customer.not_found');
          const widget: WidgetPayload = {
            type: 'customer_card',
            data: {
              customerId: customer.id,
              email: (customer.user as { email: string }).email,
              name: (customer.user as { name: string | null }).name,
              ltvCents: customer.ltvCents,
              currency: 'INR',
              orderCount: customer.orderCount,
              tags: customer.tags,
              anonymized: (customer.user as { status: string }).status === 'anonymized',
            },
          };
          return { type: 'widget', widget };
        }

        case 'customer_get_top': {
          const customers = await this.customerService.getTopByLTV(
            args['limit'] as number | undefined,
            args['dateFrom'] as string | undefined,
            args['dateTo'] as string | undefined,
          );
          const widget: WidgetPayload = {
            type: 'customer_card',
            data: {
              customers: customers.map((c) => ({
                customerId: c.id,
                email: (c.user as { email: string }).email,
                name: (c.user as { name: string | null }).name,
                ltvCents: 'periodLtvCents' in c ? (c as { periodLtvCents: number }).periodLtvCents : c.ltvCents,
                currency: 'INR',
                orderCount: c.orderCount,
                tags: c.tags,
                anonymized: (c.user as { status: string }).status === 'anonymized',
              })),
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

        case 'customer_anonymize': {
          await this.customerService.anonymize(args['customerId'] as string, actorId, actorRole);
          return { type: 'data', data: { anonymized: true, customerId: args['customerId'] } };
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

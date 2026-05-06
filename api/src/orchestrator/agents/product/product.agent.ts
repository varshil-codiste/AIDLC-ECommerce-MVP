import { Inject, Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { LLM_PROVIDER, type ILlmProvider } from '../../llm/llm-provider.interface';
import { PromptLoaderService } from '../../prompts/prompt-loader.service';
import { ProductService } from './product.service';
import { PRODUCT_TOOLS, WRITE_TOOLS } from './product.tools';
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
export class ProductAgent implements IAgent {
  private readonly logger = new Logger(ProductAgent.name);
  private readonly tracer = trace.getTracer('product-agent');

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
    private readonly productService: ProductService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    const systemPrompt = this.promptLoader.get('product-agent');
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
        tools: PRODUCT_TOOLS,
      });

      // Check for tool call in response
      const toolCall = extractToolCall(result.content);

      if (!toolCall) {
        // Text response — stream and exit loop
        yield {
          type: 'text',
          content: stripToolXml(result.content),
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: 0,
        };
        return;
      }

      // Role guard for write tools
      if (WRITE_TOOLS.has(toolCall.name) && input.user.role === 'shopper') {
        yield {
          type: 'error',
          problem: {
            type: 'https://errors.ecommmer-aidlc/product.unauthorized',
            title: 'Product management is only available to store merchants.',
            status: 403,
          },
        };
        return;
      }

      // Execute the tool
      const toolResult = await this.tracer.startActiveSpan(
        `tool.product.${toolCall.name}`,
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

      // If the tool result is a widget — emit it and return
      if (toolResult.type === 'widget') {
        yield { type: 'widget', widget: toolResult.widget, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costUsd: 0 };
        return;
      }

      if (toolResult.type === 'error') {
        yield toolResult;
        return;
      }

      // Append tool result to context for next LLM call
      context.push({ role: 'assistant', content: result.content });
      context.push({ role: 'user', content: `Tool result for ${toolCall.name}: ${JSON.stringify(toolResult.data)}` });
      userMessage = 'Continue based on the tool result above.';
    }

    // Loop limit exceeded
    this.logger.error({ event: 'agent.product.loop_limit', userId: input.user.id });
    yield {
      type: 'error',
      problem: {
        type: 'https://errors.ecommmer-aidlc/agent.loop_limit',
        title: 'Product agent exceeded maximum tool iterations',
        status: 500,
      },
    };
  }

  private async dispatchTool(
    toolCall: LlmToolCall,
    input: AgentInput,
  ): Promise<{ type: 'data'; data: unknown } | { type: 'widget'; widget: WidgetPayload } | { type: 'error'; problem: import('../../types/orchestrator.types').ProblemDetails }> {
    const args = toolCall.arguments;
    const { id: actorId, role: actorRole } = input.user;

    try {
      switch (toolCall.name) {
        case 'product_search': {
          const filters = {
            ...(args['maxPriceCents'] !== undefined && { maxPriceCents: args['maxPriceCents'] as number }),
            ...(args['categoryId'] !== undefined && { categoryId: args['categoryId'] as string }),
            ...(args['currency'] !== undefined && { currency: args['currency'] as string }),
          };
          const limit = (args['limit'] as number | undefined) ?? 8;
          const { products, usedFallback } = await this.productService.search(
            args['query'] as string,
            filters,
            limit,
          );
          const widget: WidgetPayload = {
            type: 'product_carousel',
            data: {
              query: args['query'] as string,
              usedFallback,
              products: products.map((p) => ({
                productId: p.id,
                title: p.title,
                priceCents: p.priceCents,
                currency: p.currency,
                imageUrl: p.imageUrls?.[0] ?? undefined,
              })),
            },
          };
          return { type: 'widget', widget };
        }

        case 'product_compare': {
          const ids = args['productIds'] as string[];
          const { products, differingAttributes } = await this.productService.compareByIds(ids);
          const widget: WidgetPayload = {
            type: 'product_comparison',
            data: {
              products: products.map((p) => ({
                id: p.id,
                title: p.title,
                priceCents: p.priceCents,
                currency: p.currency,
                ...(p.imageUrls[0] && { imageUrl: p.imageUrls[0] }),
                ...(p.categoryName && { categoryName: p.categoryName }),
                attributes: p.attributes,
              })),
              differingAttributes,
            },
          };
          return { type: 'widget', widget };
        }

        case 'product_get': {
          const product = await this.productService.getById(args['productId'] as string);
          if (!product) return { type: 'data', data: null };
          return { type: 'data', data: product };
        }

        case 'product_list_categories': {
          const categories = await this.productService.listCategories();
          return { type: 'data', data: categories };
        }

        case 'product_create': {
          const product = await this.productService.create(
            {
              title: args['title'] as string,
              priceCents: args['priceCents'] as number,
              stock: args['stock'] as number,
              description: args['description'] as string | undefined,
              currency: args['currency'] as string | undefined,
              categoryId: args['categoryId'] as string | undefined,
              imageUrls: args['imageUrls'] as string[] | undefined,
            },
            actorId,
            actorRole,
          );
          const widget: WidgetPayload = {
            type: 'product_edit_preview',
            data: {
              mode: 'create',
              product: {
                id: product.id,
                title: product.title,
                priceCents: product.priceCents,
                currency: product.currency,
                stock: product.variants[0]?.stock ?? 0,
                description: product.description ?? undefined,
                categoryId: product.categoryId ?? undefined,
                imageUrls: product.imageUrls,
              },
              diff: [],
              confirmAction: { intent: 'product.confirm_create' },
            },
          };
          return { type: 'widget', widget };
        }

        case 'product_update': {
          const productId = args['productId'] as string;
          const before = await this.productService.getById(productId);
          if (!before) throw new Error('product.not_found');

          const patch: Record<string, unknown> = {};
          const diffEntries: Array<{ field: string; from: unknown; to: unknown }> = [];

          const patchFields = ['title', 'description', 'priceCents', 'currency', 'categoryId', 'imageUrls'] as const;
          for (const field of patchFields) {
            if (args[field] !== undefined) {
              patch[field] = args[field];
              diffEntries.push({ field, from: (before as Record<string, unknown>)[field], to: args[field] });
            }
          }

          const product = await this.productService.update(productId, patch as Parameters<ProductService['update']>[1], actorId, actorRole);
          const widget: WidgetPayload = {
            type: 'product_edit_preview',
            data: {
              mode: 'update',
              product: {
                id: product.id,
                title: product.title,
                priceCents: product.priceCents,
                currency: product.currency,
                description: product.description ?? undefined,
                categoryId: product.categoryId ?? undefined,
                imageUrls: product.imageUrls,
              },
              diff: diffEntries,
              confirmAction: { intent: 'product.confirm_create' },
            },
          };
          return { type: 'widget', widget };
        }

        case 'product_update_stock': {
          const variant = await this.productService.updateStock(
            args['variantId'] as string,
            args['stock'] as number,
            actorId,
            actorRole,
          );
          return { type: 'data', data: { variantId: variant.id, stock: variant.stock } };
        }

        case 'product_archive': {
          await this.productService.archive(args['productId'] as string, actorId, actorRole);
          return { type: 'data', data: { archived: true, productId: args['productId'] } };
        }

        case 'product_bulk_create': {
          const products = args['products'] as Array<{ title: string; priceCents: number; stock: number; description?: string; categoryId?: string }>;
          const result = await this.productService.bulkCreate(products, actorId, actorRole);

          const widget: WidgetPayload = {
            type: 'bulk_product_preview',
            data: {
              validCount: result.succeeded.length,
              invalidCount: result.failed.length,
              products: [
                ...result.succeeded.map((s) => ({ title: s.title, errors: [] })),
                ...result.failed.map((f) => ({ title: f.title, errors: [f.error] })),
              ],
              confirmAction: { intent: 'product.confirm_create' },
              cancelAction: { intent: 'confirmation.cancel' },
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

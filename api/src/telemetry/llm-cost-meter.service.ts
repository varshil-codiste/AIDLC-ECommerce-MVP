import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { PrismaService } from '../prisma/prisma.service';
import { requestContext } from '../common/context/request-context';
import { computeCost, PRICING } from './llm-pricing';
import { LlmCallInput } from './types/llm-call.types';

@Injectable()
export class LlmCostMeterService {
  private readonly logger = new Logger(LlmCostMeterService.name);

  constructor(private readonly prisma: PrismaService) {}

  record(input: LlmCallInput): void {
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId ?? requestContext.getStore()?.traceId ?? 'N/A';
    const spanId = span?.spanContext().spanId ?? requestContext.getStore()?.spanId ?? 'N/A';
    const costUsd = computeCost(input.model, input.inputTokens, input.outputTokens);

    if (!PRICING[input.model]) {
      this.logger.warn({ event: 'llm.cost.unknown_model', model: input.model });
    }

    if (span) {
      span.setAttributes({
        'llm.model': input.model,
        'llm.input_tokens': input.inputTokens,
        'llm.output_tokens': input.outputTokens,
        'llm.cost_usd': costUsd,
      });
    }

    this.logger.log({
      event: 'llm.call',
      model: input.model,
      agentModule: input.agentModule,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      costUsd,
    });

    this.insertCostRecord({ traceId, spanId, ...input }, costUsd).catch((err) =>
      this.logger.warn({ event: 'llm.cost.insert_failed', err }),
    );
  }

  async getLast7DaysCost(): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(cost_usd), 0)::text AS total
      FROM app.llm_cost_records
      WHERE called_at > NOW() - INTERVAL '7 days'
    `;
    return parseFloat(rows[0]?.total ?? '0');
  }

  private async insertCostRecord(
    input: LlmCallInput & { traceId: string; spanId: string },
    costUsd: number,
  ): Promise<void> {
    await this.prisma.llmCostRecord.create({
      data: {
        traceId: input.traceId,
        spanId: input.spanId,
        model: input.model,
        agentModule: input.agentModule ?? null,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costUsd,
        calledAt: input.calledAt,
      },
    });
  }
}

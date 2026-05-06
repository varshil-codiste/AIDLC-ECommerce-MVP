import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDER, type ILlmProvider } from '../llm/llm-provider.interface';
import { PromptLoaderService } from '../prompts/prompt-loader.service';
import { stripToolXml } from '../utils/llm-response';
import type { IAgent } from './agent.interface';
import type { AgentInput, AgentOutput, TurnBudget } from '../types/orchestrator.types';

const NOOP_BUDGET: TurnBudget = { maxTokensIn: 1500, maxTokensOut: 200, softDeadlineMs: 4000 };

@Injectable()
export class NoopAgent implements IAgent {
  private readonly logger = new Logger(NoopAgent.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    const systemPrompt = this.promptLoader.get('noop-agent');
    const userMessage = `User role: ${input.user.role}\nMessage: ${input.message}`;

    try {
      const result = await this.llm.complete({
        systemPrompt,
        context: [],
        userMessage,
        budget: NOOP_BUDGET,
        model: this.llm.modelName,
      });
      yield {
        type: 'text',
        content: stripToolXml(result.content) || "Hi there! I can help you browse products, manage your cart, and check out. What would you like to do?",
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costUsd: 0,
      };
    } catch (err) {
      this.logger.error({ event: 'noop.error', err });
      yield {
        type: 'text',
        content: "Hi! I can help you browse products, manage your cart, and check out. What would you like to do?",
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      };
    }
  }
}

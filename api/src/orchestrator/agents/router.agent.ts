import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDER, type ILlmProvider } from '../llm/llm-provider.interface';
import { PromptLoaderService } from '../prompts/prompt-loader.service';
import type { IAgent } from './agent.interface';
import type { AgentInput, AgentName, AgentOutput, TurnBudget } from '../types/orchestrator.types';

const ROUTER_BUDGET: TurnBudget = { maxTokensIn: 1000, maxTokensOut: 100, softDeadlineMs: 3000 };

@Injectable()
export class RouterAgent implements IAgent {
  private readonly logger = new Logger(RouterAgent.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    private readonly promptLoader: PromptLoaderService,
  ) {}

  async *execute(input: AgentInput): AsyncIterable<AgentOutput> {
    const systemPrompt = this.promptLoader.get('orchestrator');
    const userMessage = `User role: ${input.user.role}\nMessage: ${input.message}`;

    try {
      const result = await this.llm.complete({
        systemPrompt,
        context: [],
        userMessage,
        budget: ROUTER_BUDGET,
        model: this.llm.modelName,
      });

      const parsed = JSON.parse(result.content) as { agent: string; reason: string };
      const agentName = (parsed.agent ?? 'noop') as AgentName;

      this.logger.log({
        event: 'router.decision',
        agentName,
        reason: parsed.reason,
        userId: input.user.id,
      });

      yield {
        type: 'handoff',
        toAgent: agentName,
        reason: parsed.reason,
        payload: {},
      };
    } catch (err) {
      this.logger.error({ event: 'router.error', err });
      yield {
        type: 'error',
        problem: {
          type: 'https://errors.ecommmer-aidlc/router.failed',
          title: 'Routing failed',
          status: 500,
          detail: 'Unable to classify intent',
        },
      };
    }
  }
}

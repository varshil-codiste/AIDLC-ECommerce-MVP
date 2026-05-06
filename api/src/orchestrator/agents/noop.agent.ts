import { Injectable } from '@nestjs/common';
import type { IAgent } from './agent.interface';
import type { AgentInput, AgentOutput } from '../types/orchestrator.types';

@Injectable()
export class NoopAgent implements IAgent {
  async *execute(_input: AgentInput): AsyncIterable<AgentOutput> {
    yield {
      type: 'text',
      content:
        "I'm not able to help with that just yet — this feature is coming soon! In the meantime, you can ask me about products, orders, or your cart.",
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    };
  }
}

import type { AgentInput, AgentOutput } from '../types/orchestrator.types';

export const AGENT_REGISTRY = Symbol('AGENT_REGISTRY');

export interface IAgent {
  execute(input: AgentInput): AsyncIterable<AgentOutput>;
}

export type AgentRegistry = Map<string, IAgent>;

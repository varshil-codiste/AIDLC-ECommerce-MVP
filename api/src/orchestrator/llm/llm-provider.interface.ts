import type { LlmParams, LlmResult } from '../types/orchestrator.types';

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface ILlmProvider {
  streamCompletion(params: LlmParams): AsyncIterable<string>;
  complete(params: LlmParams): Promise<LlmResult>;
  modelName: string;
}

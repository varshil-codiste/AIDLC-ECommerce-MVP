export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
}

export const PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-4-6': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-haiku-4-5': { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  'claude-opus-4-7': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01 },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
};

export function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens * pricing.inputPer1k + outputTokens * pricing.outputPer1k) / 1000;
}

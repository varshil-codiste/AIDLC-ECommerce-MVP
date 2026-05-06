export interface LlmCallInput {
  model: string;
  agentModule?: string;
  inputTokens: number;
  outputTokens: number;
  calledAt: Date;
}

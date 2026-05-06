import { ConfigService } from '@nestjs/config';
import { OpenAiLlmProvider } from './openai-llm.provider';
import { AnthropicLlmProvider } from './anthropic-llm.provider';
import type { ILlmProvider } from './llm-provider.interface';

export function llmProviderFactory(config: ConfigService): ILlmProvider {
  const provider = config.get<string>('LLM_PROVIDER', 'openai');
  if (provider === 'anthropic') return new AnthropicLlmProvider(config);
  return new OpenAiLlmProvider(config);
}

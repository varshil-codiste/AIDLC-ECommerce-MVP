import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ILlmProvider } from './llm-provider.interface';
import type { LlmParams, LlmResult } from '../types/orchestrator.types';

@Injectable()
export class OpenAiLlmProvider implements ILlmProvider {
  private readonly client: OpenAI;
  readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: this.config.getOrThrow<string>('LLM_API_KEY') });
    this.modelName = this.config.get<string>('LLM_MODEL', 'gpt-4o-mini');
  }

  async *streamCompletion(params: LlmParams): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.modelName,
        max_tokens: params.budget.maxTokensOut,
        messages: [
          { role: 'system', content: params.systemPrompt },
          ...params.context.map((c) => ({
            role: c.role as 'user' | 'assistant',
            content: c.content,
          })),
          { role: 'user', content: params.userMessage },
        ],
        stream: true,
      },
      { signal: params.signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async complete(params: LlmParams): Promise<LlmResult> {
    const response = await this.client.chat.completions.create(
      {
        model: this.modelName,
        max_tokens: params.budget.maxTokensOut,
        messages: [
          { role: 'system', content: params.systemPrompt },
          ...params.context.map((c) => ({
            role: c.role as 'user' | 'assistant',
            content: c.content,
          })),
          { role: 'user', content: params.userMessage },
        ],
      },
      { signal: params.signal },
    );
    return {
      content: response.choices[0]?.message?.content ?? '',
      tokensIn: response.usage?.prompt_tokens ?? 0,
      tokensOut: response.usage?.completion_tokens ?? 0,
    };
  }
}

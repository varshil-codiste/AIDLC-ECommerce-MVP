import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { ILlmProvider } from './llm-provider.interface';
import type { LlmParams, LlmResult } from '../types/orchestrator.types';

@Injectable()
export class AnthropicLlmProvider implements ILlmProvider {
  private readonly client: Anthropic;
  readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.getOrThrow<string>('LLM_API_KEY') });
    this.modelName = this.config.get<string>('LLM_MODEL', 'claude-haiku-4-5-20251001');
  }

  async *streamCompletion(params: LlmParams): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: this.modelName,
      max_tokens: params.budget.maxTokensOut,
      system: params.systemPrompt,
      messages: [
        ...params.context.map((c) => ({
          role: c.role as 'user' | 'assistant',
          content: c.content,
        })),
        { role: 'user', content: params.userMessage },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async complete(params: LlmParams): Promise<LlmResult> {
    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: params.budget.maxTokensOut,
      system: params.systemPrompt,
      messages: [
        ...params.context.map((c) => ({
          role: c.role as 'user' | 'assistant',
          content: c.content,
        })),
        { role: 'user', content: params.userMessage },
      ],
    });
    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return {
      content,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }
}

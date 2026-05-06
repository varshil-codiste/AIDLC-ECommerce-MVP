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
    // Always offer tools when the agent provided them — Claude chooses tool vs text per turn.
    // We use plain-text content for context (not structured tool_use/tool_result blocks),
    // so there's no API-level pairing requirement between turns.
    const anthropicTools = params.tools?.length
      ? params.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters as Anthropic.Tool['input_schema'],
        }))
      : undefined;

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
      ...(anthropicTools && { tools: anthropicTools }),
    });

    // Native tool_use block → serialize as Format 1 JSON for extractToolCall()
    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (toolUse) {
      return {
        content: JSON.stringify({ tool_call: { name: toolUse.name, arguments: toolUse.input } }),
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
      };
    }

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return {
      content,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }
}

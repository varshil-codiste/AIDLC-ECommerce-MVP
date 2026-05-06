import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER } from './llm-provider.interface';
import { llmProviderFactory } from './llm-provider.factory';

@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: llmProviderFactory,
      inject: [ConfigService],
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}

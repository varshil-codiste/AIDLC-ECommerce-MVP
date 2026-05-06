import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMS = 1536;
const DEFAULT_TIMEOUT_MS = 800;

export class EmbeddingTimeoutError extends Error {
  constructor() {
    super('embedding.timeout');
    this.name = 'EmbeddingTimeoutError';
  }
}

export class EmbeddingApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingApiError';
  }
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: this.config.getOrThrow<string>('LLM_API_KEY') });
  }

  async embed(text: string, options?: { timeoutMs?: number }): Promise<number[]> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const result = await this.client.embeddings.create(
        { model: EMBEDDING_MODEL, input: text },
        { signal: controller.signal },
      );
      const durationMs = Date.now() - startedAt;
      const embedding = result.data[0]?.embedding;
      if (!embedding || embedding.length !== EMBEDDING_DIMS) {
        throw new EmbeddingApiError(`unexpected embedding shape: ${embedding?.length ?? 'null'}`);
      }
      this.logger.log({ event: 'embedding.call.success', durationMs, model: EMBEDDING_MODEL });
      return embedding;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      if (controller.signal.aborted || (err as Error).name === 'AbortError') {
        this.logger.warn({ event: 'embedding.call.timeout', durationMs, timeoutMs });
        throw new EmbeddingTimeoutError();
      }
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn({ event: 'embedding.call.failed', durationMs, error: msg });
      throw err instanceof EmbeddingApiError ? err : new EmbeddingApiError(msg);
    } finally {
      clearTimeout(timer);
    }
  }
}

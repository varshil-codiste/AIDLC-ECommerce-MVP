import { describe, it, expect, vi, beforeEach } from 'vitest';

const makeOpenAI = (impl: (...args: unknown[]) => Promise<unknown>) => ({
  embeddings: { create: vi.fn(impl) },
});

const makeConfig = (apiKey = 'test-key') => ({
  getOrThrow: vi.fn().mockReturnValue(apiKey),
});

vi.mock('openai', () => {
  const constructor = vi.fn();
  return { default: constructor };
});

import OpenAI from 'openai';
import { EmbeddingService, EmbeddingTimeoutError, EmbeddingApiError } from '../embedding.service';
import type { ConfigService } from '@nestjs/config';

describe('EmbeddingService', () => {
  let openAiMock: ReturnType<typeof makeOpenAI>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeService(impl: (...args: unknown[]) => Promise<unknown>): EmbeddingService {
    openAiMock = makeOpenAI(impl);
    (OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => openAiMock);
    return new EmbeddingService(makeConfig() as unknown as ConfigService);
  }

  it('embed returns 1536-dim vector on success', async () => {
    const service = makeService(async () => ({
      data: [{ embedding: new Array(1536).fill(0.1) }],
    }));
    const result = await service.embed('hello world');
    expect(result).toHaveLength(1536);
    expect(openAiMock.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'text-embedding-3-small', input: 'hello world' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('embed throws EmbeddingTimeoutError when AbortController fires', async () => {
    const service = makeService(
      async (...args: unknown[]) =>
        new Promise((_resolve, reject) => {
          const opts = args[1] as { signal: AbortSignal };
          opts.signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    await expect(service.embed('text', { timeoutMs: 50 })).rejects.toBeInstanceOf(EmbeddingTimeoutError);
  });

  it('embed throws EmbeddingApiError on API error', async () => {
    const service = makeService(async () => {
      throw new Error('rate limited');
    });
    await expect(service.embed('text')).rejects.toBeInstanceOf(EmbeddingApiError);
  });

  it('embed throws EmbeddingApiError when result has unexpected shape', async () => {
    const service = makeService(async () => ({ data: [{ embedding: [1, 2, 3] }] }));
    await expect(service.embed('text')).rejects.toBeInstanceOf(EmbeddingApiError);
  });
});

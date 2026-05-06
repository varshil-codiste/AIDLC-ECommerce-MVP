import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmbeddingService } from './embedding.service';
import { ProductSearchIndexService } from '../agents/product/product-search-index.service';

const STREAM = 'events:product';
const CURSOR_KEY = 'embedding:stream_cursor';
const BATCH_SIZE = 25;
const WORKER_TIMEOUT_MS = 5000;

interface ProductForEmbedding {
  id: string;
  title: string;
  description: string | null;
  category: { name: string } | null;
  variants: { attributes: unknown }[];
}

export function buildTextBlob(p: ProductForEmbedding): string {
  const parts: string[] = [p.title];
  if (p.description) parts.push(p.description);
  if (p.category?.name) parts.push(p.category.name);
  for (const v of p.variants) {
    if (v.attributes && typeof v.attributes === 'object') {
      const flat = Object.entries(v.attributes as Record<string, unknown>)
        .map(([k, val]) => `${k}:${val}`)
        .join(' ');
      if (flat) parts.push(flat);
    }
  }
  return parts.join('\n').trim();
}

@Injectable()
export class EmbeddingRefreshWorker {
  private readonly logger = new Logger(EmbeddingRefreshWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly embeddingService: EmbeddingService,
    private readonly searchIndexService: ProductSearchIndexService,
  ) {}

  @Interval(2000)
  async pollProductStream(): Promise<void> {
    const cursor = (await this.redis.hget(CURSOR_KEY, STREAM)) ?? '0';
    const messages = await this.redis.xreadMessages(STREAM, cursor, BATCH_SIZE);
    if (messages.length === 0) return;

    let lastSuccessId = cursor;
    for (const msg of messages) {
      const productId = this.parseProductId(msg.data);
      if (!productId) {
        lastSuccessId = msg.id;
        continue;
      }
      try {
        await this.refreshProduct(productId);
        lastSuccessId = msg.id;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'unknown';
        this.logger.warn({ event: 'embedding.refresh.failed', productId, error });
        // Cursor stays at last successful — message redelivered next cycle
        break;
      }
    }
    if (lastSuccessId !== cursor) {
      await this.redis.hset(CURSOR_KEY, STREAM, lastSuccessId);
    }
  }

  async refreshProduct(productId: string): Promise<void> {
    const startedAt = Date.now();
    const product = (await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: { select: { name: true } }, variants: { select: { attributes: true } } },
    })) as ProductForEmbedding | null;
    if (!product) {
      this.logger.warn({ event: 'embedding.refresh.product_missing', productId });
      return;
    }
    const textBlob = buildTextBlob(product);
    const embedding = await this.embeddingService.embed(textBlob, { timeoutMs: WORKER_TIMEOUT_MS });
    await this.searchIndexService.upsert(productId, embedding, textBlob);
    this.logger.log({ event: 'embedding.refresh.success', productId, durationMs: Date.now() - startedAt });
  }

  private parseProductId(data: Record<string, string>): string | null {
    const eventType = data['eventType'];
    if (eventType !== 'product.created' && eventType !== 'product.updated') return null;
    try {
      const payload = JSON.parse(data['payload'] ?? '{}') as { productId?: string };
      return typeof payload.productId === 'string' ? payload.productId : null;
    } catch {
      return null;
    }
  }
}

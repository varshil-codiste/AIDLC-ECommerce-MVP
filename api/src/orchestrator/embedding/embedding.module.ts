import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { EmbeddingService } from './embedding.service';
import { EmbeddingRefreshWorker } from './embedding-refresh.worker';
import { ProductSearchIndexService } from '../agents/product/product-search-index.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [EmbeddingService, EmbeddingRefreshWorker, ProductSearchIndexService],
  exports: [EmbeddingService, ProductSearchIndexService],
})
export class EmbeddingModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../audit/audit-log.service';
import { EmbeddingService, EmbeddingTimeoutError, EmbeddingApiError } from '../../embedding/embedding.service';
import { ProductSearchIndexService, type RankedProductRow, type SearchFilters } from './product-search-index.service';
import { randomUUID } from 'crypto';

export interface ProductDraft {
  title: string;
  priceCents: number;
  stock: number;
  description?: string;
  currency?: string;
  categoryId?: string;
  imageUrls?: string[];
}

export interface BulkCreateResult {
  succeeded: Array<{ title: string; productId: string }>;
  failed: Array<{ title: string; error: string }>;
}

export interface ProductSearchResult {
  products: Array<Omit<RankedProductRow, 'score'>>;
  usedFallback: boolean;
}

export interface ProductForCompare {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
  description: string | null;
  imageUrls: string[];
  categoryName: string | null;
  attributes: Record<string, string>;
}

export interface ComparisonResult {
  products: ProductForCompare[];
  differingAttributes: string[];
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly embeddingService: EmbeddingService,
    private readonly searchIndexService: ProductSearchIndexService,
  ) {}

  async search(query: string, filters: SearchFilters = {}, limit = 8): Promise<ProductSearchResult> {
    try {
      const embedding = await this.embeddingService.embed(query);
      const rows = await this.searchIndexService.searchByVector(embedding, limit, filters);
      this.logger.log({ event: 'search.semantic.executed', resultCount: rows.length });
      return { products: rows.map(this.stripScore), usedFallback: false };
    } catch (err) {
      const reason = err instanceof EmbeddingTimeoutError
        ? 'embedding_timeout'
        : err instanceof EmbeddingApiError
        ? 'embedding_api_error'
        : 'kNN_failure';
      this.logger.warn({ event: 'search.semantic.fallback', reason });
      const rows = await this.searchIndexService.searchByKeyword(query, limit, filters);
      return { products: rows.map(this.stripScore), usedFallback: true };
    }
  }

  private stripScore(row: RankedProductRow): Omit<RankedProductRow, 'score'> {
    const { score, ...rest } = row;
    void score;
    return rest;
  }

  async compareByIds(ids: string[]): Promise<ComparisonResult> {
    if (ids.length < 2) throw new Error('product_compare.too_few');
    const capped = ids.slice(0, 3);
    const products = await this.prisma.product.findMany({
      where: { id: { in: capped }, status: 'active' },
      include: { category: { select: { name: true } }, variants: { select: { attributes: true } } },
    });
    const sorted = capped
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p != null);
    const compareModels: ProductForCompare[] = sorted.map((p) => ({
      id: p.id,
      title: p.title,
      priceCents: p.priceCents,
      currency: p.currency,
      description: p.description ?? null,
      imageUrls: p.imageUrls ?? [],
      categoryName: p.category?.name ?? null,
      attributes: this.mergeVariantAttributes(p.variants.map((v) => v.attributes)),
    }));
    return ProductService.buildComparisonAttributes(compareModels);
  }

  private mergeVariantAttributes(variantAttrs: unknown[]): Record<string, string> {
    const merged: Record<string, string> = {};
    for (const attrs of variantAttrs) {
      if (attrs && typeof attrs === 'object') {
        for (const [k, v] of Object.entries(attrs as Record<string, unknown>)) {
          if (!(k in merged)) merged[k] = String(v);
        }
      }
    }
    return merged;
  }

  static buildComparisonAttributes(products: ProductForCompare[]): ComparisonResult {
    const allKeys = new Set<string>();
    for (const p of products) for (const k of Object.keys(p.attributes)) allKeys.add(k);
    const differing: string[] = [];
    for (const k of allKeys) {
      const values = products.map((p) => p.attributes[k] ?? null);
      const unique = new Set(values);
      if (unique.size > 1) differing.push(k);
    }
    differing.sort();
    return { products, differingAttributes: differing };
  }

  async getById(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, variants: true },
    });
  }

  async listCategories() {
    return this.prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(draft: ProductDraft, actorId: string, actorRole: string) {
    return this.prisma.$transaction(async (tx) => {
      const sku = await this.generateUniqueSku(draft.title);
      const product = await tx.product.create({
        data: {
          title: draft.title,
          description: draft.description ?? null,
          priceCents: draft.priceCents,
          currency: draft.currency ?? 'INR',
          categoryId: draft.categoryId ?? null,
          imageUrls: draft.imageUrls ?? [],
          status: 'active',
          createdByUserId: actorId,
          variants: {
            create: {
              sku,
              stock: draft.stock,
              attributes: {},
            },
          },
        },
        include: { variants: true },
      });

      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'create',
        entity: 'product',
        entityId: product.id,
        after: { title: product.title, priceCents: product.priceCents, status: product.status },
      });

      await tx.agentEvent.create({
        data: {
          eventType: 'product.created',
          payload: { productId: product.id } as Prisma.InputJsonValue,
          emittedByModule: 'ProductService',
        },
      });

      this.logger.log({ event: 'tool.call', tool: 'product_create', productId: product.id, actorId, success: true });
      return product;
    });
  }

  async update(productId: string, patch: Partial<ProductDraft>, actorId: string, actorRole: string) {
    const before = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!before) throw new Error('product.not_found');
    if (before.status === 'archived') throw new Error('product.archived');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.priceCents !== undefined && { priceCents: patch.priceCents }),
          ...(patch.currency !== undefined && { currency: patch.currency }),
          ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
          ...(patch.imageUrls !== undefined && { imageUrls: patch.imageUrls }),
        },
      });

      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'update',
        entity: 'product',
        entityId: productId,
        before: { title: before.title, priceCents: before.priceCents },
        after: { title: product.title, priceCents: product.priceCents },
      });

      await tx.agentEvent.create({
        data: {
          eventType: 'product.updated',
          payload: { productId } as Prisma.InputJsonValue,
          emittedByModule: 'ProductService',
        },
      });

      this.logger.log({ event: 'tool.call', tool: 'product_update', productId, actorId, success: true });
      return product;
    });
  }

  async updateStock(variantId: string, stock: number, actorId: string, actorRole: string) {
    const before = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!before) throw new Error('variant.not_found');

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock },
      });

      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'update_stock',
        entity: 'product_variant',
        entityId: variantId,
        before: { stock: before.stock },
        after: { stock },
      });

      this.logger.log({ event: 'tool.call', tool: 'product_update_stock', variantId, actorId, success: true });
      return variant;
    });
  }

  async archive(productId: string, actorId: string, actorRole: string) {
    const before = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!before) throw new Error('product.not_found');
    if (before.status === 'archived') throw new Error('product.already_archived');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: { status: 'archived' },
      });

      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'archive',
        entity: 'product',
        entityId: productId,
        before: { status: 'active' },
        after: { status: 'archived' },
      });

      this.logger.log({ event: 'tool.call', tool: 'product_archive', productId, actorId, success: true });
      return product;
    });
  }

  async bulkCreate(drafts: ProductDraft[], actorId: string, actorRole: string): Promise<BulkCreateResult> {
    const succeeded: BulkCreateResult['succeeded'] = [];
    const failed: BulkCreateResult['failed'] = [];

    for (const draft of drafts) {
      try {
        const product = await this.create(draft, actorId, actorRole);
        succeeded.push({ title: draft.title, productId: product.id });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'unknown_error';
        failed.push({ title: draft.title, error });
        this.logger.warn({ event: 'tool.call', tool: 'product_bulk_create', title: draft.title, error, actorId });
      }
    }

    this.logger.log({ event: 'tool.call', tool: 'product_bulk_create', attempted: drafts.length, succeeded: succeeded.length, failed: failed.length, actorId });
    return { succeeded, failed };
  }

  private async generateUniqueSku(title: string, attempt = 0): Promise<string> {
    if (attempt >= 5) throw new Error('product.sku.conflict');
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
    const suffix = randomUUID().replace(/-/g, '').slice(0, 4);
    const sku = attempt === 0 ? `${slug}-${suffix}` : `${slug}-${suffix}${attempt}`;
    const existing = await this.prisma.productVariant.findUnique({ where: { sku } });
    if (existing) return this.generateUniqueSku(title, attempt + 1);
    return sku;
  }
}

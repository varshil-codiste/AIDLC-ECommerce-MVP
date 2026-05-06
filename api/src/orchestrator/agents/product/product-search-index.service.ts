import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface SearchFilters {
  categoryId?: string;
  maxPriceCents?: number;
  currency?: string;
}

export interface RankedProductRow {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  currency: string;
  categoryId: string | null;
  status: string;
  imageUrls: string[];
  score: number;
}

@Injectable()
export class ProductSearchIndexService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(productId: string, embedding: number[], textBlob: string): Promise<void> {
    const vectorLiteral = `[${embedding.join(',')}]`;
    await this.prisma.$executeRaw`
      INSERT INTO "app"."product_search_index" ("product_id", "embedding", "text_blob", "tsv", "updated_at")
      VALUES (${productId}::uuid, ${vectorLiteral}::vector, ${textBlob}, to_tsvector('english', ${textBlob}), NOW())
      ON CONFLICT ("product_id") DO UPDATE SET
        "embedding" = EXCLUDED."embedding",
        "text_blob" = EXCLUDED."text_blob",
        "tsv" = EXCLUDED."tsv",
        "updated_at" = NOW();
    `;
  }

  async searchByVector(
    embedding: number[],
    limit: number,
    filters: SearchFilters = {},
  ): Promise<RankedProductRow[]> {
    const vectorLiteral = `[${embedding.join(',')}]`;
    const cap = Math.max(1, Math.min(limit, 50));

    const where: Prisma.Sql[] = [Prisma.sql`p."status" = 'active'`];
    if (filters.categoryId) where.push(Prisma.sql`p."category_id" = ${filters.categoryId}::uuid`);
    if (filters.currency) where.push(Prisma.sql`p."currency" = ${filters.currency}`);
    if (typeof filters.maxPriceCents === 'number') {
      where.push(Prisma.sql`p."price_cents" <= ${filters.maxPriceCents}`);
    }
    const whereClause = Prisma.join(where, ' AND ');

    const rows = await this.prisma.$queryRaw<RankedProductRow[]>(Prisma.sql`
      SELECT
        p."id"             AS "id",
        p."title"          AS "title",
        p."description"    AS "description",
        p."price_cents"    AS "priceCents",
        p."currency"       AS "currency",
        p."category_id"    AS "categoryId",
        p."status"         AS "status",
        p."image_urls"     AS "imageUrls",
        (1 - (psi."embedding" <=> ${vectorLiteral}::vector))::float AS "score"
      FROM "app"."product_search_index" psi
      JOIN "app"."products" p ON p."id" = psi."product_id"
      WHERE ${whereClause} AND psi."embedding" IS NOT NULL
      ORDER BY psi."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${cap};
    `);
    return rows;
  }

  async searchByKeyword(
    query: string,
    limit: number,
    filters: SearchFilters = {},
  ): Promise<RankedProductRow[]> {
    const cap = Math.max(1, Math.min(limit, 50));

    const where: Prisma.Sql[] = [
      Prisma.sql`p."status" = 'active'`,
      Prisma.sql`psi."tsv" @@ plainto_tsquery('english', ${query})`,
    ];
    if (filters.categoryId) where.push(Prisma.sql`p."category_id" = ${filters.categoryId}::uuid`);
    if (filters.currency) where.push(Prisma.sql`p."currency" = ${filters.currency}`);
    if (typeof filters.maxPriceCents === 'number') {
      where.push(Prisma.sql`p."price_cents" <= ${filters.maxPriceCents}`);
    }
    const whereClause = Prisma.join(where, ' AND ');

    const rows = await this.prisma.$queryRaw<RankedProductRow[]>(Prisma.sql`
      SELECT
        p."id"             AS "id",
        p."title"          AS "title",
        p."description"    AS "description",
        p."price_cents"    AS "priceCents",
        p."currency"       AS "currency",
        p."category_id"    AS "categoryId",
        p."status"         AS "status",
        p."image_urls"     AS "imageUrls",
        ts_rank(psi."tsv", plainto_tsquery('english', ${query}))::float AS "score"
      FROM "app"."product_search_index" psi
      JOIN "app"."products" p ON p."id" = psi."product_id"
      WHERE ${whereClause}
      ORDER BY "score" DESC
      LIMIT ${cap};
    `);
    return rows;
  }
}

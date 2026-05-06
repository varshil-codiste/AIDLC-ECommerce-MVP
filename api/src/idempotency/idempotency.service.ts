import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export type IdempotencyCheckResult =
  | { hit: false }
  | { hit: true; responseStatus: number; responseBody: unknown }
  | { conflict: true; reason: 'fingerprint_mismatch' | 'expired' };

const TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  static computeFingerprint(
    method: string,
    path: string,
    body: unknown,
  ): string {
    const raw = `${method.toUpperCase()}:${path}:${JSON.stringify(body ?? null)}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  async check(
    key: string,
    userId: string,
    fingerprint: string,
  ): Promise<IdempotencyCheckResult> {
    const record = await this.prisma.idempotencyKey.findFirst({
      where: { key, userId },
    });

    if (!record) return { hit: false };

    const age = Date.now() - record.createdAt.getTime();
    if (age > TTL_MS) return { conflict: true, reason: 'expired' };

    if (record.requestFingerprint !== fingerprint) {
      return { conflict: true, reason: 'fingerprint_mismatch' };
    }

    return {
      hit: true,
      responseStatus: record.responseStatus,
      responseBody: record.responseBody,
    };
  }

  async save(
    key: string,
    userId: string,
    fingerprint: string,
    responseStatus: number,
    responseBody: unknown,
  ): Promise<void> {
    await this.prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        userId,
        requestFingerprint: fingerprint,
        responseStatus,
        responseBody: responseBody as object,
      },
      update: {},
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - TTL_MS);
    // PostgreSQL does not support DELETE...LIMIT directly; use a CTE to cap batch size.
    await this.prisma.$executeRaw`
      WITH to_delete AS (
        SELECT id FROM app.idempotency_keys
        WHERE created_at < ${cutoff}
        ORDER BY created_at
        LIMIT 1000
      )
      DELETE FROM app.idempotency_keys
      WHERE id IN (SELECT id FROM to_delete)
    `;
  }
}

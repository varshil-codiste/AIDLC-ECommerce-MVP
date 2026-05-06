import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { AuditLogService } from '../src/audit/audit-log.service';
import { IdempotencyService } from '../src/idempotency/idempotency.service';
import { OutboxService } from '../src/outbox/outbox.service';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

async function seedUser(suffix = 'persist') {
  return prisma.user.create({
    data: {
      role: 'merchant',
      email: `persist-${suffix}-${Date.now()}@test.com`,
      passwordHash: 'hashed',
    },
  });
}

describe('AuditLogService — e2e', () => {
  it('writes an audit log row within the same transaction as a domain write', async () => {
    const user = await seedUser('audit');
    const service = new AuditLogService();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { status: 'disabled' },
      });
      await service.insert(tx, {
        actorUserId: user.id,
        actorRole: 'admin',
        action: 'user.disable',
        entity: 'users',
        entityId: user.id,
        before: { status: 'active' },
        after: { status: 'disabled' },
      });
    });

    const logs = await prisma.auditLog.findMany({
      where: { entityId: user.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('user.disable');
    expect(logs[0].after).toMatchObject({ status: 'disabled' });
    expect((logs[0].before as Record<string, unknown>)).not.toHaveProperty('passwordHash');

    // audit_log is append-only (trigger blocks DELETE) — rows are intentionally left in place.
    // Clean up the user only (audit rows reference it via actor_user_id which is nullable).
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe('IdempotencyService — e2e', () => {
  it('returns hit on duplicate key and avoids double write', async () => {
    const user = await seedUser('idempotency');
    const service = new IdempotencyService(prisma as never);
    const key = `test-key-${Date.now()}`;
    const fp = IdempotencyService.computeFingerprint('POST', '/orders', { amount: 100 });

    await service.save(key, user.id, fp, 201, { id: 'order-1' });
    const result = await service.check(key, user.id, fp);

    expect(result).toMatchObject({ hit: true, responseStatus: 201 });
    expect((result as { responseBody: unknown }).responseBody).toEqual({ id: 'order-1' });

    await prisma.idempotencyKey.delete({ where: { key } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe('OutboxService + drain — e2e', () => {
  it('emits an event to agent_events and the row is committable', async () => {
    const user = await seedUser('outbox');
    const outboxService = new OutboxService();

    await prisma.$transaction(async (tx) => {
      await outboxService.emit(
        tx,
        'order.created',
        {
          eventType: 'order.created',
          orderId: 'test-order-1',
          userId: user.id,
          totalCents: 1000,
          currency: 'INR',
          timestamp: new Date().toISOString(),
        },
        'order_agent',
      );
    });

    const pending = await prisma.agentEvent.findMany({
      where: { committedToStreamAt: null, emittedByModule: 'order_agent' },
    });
    expect(pending.length).toBeGreaterThanOrEqual(1);

    const eventId = pending[0].id;
    const stream = `events:order`;
    await redis.xadd(stream, 'MAXLEN', '~', '100000', '*', 'eventId', eventId);

    await prisma.agentEvent.update({
      where: { id: eventId },
      data: { committedToStreamAt: new Date() },
    });

    const drained = await prisma.agentEvent.findUnique({ where: { id: eventId } });
    expect(drained?.committedToStreamAt).not.toBeNull();

    await prisma.agentEvent.deleteMany({ where: { id: eventId } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

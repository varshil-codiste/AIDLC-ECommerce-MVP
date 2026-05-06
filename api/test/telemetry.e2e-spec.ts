import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedCostRecords(count: number, costUsd: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const row = await prisma.llmCostRecord.create({
      data: {
        traceId: `test-trace-${i}`,
        spanId: `test-span-${i}`,
        model: 'claude-sonnet-4-6',
        agentModule: 'e2e_test',
        inputTokens: 100,
        outputTokens: 50,
        costUsd,
        calledAt: new Date(),
      },
    });
    ids.push(row.id);
  }
  return ids;
}

describe('LlmCostRecord — e2e', () => {
  it('inserts a cost record and reads it back', async () => {
    const ids = await seedCostRecords(1, 0.0105);

    const row = await prisma.llmCostRecord.findUnique({ where: { id: ids[0] } });
    expect(row).not.toBeNull();
    expect(row?.model).toBe('claude-sonnet-4-6');
    expect(Number(row?.costUsd)).toBeCloseTo(0.0105, 4);

    await prisma.llmCostRecord.deleteMany({ where: { id: { in: ids } } });
  });
});

describe('Budget 7-day sum — e2e', () => {
  it('7-day SUM query returns correct total', async () => {
    const ids = await seedCostRecords(3, 10);

    const rows = await prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(cost_usd), 0)::text AS total
      FROM app.llm_cost_records
      WHERE called_at > NOW() - INTERVAL '7 days'
        AND agent_module = 'e2e_test'
    `;
    const total = parseFloat(rows[0]?.total ?? '0');
    expect(total).toBeGreaterThanOrEqual(30);

    await prisma.llmCostRecord.deleteMany({ where: { id: { in: ids } } });
  });
});

describe('Trace ID header — e2e', () => {
  it('AuditLog now includes traceId and spanId columns', async () => {
    const user = await prisma.user.create({
      data: {
        role: 'merchant',
        email: `tel-trace-${Date.now()}@test.com`,
        passwordHash: 'hashed',
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          actorRole: 'admin',
          action: 'user.update',
          entity: 'users',
          entityId: user.id,
          requestId: 'req-test',
          traceId: 'trace-abc123',
          spanId: 'span-def456',
        },
      });
    });

    const log = await prisma.auditLog.findFirst({ where: { entityId: user.id } });
    expect(log?.traceId).toBe('trace-abc123');
    expect(log?.spanId).toBe('span-def456');

    await prisma.user.delete({ where: { id: user.id } });
  });
});

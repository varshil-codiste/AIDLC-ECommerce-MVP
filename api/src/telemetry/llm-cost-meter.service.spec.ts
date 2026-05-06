import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmCostMeterService } from './llm-cost-meter.service';

const makePrisma = () => ({
  $queryRaw: vi.fn().mockResolvedValue([{ total: '12.345678' }]),
  llmCostRecord: {
    create: vi.fn().mockResolvedValue({}),
  },
});

describe('LlmCostMeterService.record', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: LlmCostMeterService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new LlmCostMeterService(prisma as never);
  });

  it('does not throw when called', () => {
    expect(() =>
      service.record({
        model: 'claude-sonnet-4-6',
        inputTokens: 100,
        outputTokens: 50,
        calledAt: new Date(),
      }),
    ).not.toThrow();
  });

  it('does not throw when DB insert fails', async () => {
    prisma.llmCostRecord.create.mockRejectedValue(new Error('DB error'));
    service = new LlmCostMeterService(prisma as never);
    expect(() =>
      service.record({
        model: 'claude-sonnet-4-6',
        inputTokens: 10,
        outputTokens: 5,
        calledAt: new Date(),
      }),
    ).not.toThrow();
    // Allow the rejected promise to settle
    await new Promise((r) => setTimeout(r, 10));
  });

  it('does not throw for unknown model', () => {
    expect(() =>
      service.record({
        model: 'not-a-real-model',
        inputTokens: 10,
        outputTokens: 5,
        calledAt: new Date(),
      }),
    ).not.toThrow();
  });
});

describe('LlmCostMeterService.getLast7DaysCost', () => {
  it('returns parsed float from DB query', async () => {
    const prisma = makePrisma();
    const service = new LlmCostMeterService(prisma as never);
    const result = await service.getLast7DaysCost();
    expect(result).toBeCloseTo(12.345678, 6);
  });

  it('returns 0 when DB returns null aggregate', async () => {
    const prisma = makePrisma();
    prisma.$queryRaw.mockResolvedValue([{ total: '0' }]);
    const service = new LlmCostMeterService(prisma as never);
    expect(await service.getLast7DaysCost()).toBe(0);
  });
});

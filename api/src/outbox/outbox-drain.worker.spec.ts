import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboxDrainWorker } from './outbox-drain.worker';

const makePrisma = (rows: unknown[] = []) => ({
  $queryRaw: vi.fn().mockResolvedValue(rows),
  agentEvent: {
    updateMany: vi.fn().mockResolvedValue({ count: rows.length }),
  },
});

const makePipelineResult = (ids: string[], failIdx: number[] = []): [Error | null, unknown][] =>
  ids.map((_, i): [Error | null, unknown] =>
    failIdx.includes(i) ? [new Error('XADD failed'), null] : [null, `stream-${i}`],
  );

const makeRedis = (pipelineResults: [Error | null, unknown][][] = []) => {
  let callCount = 0;
  return {
    pipeline: vi.fn(() => {
      const results = pipelineResults[callCount++] ?? [];
      return {
        xadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(results),
      };
    }),
  };
};

describe('OutboxDrainWorker.drainCycle', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it('does nothing when no pending rows', async () => {
    const redis = makeRedis();
    const worker = new OutboxDrainWorker(prisma as never, redis as never);
    await worker.drainCycle();
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    expect(redis.pipeline).not.toHaveBeenCalled();
  });

  it('XADDs all pending rows and commits them', async () => {
    const rows = [
      { id: 'e-1', event_type: 'order.created', payload: { orderId: 'o-1' } },
      { id: 'e-2', event_type: 'product.created', payload: { productId: 'p-1' } },
    ];
    prisma = makePrisma(rows);
    const pipelineResults = [makePipelineResult(['e-1', 'e-2'])];
    const redis = makeRedis(pipelineResults);

    const worker = new OutboxDrainWorker(prisma as never, redis as never);
    await worker.drainCycle();

    expect(prisma.agentEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['e-1', 'e-2'] } },
      data: { committedToStreamAt: expect.any(Date) },
    });
  });

  it('only commits rows whose XADD succeeded; leaves failed rows pending', async () => {
    const rows = [
      { id: 'e-1', event_type: 'order.created', payload: {} },
      { id: 'e-2', event_type: 'order.paid', payload: {} },
    ];
    prisma = makePrisma(rows);
    // e-2 fails
    const pipelineResults = [makePipelineResult(['e-1', 'e-2'], [1])];
    const redis = makeRedis(pipelineResults);

    const worker = new OutboxDrainWorker(prisma as never, redis as never);
    await worker.drainCycle();

    expect(prisma.agentEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['e-1'] } },
      data: { committedToStreamAt: expect.any(Date) },
    });
  });

  it('skips concurrent cycle if previous is still running', async () => {
    const rows = [{ id: 'e-1', event_type: 'order.created', payload: {} }];
    prisma = makePrisma(rows);
    const redis = makeRedis([[makePipelineResult(['e-1'])][0]]);

    const worker = new OutboxDrainWorker(prisma as never, redis as never);

    // Start two cycles concurrently — second should skip
    const [, secondResult] = await Promise.all([
      worker.drainCycle(),
      worker.drainCycle(),
    ]);
    expect(secondResult).toBeUndefined();
  });
});

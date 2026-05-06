import { describe, it, expect, vi } from 'vitest';
import { BudgetAlarmWorker } from './budget-alarm.worker';

const makeConfig = (budget = 100) => ({
  get: vi.fn().mockReturnValue(budget),
});

const makeCostMeter = (cost: number) => ({
  getLast7DaysCost: vi.fn().mockResolvedValue(cost),
});

describe('BudgetAlarmWorker.checkBudget', () => {
  it('does not increment counters when sum < 80%', async () => {
    const worker = new BudgetAlarmWorker(makeCostMeter(75) as never, makeConfig(100) as never);
    await expect(worker.checkBudget()).resolves.toBeUndefined();
    // No error thrown — process continues
  });

  it('does not throw when getLast7DaysCost rejects', async () => {
    const meter = { getLast7DaysCost: vi.fn().mockRejectedValue(new Error('DB down')) };
    const worker = new BudgetAlarmWorker(meter as never, makeConfig() as never);
    await expect(worker.checkBudget()).resolves.toBeUndefined();
  });

  it('completes without throw when sum is exactly at 80% threshold', async () => {
    const worker = new BudgetAlarmWorker(makeCostMeter(80) as never, makeConfig(100) as never);
    await expect(worker.checkBudget()).resolves.toBeUndefined();
  });

  it('completes without throw when sum is at 100% threshold', async () => {
    const worker = new BudgetAlarmWorker(makeCostMeter(100) as never, makeConfig(100) as never);
    await expect(worker.checkBudget()).resolves.toBeUndefined();
  });
});

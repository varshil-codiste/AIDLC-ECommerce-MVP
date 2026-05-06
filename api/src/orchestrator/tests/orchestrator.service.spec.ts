import { describe, it, expect, vi } from 'vitest';
import { lastValueFrom, toArray } from 'rxjs';
import { OrchestratorService } from '../orchestrator.service';
import type { AgentRegistry } from '../agents/agent.interface';
import type { AgentInput, AgentOutput } from '../types/orchestrator.types';

const makeRegistry = (outputs: AgentOutput[]): AgentRegistry => {
  const map = new Map();
  map.set('router', {
    execute: async function* (_: AgentInput) {
      yield { type: 'handoff', toAgent: 'noop', reason: 'test', payload: {} } as AgentOutput;
    },
  });
  map.set('noop', {
    execute: async function* (_: AgentInput) {
      for (const o of outputs) yield o;
    },
  });
  return map;
};

const makeDeps = (agentOutputs: AgentOutput[]) => ({
  agentRegistry: makeRegistry(agentOutputs),
  llm: { modelName: 'gpt-4o-mini', complete: vi.fn(), streamCompletion: vi.fn() },
  config: { get: vi.fn((_k: string, d: unknown) => d) } as unknown,
  confirmationService: { store: vi.fn(), retrieve: vi.fn(), consume: vi.fn(), cancel: vi.fn() },
  dashboardDigestService: {
    buildDigest: vi.fn().mockResolvedValue({ type: 'dashboard_digest', data: { metrics: {} } }),
  },
  conversationRepo: {
    findOrCreate: vi.fn().mockResolvedValue({ id: 'conv-1' }),
    isFirstTurn: vi.fn().mockResolvedValue(false),
    saveUserMessage: vi.fn().mockResolvedValue('msg-user-1'),
    saveAssistantMessage: vi.fn().mockResolvedValue('msg-asst-1'),
    getPriorContext: vi.fn().mockResolvedValue([]),
  },
  costMeter: { record: vi.fn() },
});

describe('OrchestratorService', () => {
  it('emits token events for text output', async () => {
    const deps = makeDeps([
      { type: 'text', content: 'Hello!', tokensIn: 10, tokensOut: 5, costUsd: 0.001 },
    ]);
    const svc = new OrchestratorService(
      deps.agentRegistry,
      deps.llm as never,
      deps.config as never,
      deps.confirmationService as never,
      deps.dashboardDigestService as never,
      deps.conversationRepo as never,
      deps.costMeter as never,
    );
    const events = await lastValueFrom(
      svc.streamTurn({ message: 'Hi' }, { id: 'u1', role: 'shopper' }).pipe(toArray()),
    );
    const types = events.map((e) => (e as { type: string }).type);
    expect(types).toContain('token');
    expect(types).toContain('done');
  });

  it('emits dashboard_digest widget on merchant first turn', async () => {
    const deps = makeDeps([{ type: 'text', content: 'Ok', tokensIn: 5, tokensOut: 2, costUsd: 0 }]);
    deps.conversationRepo.isFirstTurn.mockResolvedValue(true);
    const svc = new OrchestratorService(
      deps.agentRegistry,
      deps.llm as never,
      deps.config as never,
      deps.confirmationService as never,
      deps.dashboardDigestService as never,
      deps.conversationRepo as never,
      deps.costMeter as never,
    );
    const events = await lastValueFrom(
      svc.streamTurn({ message: 'Hello' }, { id: 'u1', role: 'merchant' }).pipe(toArray()),
    );
    const types = events.map((e) => (e as { type: string }).type);
    expect(types).toContain('widget');
  });

  it('emits done event after text output', async () => {
    const deps = makeDeps([
      { type: 'text', content: 'Done', tokensIn: 5, tokensOut: 3, costUsd: 0 },
    ]);
    const svc = new OrchestratorService(
      deps.agentRegistry,
      deps.llm as never,
      deps.config as never,
      deps.confirmationService as never,
      deps.dashboardDigestService as never,
      deps.conversationRepo as never,
      deps.costMeter as never,
    );
    const events = await lastValueFrom(
      svc.streamTurn({ message: 'Test' }, { id: 'u1', role: 'shopper' }).pipe(toArray()),
    );
    expect(events.map((e) => (e as { type: string }).type)).toContain('done');
  });

  it('records LLM cost after text output', async () => {
    const deps = makeDeps([
      { type: 'text', content: 'Hi', tokensIn: 10, tokensOut: 5, costUsd: 0.001 },
    ]);
    const svc = new OrchestratorService(
      deps.agentRegistry,
      deps.llm as never,
      deps.config as never,
      deps.confirmationService as never,
      deps.dashboardDigestService as never,
      deps.conversationRepo as never,
      deps.costMeter as never,
    );
    await lastValueFrom(
      svc.streamTurn({ message: 'Hi' }, { id: 'u1', role: 'shopper' }).pipe(toArray()),
    );
    expect(deps.costMeter.record).toHaveBeenCalled();
  });
});

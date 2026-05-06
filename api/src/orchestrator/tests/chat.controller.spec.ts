import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { ChatController } from '../controllers/chat.controller';

const makeOrchestrator = () => ({
  streamTurn: vi.fn().mockReturnValue(of({ type: 'done', data: '{}' })),
});

describe('ChatController', () => {
  it('delegates streamMessage to OrchestratorService.streamTurn', () => {
    const orchestrator = makeOrchestrator();
    const controller = new ChatController(orchestrator as never);
    const req = { user: { sub: 'user-1', role: 'shopper' as const } };
    const result = controller.streamMessage({ message: 'Hello' }, req as never);
    expect(orchestrator.streamTurn).toHaveBeenCalledWith(
      { message: 'Hello' },
      { id: 'user-1', role: 'shopper' },
    );
    expect(result).toBeDefined();
  });

  it('passes merchant role correctly', () => {
    const orchestrator = makeOrchestrator();
    const controller = new ChatController(orchestrator as never);
    const req = { user: { sub: 'merchant-1', role: 'merchant' as const } };
    controller.streamMessage({ message: 'Show dashboard' }, req as never);
    expect(orchestrator.streamTurn).toHaveBeenCalledWith(
      { message: 'Show dashboard' },
      { id: 'merchant-1', role: 'merchant' },
    );
  });

  it('returns an observable from streamTurn', () => {
    const orchestrator = makeOrchestrator();
    const controller = new ChatController(orchestrator as never);
    const req = { user: { sub: 'u1', role: 'shopper' as const } };
    const obs = controller.streamMessage({ message: 'Test' }, req as never);
    expect(typeof obs.subscribe).toBe('function');
  });
});

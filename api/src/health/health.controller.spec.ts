import { describe, it, expect } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('returns status=ok', () => {
    const res = controller.get();
    expect(res.status).toBe('ok');
  });

  it('returns an ISO 8601 timestamp', () => {
    const res = controller.get();
    expect(res.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // Round-trip through Date to confirm validity
    expect(new Date(res.ts).toISOString()).toBe(res.ts);
  });
});

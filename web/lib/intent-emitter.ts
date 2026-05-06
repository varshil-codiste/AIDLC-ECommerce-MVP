'use client';

import { getAccessToken, refreshToken } from './auth-service';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface IntentPayload {
  intent: string;
  sessionId: string;
  payload: Record<string, unknown>;
}

export async function emitIntent(intent: IntentPayload): Promise<void> {
  const token = getAccessToken();

  const res = await fetch(`${API_BASE}/api/v1/orchestrator/intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(intent),
  });

  if (res.status === 401) {
    await refreshToken();
    const retryToken = getAccessToken();
    const retry = await fetch(`${API_BASE}/api/v1/orchestrator/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(retryToken ? { Authorization: `Bearer ${retryToken}` } : {}),
      },
      body: JSON.stringify(intent),
    });
    if (retry.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (!retry.ok) throw new Error(`intent.emit.failed: ${retry.status}`);
    return;
  }

  if (!res.ok) throw new Error(`intent.emit.failed: ${res.status}`);
}

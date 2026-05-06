'use client';

import { getAccessToken, refreshToken } from './auth-service';
import { getTraceparent } from './telemetry';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  const traceparent = getTraceparent();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(traceparent ? { traceparent } : {}),
  };
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) {
    await refreshToken();
    const retry = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
    if (retry.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!retry.ok) {
      const body = await retry.json().catch(() => ({}));
      throw Object.assign(new Error(body.message ?? 'Request failed'), { status: retry.status });
    }
    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Request failed'), { status: res.status });
  }

  return res.json() as Promise<T>;
}

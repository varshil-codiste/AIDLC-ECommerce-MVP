'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenFamily: string;
  userId: string;
}

interface StoredSession {
  accessToken: string;
  userId: string;
  tokenFamily: string;
}

let session: StoredSession | null = null;

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message ?? 'Login failed') as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  const data: LoginResponse = await res.json();

  await fetch('/api/auth/set-cookie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: data.refreshToken,
      tokenFamily: data.tokenFamily,
      userId: data.userId,
    }),
  });

  session = { accessToken: data.accessToken, userId: data.userId, tokenFamily: data.tokenFamily };
}

export async function logout(): Promise<void> {
  if (!session) return;

  const refreshCookie = await getRefreshSession();

  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      tokenFamily: refreshCookie?.tokenFamily ?? session.tokenFamily,
      refreshToken: refreshCookie?.refreshToken ?? '',
    }),
  });

  await fetch('/api/auth/set-cookie', { method: 'DELETE' });
  session = null;
}

export async function refreshToken(): Promise<void> {
  const stored = await getRefreshSession();
  if (!stored) throw new Error('No refresh session');

  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stored),
  });

  if (!res.ok) throw new Error('Token refresh failed');

  const data: LoginResponse = await res.json();

  await fetch('/api/auth/set-cookie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: data.refreshToken,
      tokenFamily: data.tokenFamily,
      userId: data.userId,
    }),
  });

  session = { accessToken: data.accessToken, userId: data.userId, tokenFamily: data.tokenFamily };
}

export function getAccessToken(): string | null {
  return session?.accessToken ?? null;
}

export function getUser(): { userId: string } | null {
  return session ? { userId: session.userId } : null;
}

async function getRefreshSession(): Promise<{
  refreshToken: string;
  tokenFamily: string;
  userId: string;
} | null> {
  try {
    const res = await fetch('/api/auth/set-cookie');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

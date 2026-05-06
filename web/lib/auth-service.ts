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

const SESSION_KEY = 'ecommmer_session';

function loadStoredSession(): StoredSession | null {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch { return null; }
}

function persistSession(s: StoredSession | null): void {
  if (typeof window === 'undefined') return;
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
}

let session: StoredSession | null = loadStoredSession();

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
  persistSession(session);
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
  persistSession(null);
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
  persistSession(session);
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

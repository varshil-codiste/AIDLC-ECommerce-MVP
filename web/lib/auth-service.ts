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

  // Clear any prior user's chat history so a new login starts fresh
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('chat_messages');
  }
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

  // Clear chat history so the next user starts fresh
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('chat_messages');
  }
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

export type UserRole = 'shopper' | 'merchant' | 'admin';

function decodeRoleFromToken(token: string): UserRole | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      typeof atob === 'function'
        ? atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        : Buffer.from(parts[1], 'base64').toString('utf-8'),
    ) as { role?: string };
    if (payload.role === 'shopper' || payload.role === 'merchant' || payload.role === 'admin') {
      return payload.role;
    }
    return null;
  } catch {
    return null;
  }
}

export function getUser(): { userId: string; role: UserRole | null } | null {
  return session ? { userId: session.userId, role: decodeRoleFromToken(session.accessToken) } : null;
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

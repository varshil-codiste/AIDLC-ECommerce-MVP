import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'rt_session';
const COOKIE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

interface RefreshSession {
  refreshToken: string;
  tokenFamily: string;
  userId: string;
}

export async function GET() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return NextResponse.json(null, { status: 404 });
  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  const body: RefreshSession = await req.json();
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(body), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_TTL,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  return new NextResponse(null, { status: 204 });
}

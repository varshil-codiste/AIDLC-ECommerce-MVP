import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/chat'];
const COOKIE_NAME = 'rt_session';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(COOKIE_NAME);

  // Root route: send authenticated users to /chat, others to /login
  if (pathname === '/') {
    const target = session?.value ? '/chat' : '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  if (session?.value) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnTo', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/', '/chat/:path*'],
};

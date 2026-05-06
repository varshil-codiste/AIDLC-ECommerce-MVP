import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/chat'];
const COOKIE_NAME = 'rt_session';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get(COOKIE_NAME);
  if (session?.value) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnTo', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/chat/:path*'],
};

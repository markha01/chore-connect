import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'session';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'fallback-dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

const PROTECTED = ['/dashboard', '/household'];
const AUTH_ONLY = ['/', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY.includes(pathname);

  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    try {
      await jwtVerify(token, getSecret());
    } catch {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  if (isAuthOnly && token) {
    try {
      await jwtVerify(token, getSecret());
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch {
      // Invalid token — let them through to login
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/signup', '/dashboard/:path*', '/household/:path*'],
};

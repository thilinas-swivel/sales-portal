import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  const isAuthenticated = !!session?.user;
  const portals = session?.user?.portals ?? [];

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated — portal access checks ──────────────────────────────────
  if (pathname.startsWith('/admin') && !portals.includes('admin')) {
    return NextResponse.redirect(new URL('/login?error=AccessDenied', nextUrl.origin));
  }

  if (pathname.startsWith('/caller') && !portals.includes('caller')) {
    return NextResponse.redirect(new URL('/login?error=AccessDenied', nextUrl.origin));
  }

  // API routes require admin portal access
  if (pathname.startsWith('/api/') && !portals.includes('admin')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/caller/:path*',
    '/api/partners/:path*',
    '/api/pipedrive/:path*',
    '/api/settings/:path*',
  ],
};


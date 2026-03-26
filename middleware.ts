import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  const isAuthenticated = !!token;
  const portals = (token?.portals as string[]) ?? [];

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
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/caller/:path*',
    '/api/partners/:path*',
    '/api/pipedrive/:path*',
    '/api/settings/:path*',
  ],
};


import { NextResponse } from 'next/server';
import { invalidateCache, cacheStats } from '@/lib/cache';

/**
 * POST /api/pipedrive/cache/clear
 * Clears all server-side Pipedrive caches. Called when the user
 * clicks "Refresh" so fresh data is fetched from Pipedrive.
 *
 * GET returns current cache stats (for debugging).
 */
export async function POST() {
  invalidateCache();
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}

export async function GET() {
  return NextResponse.json({ success: true, ...cacheStats() });
}

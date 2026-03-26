/**
 * Shared helpers for Pipedrive proxy API routes.
 */

import { NextResponse } from 'next/server';
import { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';

/** Standard JSON error response. */
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/** Wrap a Pipedrive client call and translate errors into proper HTTP responses. */
export async function handlePipedrive<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await fn();
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return errorResponse(err.message, 503);
    }
    if (err instanceof PipedriveError) {
      return errorResponse(err.message, err.status);
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return errorResponse(message, 500);
  }
}

/** Parse numeric query param; returns undefined when missing or invalid. */
export function numParam(val: string | null): number | undefined {
  if (!val) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

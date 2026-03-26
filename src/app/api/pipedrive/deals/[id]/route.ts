import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, errorResponse } from '../../_helpers';
import type { PipedriveUpdateDeal } from '@/types/pipedrive';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pipedrive/deals/[id]
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return errorResponse('Invalid deal ID', 400);
  return handlePipedrive(() => pipedrive.deals.get(numId));
}

/**
 * PUT /api/pipedrive/deals/[id]
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return errorResponse('Invalid deal ID', 400);
  const body = (await req.json()) as PipedriveUpdateDeal;
  return handlePipedrive(() => pipedrive.deals.update(numId, body));
}

/**
 * DELETE /api/pipedrive/deals/[id]
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return errorResponse('Invalid deal ID', 400);
  return handlePipedrive(() => pipedrive.deals.delete(numId));
}

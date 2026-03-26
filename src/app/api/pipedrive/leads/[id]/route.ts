import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, errorResponse } from '../../_helpers';
import type { PipedriveUpdateLead } from '@/types/pipedrive';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pipedrive/leads/[id]
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return handlePipedrive(() => pipedrive.leads.get(id));
}

/**
 * PATCH /api/pipedrive/leads/[id]
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = (await req.json()) as PipedriveUpdateLead;
  return handlePipedrive(() => pipedrive.leads.update(id, body));
}

/**
 * DELETE /api/pipedrive/leads/[id]
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id) return errorResponse('Lead ID is required', 400);
  return handlePipedrive(() => pipedrive.leads.delete(id));
}

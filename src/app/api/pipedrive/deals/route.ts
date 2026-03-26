import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, numParam } from '../_helpers';
import type { PipedriveCreateDeal, PipedriveDealsListParams } from '@/types/pipedrive';

/**
 * GET /api/pipedrive/deals
 * Proxy for Pipedrive GET /v1/deals — list deals.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params: PipedriveDealsListParams = {
    start: numParam(sp.get('start')),
    limit: numParam(sp.get('limit')),
    user_id: numParam(sp.get('user_id')),
    filter_id: numParam(sp.get('filter_id')),
    stage_id: numParam(sp.get('stage_id')),
    status: (sp.get('status') as PipedriveDealsListParams['status']) || undefined,
  };
  return handlePipedrive(() => pipedrive.deals.list(params));
}

/**
 * POST /api/pipedrive/deals
 * Proxy for Pipedrive POST /v1/deals — create a deal.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as PipedriveCreateDeal;
  if (!body.title) {
    const { errorResponse } = await import('../_helpers');
    return errorResponse('title is required', 400);
  }
  return handlePipedrive(() => pipedrive.deals.create(body));
}

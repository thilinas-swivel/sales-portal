import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, numParam } from '../_helpers';
import type { PipedriveCreateActivity, PipedriveActivitiesListParams } from '@/types/pipedrive';

/**
 * GET /api/pipedrive/activities
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params: PipedriveActivitiesListParams = {
    start: numParam(sp.get('start')),
    limit: numParam(sp.get('limit')),
    user_id: numParam(sp.get('user_id')),
    filter_id: numParam(sp.get('filter_id')),
    type: sp.get('type') || undefined,
    start_date: sp.get('start_date') || undefined,
    end_date: sp.get('end_date') || undefined,
    done: sp.get('done') !== null ? (numParam(sp.get('done')) as 0 | 1) : undefined,
  };
  return handlePipedrive(() => pipedrive.activities.list(params));
}

/**
 * POST /api/pipedrive/activities
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as PipedriveCreateActivity;
  if (!body.subject || !body.type) {
    const { errorResponse } = await import('../_helpers');
    return errorResponse('subject and type are required', 400);
  }
  return handlePipedrive(() => pipedrive.activities.create(body));
}

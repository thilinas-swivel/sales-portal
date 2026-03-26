import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, numParam } from '../_helpers';
import type { PipedriveCreateLead, PipedriveLeadsListParams } from '@/types/pipedrive';

/**
 * GET /api/pipedrive/leads
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params: PipedriveLeadsListParams = {
    start: numParam(sp.get('start')),
    limit: numParam(sp.get('limit')),
    archived_status:
      (sp.get('archived_status') as PipedriveLeadsListParams['archived_status']) || undefined,
    owner_id: numParam(sp.get('owner_id')),
    person_id: numParam(sp.get('person_id')),
    organization_id: numParam(sp.get('organization_id')),
    sort: sp.get('sort') || undefined,
  };
  return handlePipedrive(() => pipedrive.leads.list(params));
}

/**
 * POST /api/pipedrive/leads
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as PipedriveCreateLead;
  if (!body.title) {
    const { errorResponse } = await import('../_helpers');
    return errorResponse('title is required', 400);
  }
  return handlePipedrive(() => pipedrive.leads.create(body));
}

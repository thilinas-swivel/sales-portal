import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, numParam } from '../_helpers';
import type { PipedriveCreateOrganization, PipedriveListParams } from '@/types/pipedrive';

/**
 * GET /api/pipedrive/organizations
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params: PipedriveListParams = {
    start: numParam(sp.get('start')),
    limit: numParam(sp.get('limit')),
  };
  return handlePipedrive(() => pipedrive.organizations.list(params));
}

/**
 * POST /api/pipedrive/organizations
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as PipedriveCreateOrganization;
  if (!body.name) {
    const { errorResponse } = await import('../_helpers');
    return errorResponse('name is required', 400);
  }
  return handlePipedrive(() => pipedrive.organizations.create(body));
}

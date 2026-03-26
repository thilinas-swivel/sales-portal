import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, numParam } from '../_helpers';
import type { PipedriveCreatePerson, PipedrivePersonsListParams } from '@/types/pipedrive';

/**
 * GET /api/pipedrive/persons
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const params: PipedrivePersonsListParams = {
    start: numParam(sp.get('start')),
    limit: numParam(sp.get('limit')),
    user_id: numParam(sp.get('user_id')),
    filter_id: numParam(sp.get('filter_id')),
    first_char: sp.get('first_char') || undefined,
  };
  return handlePipedrive(() => pipedrive.persons.list(params));
}

/**
 * POST /api/pipedrive/persons
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as PipedriveCreatePerson;
  if (!body.name) {
    const { errorResponse } = await import('../_helpers');
    return errorResponse('name is required', 400);
  }
  return handlePipedrive(() => pipedrive.persons.create(body));
}

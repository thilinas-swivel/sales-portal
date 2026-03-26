import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive, numParam } from '../../../_helpers';
import { cached, invalidateCache } from '@/lib/cache';
import type { PipedriveDealsListParams } from '@/types/pipedrive';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/pipedrive/pipelines/[id]/deals
 * Returns deals for a specific pipeline (cached for 5 min).
 * Pass ?refresh=true to bypass cache.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipelineId = Number(id);
  if (!Number.isFinite(pipelineId)) {
    const { errorResponse } = await import('../../../_helpers');
    return errorResponse('Invalid pipeline ID', 400);
  }

  const sp = req.nextUrl.searchParams;
  const refresh = sp.get('refresh') === 'true';

  const listParams: PipedriveDealsListParams = {
    start: numParam(sp.get('start')),
    limit: numParam(sp.get('limit')),
    status: (sp.get('status') as PipedriveDealsListParams['status']) || undefined,
  };

  // Build cache key from pipeline ID + query params
  const cacheKey = `pipeline-deals:${pipelineId}:${JSON.stringify(listParams)}`;
  if (refresh) invalidateCache(cacheKey);

  return handlePipedrive(() =>
    cached(cacheKey, () => pipedrive.pipelines.deals(pipelineId, listParams), CACHE_TTL),
  );
}

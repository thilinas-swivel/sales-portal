import type { NextRequest } from 'next/server';
import pipedrive from '@/lib/pipedrive';
import { handlePipedrive } from '../_helpers';
import { cached, invalidateCache } from '@/lib/cache';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/pipedrive/pipelines
 * Returns all pipelines + their stages in one shot.
 * Results are cached for 5 minutes to avoid rate limits.
 * Pass ?refresh=true to bypass cache.
 */
export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true';
  if (refresh) {
    invalidateCache('pipelines');
    invalidateCache('stages');
  }

  return handlePipedrive(async () => {
    const [pipelinesData, stagesData] = await Promise.all([
      cached('pipelines', () => pipedrive.pipelines.list(), CACHE_TTL),
      cached('stages', () => pipedrive.stages.list(), CACHE_TTL),
    ]);
    return {
      success: true,
      data: {
        pipelines: pipelinesData.data,
        stages: stagesData.data,
      },
    };
  });
}

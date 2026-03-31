import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import { cached } from '@/lib/cache';
import type { PipedriveDeal } from '@/types/pipedrive';

const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export interface CallerStatsDeal {
  id: number;
  title: string;
  org_name: string | null;
  person_name: string | null;
  value: number;
  currency: string;
  pipeline_id: number;
  update_time: string;
  add_time: string;
}

export interface CallerStats {
  openDeals: number;
  wonThisMonth: number;
  newThisWeek: number;
  conversionRate: number;
  totalOpenValue: number;
  currency: string;
  pipelines: { id: number; name: string; openCount: number }[];
  recentDeals: CallerStatsDeal[];
}

/**
 * GET /api/caller/stats
 * Returns pipeline-filtered stats from Pipedrive for the current user.
 * Uses the user's pipeline assignments from the JWT session — so no user-
 * supplied pipeline IDs are trusted.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const pipelineIds: number[] = session.user.pipelineIds ?? [];

  if (pipelineIds.length === 0) {
    return NextResponse.json({ success: true, data: null, noPipelines: true });
  }

  try {
    // Fetch pipeline names + all deals for each assigned pipeline in parallel
    const [pipelinesRes, dealResults] = await Promise.all([
      cached('pipelines', () => pipedrive.pipelines.list(), 5 * 60 * 1000),
      Promise.all(
        pipelineIds.map((id) =>
          cached(
            `caller-deals:${id}`,
            () => pipedrive.pipelines.deals(id, { status: 'all_not_deleted', limit: 500 }),
            CACHE_TTL,
          ),
        ),
      ),
    ]);

    const allPipelineData = pipelinesRes.data ?? [];
    const allDeals: PipedriveDeal[] = dealResults.flatMap((r) => r.data ?? []);

    // Time windows
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const openDeals = allDeals.filter((d) => d.status === 'open');
    const wonThisMonth = allDeals.filter(
      (d) => d.status === 'won' && d.won_time && new Date(d.won_time) >= startOfMonth,
    );
    const newThisWeek = allDeals.filter(
      (d) => d.status !== 'deleted' && new Date(d.add_time) >= sevenDaysAgo,
    );
    const wonAll = allDeals.filter((d) => d.status === 'won');
    const lostAll = allDeals.filter((d) => d.status === 'lost');

    const conversionRate =
      wonAll.length + lostAll.length > 0
        ? Math.round((wonAll.length / (wonAll.length + lostAll.length)) * 100)
        : 0;

    const totalOpenValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    // Dominant currency among open deals
    const currencyCount = new Map<string, number>();
    for (const d of openDeals) {
      currencyCount.set(d.currency, (currencyCount.get(d.currency) ?? 0) + 1);
    }
    const currency = [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD';

    // Open deal count per assigned pipeline
    const openCountByPipeline = new Map<number, number>();
    for (const d of openDeals) {
      openCountByPipeline.set(d.pipeline_id, (openCountByPipeline.get(d.pipeline_id) ?? 0) + 1);
    }

    const pipelines = pipelineIds.map((id) => ({
      id,
      name: allPipelineData.find((p) => p.id === id)?.name ?? `Pipeline ${id}`,
      openCount: openCountByPipeline.get(id) ?? 0,
    }));

    // 5 most recently updated open deals
    const recentDeals: CallerStatsDeal[] = [...openDeals]
      .sort((a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime())
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        title: d.title,
        org_name: (d.org_name as string) ?? null,
        person_name: (d.person_name as string) ?? null,
        value: d.value,
        currency: d.currency,
        pipeline_id: d.pipeline_id,
        update_time: d.update_time,
        add_time: d.add_time,
      }));

    const data: CallerStats = {
      openDeals: openDeals.length,
      wonThisMonth: wonThisMonth.length,
      newThisWeek: newThisWeek.length,
      conversionRate,
      totalOpenValue,
      currency,
      pipelines,
      recentDeals,
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 503 });
    }
    if (err instanceof PipedriveError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch stats';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

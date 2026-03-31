import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import pipedrive, { PipedriveError, PipedriveNotConfiguredError } from '@/lib/pipedrive';
import { cached } from '@/lib/cache';
import type { PipedriveStage, PipedriveDeal } from '@/types/pipedrive';

const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const PAGE_SIZE = 50;

export interface CallerLeadItem {
  id: number;
  title: string;
  org_name: string | null;
  person_name: string | null;
  value: number;
  currency: string;
  status: 'open' | 'won' | 'lost' | 'deleted';
  stage_id: number;
  stage_name: string;
  pipeline_id: number;
  pipeline_name: string;
  add_time: string;
  update_time: string;
  expected_close_date: string | null;
}

export interface PipelineSummary {
  pipeline_id: number;
  pipeline_name: string;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalOpenValue: number;
  currency: string;
  stages: { stage_id: number; stage_name: string; count: number; pipeline_id: number }[];
  /** Deals added in the last 7 days */
  recentlyAdded: number;
  /** Total number of stages defined for this pipeline */
  totalStages: number;
}

export interface CallerLeadsSummary {
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalOpenValue: number;
  currency: string;
  /** Open deals grouped by stage, ordered by pipeline stage order */
  stages: { stage_id: number; stage_name: string; count: number; pipeline_id: number }[];
  /** Per-pipeline breakdowns (only populated when multiple pipelines) */
  pipelineSummaries: PipelineSummary[];
}

export interface CallerLeadsResponse {
  deals: CallerLeadItem[];
  hasMore: boolean;
  nextStart: number;
  pipelines: { id: number; name: string }[];
  summary: CallerLeadsSummary;
}

function enrichDeal(
  d: PipedriveDeal,
  stageMap: Map<number, string>,
  pipelineMap: Map<number, string>,
): CallerLeadItem {
  return {
    id: d.id,
    title: d.title,
    org_name: (d.org_name as string | null | undefined) ?? null,
    person_name: (d.person_name as string | null | undefined) ?? null,
    value: d.value ?? 0,
    currency: d.currency ?? 'USD',
    status: d.status,
    stage_id: d.stage_id,
    stage_name: stageMap.get(d.stage_id) ?? 'Unknown',
    pipeline_id: d.pipeline_id,
    pipeline_name: pipelineMap.get(d.pipeline_id) ?? `Pipeline ${d.pipeline_id}`,
    add_time: d.add_time,
    update_time: d.update_time,
    expected_close_date: (d.expected_close_date as string | null | undefined) ?? null,
  };
}

/**
 * GET /api/caller/leads
 *
 * Query params:
 *   pipeline_id  — optional number; must be in the user's assigned pipelines
 *   search       — optional string; uses Pipedrive /v1/deals/search
 *   status       — "open" | "won" | "lost" | "all_not_deleted" (default: "all_not_deleted")
 *   start        — pagination offset (default: 0)
 *   limit        — page size (default: 50, max: 100)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const allowedPipelineIds: number[] = session.user.pipelineIds ?? [];
  const emptySummary: CallerLeadsSummary = {
    openDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    totalOpenValue: 0,
    currency: 'AUD',
    stages: [],
    pipelineSummaries: [],
  };
  if (allowedPipelineIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: { deals: [], hasMore: false, nextStart: 0, pipelines: [], summary: emptySummary },
    });
  }

  const sp = req.nextUrl.searchParams;
  const searchTerm = sp.get('search')?.trim() ?? '';
  const statusParam = sp.get('status') ?? 'all_not_deleted';
  const start = Math.max(0, parseInt(sp.get('start') ?? '0', 10) || 0);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(sp.get('limit') ?? String(PAGE_SIZE), 10) || PAGE_SIZE),
  );

  // Validate and resolve target pipeline(s)
  const requestedPipelineIdRaw = sp.get('pipeline_id');
  let targetPipelineIds = allowedPipelineIds;
  if (requestedPipelineIdRaw !== null) {
    const parsed = parseInt(requestedPipelineIdRaw, 10);
    if (!Number.isFinite(parsed) || !allowedPipelineIds.includes(parsed)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unauthorised pipeline_id' },
        { status: 400 },
      );
    }
    targetPipelineIds = [parsed];
  }

  // Optional stage_id filter
  const stageIdRaw = sp.get('stage_id');
  const stageIdFilter = stageIdRaw !== null ? parseInt(stageIdRaw, 10) || null : null;

  try {
    // Fetch pipeline names + all stages in parallel (from cache when warm)
    const [pipelinesRes, stagesRes] = await Promise.all([
      cached('pipelines', () => pipedrive.pipelines.list(), 5 * 60 * 1000),
      cached('stages', () => pipedrive.stages.list(), 5 * 60 * 1000),
    ]);

    const pipelineMap = new Map<number, string>(
      (pipelinesRes.data ?? []).map((p) => [p.id, p.name]),
    );
    const stageMap = new Map<number, string>(
      (stagesRes.data ?? []).map((s: PipedriveStage) => [s.id, s.name]),
    );

    const pipelines = allowedPipelineIds.map((id) => ({
      id,
      name: pipelineMap.get(id) ?? `Pipeline ${id}`,
    }));

    // Always fetch all_not_deleted deals so we can compute an accurate summary.
    // Filtering by status / stage / search is done in memory after fetching.
    const allResults = await Promise.all(
      targetPipelineIds.map((id) => {
        const cacheKey = `caller-leads:${id}:all_not_deleted:all`;
        return cached(
          cacheKey,
          () => pipedrive.pipelines.deals(id, { status: 'all_not_deleted', limit: 500 }),
          CACHE_TTL,
        );
      }),
    );

    const allDeals = allResults.flatMap((r) => r.data ?? []);

    // ── Compute summary from the full unfiltered set ──────────────────────
    const openDealsFull = allDeals.filter((d) => d.status === 'open');
    const stageCountMap = new Map<number, number>();
    for (const d of openDealsFull) {
      stageCountMap.set(d.stage_id, (stageCountMap.get(d.stage_id) ?? 0) + 1);
    }
    const targetPipelineSet = new Set(targetPipelineIds);
    const orderedStages = (stagesRes.data ?? ([] as PipedriveStage[]))
      .filter((s: PipedriveStage) => targetPipelineSet.has(s.pipeline_id))
      .sort((a: PipedriveStage, b: PipedriveStage) => a.order_nr - b.order_nr);

    // ── Per-pipeline summaries ──────────────────────────────────────────
    const pipelineSummaries: PipelineSummary[] = targetPipelineIds.map((pid) => {
      const pDeals = allDeals.filter((d) => d.pipeline_id === pid);
      const pOpen = pDeals.filter((d) => d.status === 'open');
      const pStageCount = new Map<number, number>();
      for (const d of pOpen) {
        pStageCount.set(d.stage_id, (pStageCount.get(d.stage_id) ?? 0) + 1);
      }
      const pStages = orderedStages
        .filter((s: PipedriveStage) => s.pipeline_id === pid)
        .map((s: PipedriveStage) => ({
          stage_id: s.id,
          stage_name: s.name,
          count: pStageCount.get(s.id) ?? 0,
          pipeline_id: s.pipeline_id,
        }));
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return {
        pipeline_id: pid,
        pipeline_name: pipelineMap.get(pid) ?? `Pipeline ${pid}`,
        openDeals: pOpen.length,
        wonDeals: pDeals.filter((d) => d.status === 'won').length,
        lostDeals: pDeals.filter((d) => d.status === 'lost').length,
        totalOpenValue: pOpen.reduce((sum, d) => sum + (d.value ?? 0), 0),
        currency: pOpen[0]?.currency ?? pDeals[0]?.currency ?? 'AUD',
        stages: pStages,
        recentlyAdded: pDeals.filter((d) => new Date(d.add_time).getTime() > sevenDaysAgo).length,
        totalStages: pStages.length,
      };
    });

    const summary: CallerLeadsSummary = {
      openDeals: openDealsFull.length,
      wonDeals: allDeals.filter((d) => d.status === 'won').length,
      lostDeals: allDeals.filter((d) => d.status === 'lost').length,
      totalOpenValue: openDealsFull.reduce((sum, d) => sum + (d.value ?? 0), 0),
      currency: openDealsFull[0]?.currency ?? allDeals[0]?.currency ?? 'AUD',
      stages: orderedStages.map((s: PipedriveStage) => ({
        stage_id: s.id,
        stage_name: s.name,
        count: stageCountMap.get(s.id) ?? 0,
        pipeline_id: s.pipeline_id,
      })),
      pipelineSummaries,
    };

    // ── Filter the deal list for display ─────────────────────────────────
    let filtered = allDeals;

    if (statusParam !== 'all_not_deleted') {
      filtered = filtered.filter((d) => d.status === statusParam);
    }
    if (stageIdFilter !== null) {
      filtered = filtered.filter((d) => d.stage_id === stageIdFilter);
    }
    if (searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title?.toLowerCase().includes(term) ||
          (d.org_name as string | null | undefined)?.toLowerCase().includes(term) ||
          (d.person_name as string | null | undefined)?.toLowerCase().includes(term),
      );
    }

    filtered.sort((a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime());

    const page = filtered.slice(start, start + limit);
    const hasMore = start + limit < filtered.length;
    const nextStart = start + limit;
    const deals = page.map((d) => enrichDeal(d, stageMap, pipelineMap));

    const data: CallerLeadsResponse = { deals, hasMore, nextStart, pipelines, summary };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof PipedriveNotConfiguredError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 503 });
    }
    if (err instanceof PipedriveError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch leads';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

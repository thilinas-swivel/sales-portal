'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  ArrowRight,
  Flame,
  Target,
  Loader2,
  UserCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { usePipelines, usePipelineConfig } from '@/hooks/use-pipedrive';
import type {
  PipedriveDeal,
  PipedrivePipeline,
  PipedriveStage,
  PipedriveListResponse,
} from '@/types/pipedrive';
import {
  formatDistanceToNow,
  startOfWeek,
  startOfMonth,
  format,
  parseISO,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineWithDeals {
  pipeline: PipedrivePipeline;
  stages: PipedriveStage[];
  deals: PipedriveDeal[];
  category: 'top_of_funnel' | 'warmed';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatCurrency(value: number, currency = 'USD'): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function isDealWon(deal: PipedriveDeal, lastStageIds: Set<number>): boolean {
  return deal.status === 'won' || lastStageIds.has(deal.stage_id);
}

export function buildLastStageIds(stages: PipedriveStage[]): Set<number> {
  const maxByPipeline = new Map<number, PipedriveStage>();
  for (const s of stages) {
    const current = maxByPipeline.get(s.pipeline_id);
    if (!current || s.order_nr > current.order_nr) {
      maxByPipeline.set(s.pipeline_id, s);
    }
  }
  return new Set([...maxByPipeline.values()].map((s) => s.id));
}

export const stageColorClasses = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-green-500',
  'bg-lime-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-rose-500',
];

export const statusStyles: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  won: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  lost: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Data hook
// ---------------------------------------------------------------------------

export function usePipelineData() {
  const [pipelineDeals, setPipelineDeals] = useState<PipelineWithDeals[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);

  const {
    data: pipelinesData,
    loading: pipelinesLoading,
    error: pipelinesError,
    refetch: refetchPipelines,
  } = usePipelines();

  const { data: configData, loading: configLoading } = usePipelineConfig();

  const allPipelines = pipelinesData?.data?.pipelines ?? [];
  const allStages = pipelinesData?.data?.stages ?? [];
  const configReady = !!configData && !configLoading;
  const selectedIds = configData?.data?.selectedPipelineIds ?? [];
  const topOfFunnelIds = configData?.data?.topOfFunnelPipelineIds ?? [];

  const selectedPipelines = useMemo(() => {
    if (!configReady || selectedIds.length === 0) return [];
    return allPipelines
      .filter((p) => selectedIds.includes(p.id))
      .sort((a, b) => a.order_nr - b.order_nr);
  }, [allPipelines, selectedIds, configReady]);

  const stageMap = useMemo(() => {
    const map = new Map<number, PipedriveStage>();
    for (const s of allStages) map.set(s.id, s);
    return map;
  }, [allStages]);

  const fetchAllDeals = useCallback(async () => {
    if (selectedPipelines.length === 0) return;
    setDealsLoading(true);
    setDealsError(null);
    const refreshFlag = isRefreshingRef.current ? '&refresh=true' : '';

    try {
      const results = await Promise.all(
        selectedPipelines.map(async (pipeline) => {
          const res = await fetch(
            `/api/pipedrive/pipelines/${pipeline.id}/deals?limit=500&status=all_not_deleted${refreshFlag}`,
          );
          if (!res.ok) throw new Error(`Failed to fetch deals for ${pipeline.name}`);
          const json = (await res.json()) as PipedriveListResponse<PipedriveDeal>;

          const pipelineStages = allStages
            .filter((s) => s.pipeline_id === pipeline.id)
            .sort((a, b) => a.order_nr - b.order_nr);

          return {
            pipeline,
            stages: pipelineStages,
            deals: json.data ?? [],
            category: (topOfFunnelIds.includes(pipeline.id) ? 'top_of_funnel' : 'warmed') as
              | 'top_of_funnel'
              | 'warmed',
          };
        }),
      );
      setPipelineDeals(results);
    } catch (err) {
      setDealsError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setDealsLoading(false);
    }
  }, [selectedPipelines, allStages, topOfFunnelIds]);

  useEffect(() => {
    if (selectedPipelines.length > 0 && allStages.length > 0) {
      fetchAllDeals();
    }
  }, [selectedPipelines, allStages, fetchAllDeals]);

  const globalLastStageIds = useMemo(() => buildLastStageIds(allStages), [allStages]);

  const isLoading = pipelinesLoading || configLoading || dealsLoading;
  const error = pipelinesError || dealsError;

  const handleRefresh = async () => {
    await fetch('/api/pipedrive/cache/clear', { method: 'POST' }).catch(() => {});
    isRefreshingRef.current = true;
    refetchPipelines();
    fetchAllDeals().finally(() => {
      isRefreshingRef.current = false;
    });
  };

  return {
    pipelineDeals,
    isLoading,
    error,
    stageMap,
    selectedPipelines,
    globalLastStageIds,
    allPipelines,
    handleRefresh,
  };
}

// ---------------------------------------------------------------------------
// Filter helper
// ---------------------------------------------------------------------------

export function filterPipelines(
  pipelineDeals: PipelineWithDeals[],
  searchQuery: string,
  statusFilter: string,
  globalLastStageIds: Set<number>,
): PipelineWithDeals[] {
  return pipelineDeals.map((p) => {
    let deals = p.deals;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      deals = deals.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.person_name && d.person_name.toLowerCase().includes(q)) ||
          (d.org_name && d.org_name.toLowerCase().includes(q)),
      );
    }

    if (statusFilter === 'won') {
      deals = deals.filter((d) => isDealWon(d, globalLastStageIds));
    } else if (statusFilter !== 'all') {
      deals = deals.filter((d) => d.status === statusFilter);
    }

    return { ...p, deals };
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
      </div>
      {sub && <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">{sub}</div>}
    </div>
  );
}

export function StageFlow({ stages, deals }: { stages: PipedriveStage[]; deals: PipedriveDeal[] }) {
  const sorted = [...stages].sort((a, b) => a.order_nr - b.order_nr);
  return (
    <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
      {sorted.map((stage, idx) => {
        const stageDeals = deals.filter((d) => d.stage_id === stage.id);
        const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
        const colorClass = stageColorClasses[idx % stageColorClasses.length];
        return (
          <div key={stage.id} className="flex items-stretch">
            <div className="min-w-[140px] flex flex-col rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {stage.name}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {stageDeals.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {stageValue > 0 ? formatCurrency(stageValue) : '$0'}
              </div>
              {stage.deal_probability > 0 && (
                <div className="mt-1 text-[10px] text-gray-400">{stage.deal_probability}% prob</div>
              )}
            </div>
            {idx < sorted.length - 1 && (
              <div className="flex items-center px-1">
                <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category stage summary
// ---------------------------------------------------------------------------

interface AggregatedStage {
  name: string;
  dealCount: number;
  value: number;
}

export function CategoryStageSummary({
  label,
  icon: Icon,
  iconColor,
  badgeColor,
  pipelinesData,
  showWon,
  lastStageIds,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badgeColor: string;
  pipelinesData: PipelineWithDeals[];
  showWon: boolean;
  lastStageIds: Set<number>;
}) {
  const totalDeals = pipelinesData.reduce((s, p) => s + p.deals.length, 0);
  const totalValue = pipelinesData.reduce(
    (s, p) => s + p.deals.reduce((v, d) => v + (d.value || 0), 0),
    0,
  );
  const openDeals = pipelinesData
    .flatMap((p) => p.deals)
    .filter((d) => d.status === 'open' && !lastStageIds.has(d.stage_id));
  const wonDeals = showWon
    ? pipelinesData.flatMap((p) => p.deals).filter((d) => isDealWon(d, lastStageIds))
    : [];
  const lostDeals = pipelinesData.flatMap((p) => p.deals).filter((d) => d.status === 'lost');

  const aggregatedStages = useMemo(() => {
    const stageAgg = new Map<string, AggregatedStage>();
    for (const p of pipelinesData) {
      const sortedStages = [...p.stages].sort((a, b) => a.order_nr - b.order_nr);
      for (const stage of sortedStages) {
        const stageDeals = p.deals.filter((d) => d.stage_id === stage.id);
        const existing = stageAgg.get(stage.name);
        if (existing) {
          existing.dealCount += stageDeals.length;
          existing.value += stageDeals.reduce((s, d) => s + (d.value || 0), 0);
        } else {
          stageAgg.set(stage.name, {
            name: stage.name,
            dealCount: stageDeals.length,
            value: stageDeals.reduce((s, d) => s + (d.value || 0), 0),
          });
        }
      }
    }
    return [...stageAgg.values()];
  }, [pipelinesData]);

  if (pipelinesData.length === 0) return null;

  const maxDealCount = Math.max(1, ...aggregatedStages.map((s) => s.dealCount));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${badgeColor}`}>
              {pipelinesData.length} pipeline{pipelinesData.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-0.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">{totalDeals} deals</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(totalValue)} total value
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {openDeals.length} open
            </span>
            {showWon && (
              <span className="text-xs text-green-600 dark:text-green-400">
                {wonDeals.length} won
              </span>
            )}
            <span className="text-xs text-red-500 dark:text-red-400">{lostDeals.length} lost</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          Stage Summary
        </div>
        <div className="space-y-2.5">
          {aggregatedStages.map((stage, idx) => {
            const barPct = (stage.dealCount / maxDealCount) * 100;
            const colorClass = stageColorClasses[idx % stageColorClasses.length];
            const textColorClass = colorClass.replace('bg-', 'text-');
            return (
              <div key={stage.name} className="flex items-center gap-3">
                <div className="w-[140px] flex-shrink-0 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colorClass}`} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {stage.name}
                  </span>
                </div>
                <div className="flex-1 h-7 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg ${colorClass} opacity-20 transition-all duration-500`}
                    style={{ width: `${Math.max(barPct, 2)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center pl-2">
                    <span className={`text-xs font-bold ${textColorClass}`}>{stage.dealCount}</span>
                  </div>
                </div>
                <div className="w-[80px] text-right flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {stage.value > 0 ? formatCurrency(stage.value) : '$0'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact engagement distribution
// ---------------------------------------------------------------------------

interface ContactEntry {
  name: string;
  dealCount: number;
  totalValue: number;
}

interface PipelineContactSummary {
  pipelineName: string;
  category: 'top_of_funnel' | 'warmed';
  uniqueContacts: number;
  uniqueOrgs: number;
  dealsWithContact: number;
  dealsWithoutContact: number;
  topContacts: ContactEntry[];
}

export function ContactDistribution({ pipelinesData }: { pipelinesData: PipelineWithDeals[] }) {
  const overallStats = useMemo(() => {
    const allDeals = pipelinesData.flatMap((p) => p.deals);
    const contactMap = new Map<string, ContactEntry>();
    const orgSet = new Set<string>();
    let dealsWithContact = 0;
    let dealsWithoutContact = 0;

    for (const deal of allDeals) {
      if (deal.person_name) {
        dealsWithContact++;
        const key = deal.person_name;
        const existing = contactMap.get(key);
        if (existing) {
          existing.dealCount++;
          existing.totalValue += deal.value || 0;
        } else {
          contactMap.set(key, { name: key, dealCount: 1, totalValue: deal.value || 0 });
        }
      } else {
        dealsWithoutContact++;
      }
      if (deal.org_name) orgSet.add(deal.org_name);
    }

    const allContacts = [...contactMap.values()].sort((a, b) => b.dealCount - a.dealCount);
    return {
      uniqueContacts: contactMap.size,
      uniqueOrgs: orgSet.size,
      totalDeals: allDeals.length,
      dealsWithContact,
      dealsWithoutContact,
      topContacts: allContacts.slice(0, 5),
      distribution: (() => {
        const dist = new Map<number, number>();
        for (const c of allContacts) {
          dist.set(c.dealCount, (dist.get(c.dealCount) || 0) + 1);
        }
        return [...dist.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([deals, contacts]) => ({ deals, contacts }));
      })(),
    };
  }, [pipelinesData]);

  const perPipeline = useMemo<PipelineContactSummary[]>(() => {
    return pipelinesData.map((p) => {
      const contactMap = new Map<string, ContactEntry>();
      const orgSet = new Set<string>();
      let dealsWithContact = 0;
      let dealsWithoutContact = 0;

      for (const deal of p.deals) {
        if (deal.person_name) {
          dealsWithContact++;
          const key = deal.person_name;
          const existing = contactMap.get(key);
          if (existing) {
            existing.dealCount++;
            existing.totalValue += deal.value || 0;
          } else {
            contactMap.set(key, { name: key, dealCount: 1, totalValue: deal.value || 0 });
          }
        } else {
          dealsWithoutContact++;
        }
        if (deal.org_name) orgSet.add(deal.org_name);
      }

      return {
        pipelineName: p.pipeline.name,
        category: p.category,
        uniqueContacts: contactMap.size,
        uniqueOrgs: orgSet.size,
        dealsWithContact,
        dealsWithoutContact,
        topContacts: [...contactMap.values()].sort((a, b) => b.dealCount - a.dealCount).slice(0, 3),
      };
    });
  }, [pipelinesData]);

  if (pipelinesData.length === 0) return null;

  const maxDistCount = Math.max(1, ...overallStats.distribution.map((d) => d.contacts));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Contact Engagement
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Distribution of contacts across deals and pipelines
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-violet-700 dark:text-violet-400">
              {overallStats.uniqueContacts}
            </div>
            <div className="text-[11px] text-violet-600 dark:text-violet-400">Unique Contacts</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
              {overallStats.uniqueOrgs}
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400">Organizations</div>
          </div>
          <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-700 dark:text-green-400">
              {overallStats.dealsWithContact}
            </div>
            <div className="text-[11px] text-green-600 dark:text-green-400">Deals with Contact</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
              {overallStats.dealsWithoutContact}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">No Contact</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Deals per Contact
            </div>
            {overallStats.distribution.length > 0 ? (
              <div className="space-y-1.5">
                {overallStats.distribution.map((d) => {
                  const barPct = (d.contacts / maxDistCount) * 100;
                  return (
                    <div key={d.deals} className="flex items-center gap-2">
                      <div className="w-[70px] flex-shrink-0 text-right">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {d.deals} deal{d.deals !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex-1 h-6 bg-gray-50 dark:bg-gray-800 rounded relative overflow-hidden">
                        <div
                          className="h-full rounded bg-violet-500 opacity-20 transition-all duration-500"
                          style={{ width: `${Math.max(barPct, 3)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center pl-2">
                          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                            {d.contacts} contact{d.contacts !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No contact data</p>
            )}
          </div>

          <div>
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Top Engaged Contacts
            </div>
            {overallStats.topContacts.length > 0 ? (
              <div className="space-y-2">
                {overallStats.topContacts.map((c, idx) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center text-[10px] font-bold text-violet-600 dark:text-violet-400 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {c.dealCount} deal{c.dealCount !== 1 ? 's' : ''} ·{' '}
                        {formatCurrency(c.totalValue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No contact data</p>
            )}
          </div>
        </div>

        {perPipeline.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              By Pipeline
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-2 pr-4">Pipeline</th>
                    <th className="pb-2 pr-4 text-right">Contacts</th>
                    <th className="pb-2 pr-4 text-right">Orgs</th>
                    <th className="pb-2 pr-4 text-right">With Contact</th>
                    <th className="pb-2 pr-4 text-right">No Contact</th>
                    <th className="pb-2">Top Contacts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {perPipeline.map((pp) => (
                    <tr key={pp.pipelineName}>
                      <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {pp.pipelineName}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-300">
                        {pp.uniqueContacts}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-300">
                        {pp.uniqueOrgs}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-green-600 dark:text-green-400">
                        {pp.dealsWithContact}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-400">
                        {pp.dealsWithoutContact}
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {pp.topContacts.length > 0 ? (
                            pp.topContacts.map((tc) => (
                              <span
                                key={tc.name}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                title={`${tc.dealCount} deals · ${formatCurrency(tc.totalValue)}`}
                              >
                                {tc.name.split(' ')[0]}
                                <span className="font-bold text-violet-600 dark:text-violet-400">
                                  {tc.dealCount}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client intelligence & company profiling
// ---------------------------------------------------------------------------

const C_SUITE_PATTERNS =
  /\b(ceo|cfo|cto|coo|cmo|cio|ciso|cpo|cro|chief|president|vp|vice\s*president|director|managing\s*director|head\s+of|svp|evp|partner|founder|co-founder|owner)\b/i;

interface EnrichedPerson {
  id: number;
  name: string;
  jobTitle: string | null;
  isCsuite: boolean;
  orgId: number | null;
  orgName: string | null;
  dealCount: number;
  totalValue: number;
}

interface CompanyProfile {
  name: string;
  orgId: number | null;
  dealCount: number;
  totalValue: number;
  avgDealSize: number;
  contactCount: number;
  csuiteCount: number;
  wonDeals: number;
  openDeals: number;
  lostDeals: number;
  category: 'top_of_funnel' | 'warmed' | 'both';
  spendingTier: 'enterprise' | 'mid_market' | 'smb' | 'micro';
  revenue: number | null;
}

interface TierThresholds {
  deal_enterprise: number;
  deal_mid_market: number;
  deal_smb: number;
  rev_enterprise: number;
  rev_mid_market: number;
  rev_smb: number;
}

const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  deal_enterprise: 100_000,
  deal_mid_market: 25_000,
  deal_smb: 5_000,
  rev_enterprise: 50_000_000,
  rev_mid_market: 10_000_000,
  rev_smb: 1_000_000,
};

function getSpendingTier(
  revenue: number | null,
  totalDealValue: number,
  thresholds: TierThresholds = DEFAULT_TIER_THRESHOLDS,
): CompanyProfile['spendingTier'] {
  if (revenue != null && revenue > 0) {
    if (revenue >= thresholds.rev_enterprise) return 'enterprise';
    if (revenue >= thresholds.rev_mid_market) return 'mid_market';
    if (revenue >= thresholds.rev_smb) return 'smb';
    return 'micro';
  }
  if (totalDealValue >= thresholds.deal_enterprise) return 'enterprise';
  if (totalDealValue >= thresholds.deal_mid_market) return 'mid_market';
  if (totalDealValue >= thresholds.deal_smb) return 'smb';
  return 'micro';
}

const tierConfig: Record<
  CompanyProfile['spendingTier'],
  { label: string; color: string; bgColor: string }
> = {
  enterprise: {
    label: 'Enterprise',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-500/10',
  },
  mid_market: {
    label: 'Mid-Market',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
  },
  smb: {
    label: 'SMB',
    color: 'text-teal-700 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-500/10',
  },
  micro: {
    label: 'Micro',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
  },
};

export function ClientInsights({ pipelinesData }: { pipelinesData: PipelineWithDeals[] }) {
  const [enrichmentData, setEnrichmentData] = useState<{
    persons: Record<string, unknown>[];
    organizations: Record<string, unknown>[];
    dealFields: Record<string, unknown>[];
    orgFields: Record<string, unknown>[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobTitleKey, setJobTitleKey] = useState<string | null>(null);
  const [revenueFieldKey, setRevenueFieldKey] = useState<string | null>(null);
  const [tierThresholds, setTierThresholds] = useState<TierThresholds>(DEFAULT_TIER_THRESHOLDS);

  useEffect(() => {
    fetch('/api/settings/tiers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setTierThresholds({
            deal_enterprise:
              Number(json.data.deal_enterprise) || DEFAULT_TIER_THRESHOLDS.deal_enterprise,
            deal_mid_market:
              Number(json.data.deal_mid_market) || DEFAULT_TIER_THRESHOLDS.deal_mid_market,
            deal_smb: Number(json.data.deal_smb) || DEFAULT_TIER_THRESHOLDS.deal_smb,
            rev_enterprise:
              Number(json.data.rev_enterprise) || DEFAULT_TIER_THRESHOLDS.rev_enterprise,
            rev_mid_market:
              Number(json.data.rev_mid_market) || DEFAULT_TIER_THRESHOLDS.rev_mid_market,
            rev_smb: Number(json.data.rev_smb) || DEFAULT_TIER_THRESHOLDS.rev_smb,
          });
        }
      })
      .catch(() => {});
  }, []);

  const { personIds, orgIds } = useMemo(() => {
    const pIds = new Set<number>();
    const oIds = new Set<number>();
    for (const p of pipelinesData) {
      for (const d of p.deals) {
        if (d.person_id) pIds.add(d.person_id);
        if (d.org_id) oIds.add(d.org_id);
      }
    }
    return { personIds: [...pIds], orgIds: [...oIds] };
  }, [pipelinesData]);

  useEffect(() => {
    if (personIds.length === 0 && orgIds.length === 0) return;
    let cancelled = false;
    // Use queueMicrotask to avoid synchronous setState in effect body
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetch('/api/pipedrive/enrichment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personIds, orgIds }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setEnrichmentData(json.data);
          const fields = json.data.dealFields as { key: string; name: string }[];
          const titleField = fields.find((f) =>
            /job.?title|role|position|designation/i.test(f.name),
          );
          setJobTitleKey(titleField?.key ?? null);

          const oFields = json.data.orgFields as { key: string; name: string }[];
          const revField = oFields?.find((f) =>
            /revenue|annual.?revenue|turnover|budget|arr|annual.?income|company.?size/i.test(
              f.name,
            ),
          );
          setRevenueFieldKey(revField?.key ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [personIds, orgIds]);

  const personMap = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    if (enrichmentData?.persons) {
      for (const p of enrichmentData.persons) {
        if (typeof p.id === 'number') map.set(p.id, p);
      }
    }
    return map;
  }, [enrichmentData]);

  const orgMap = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    if (enrichmentData?.organizations) {
      for (const o of enrichmentData.organizations) {
        if (typeof o.id === 'number') map.set(o.id, o);
      }
    }
    return map;
  }, [enrichmentData]);

  const enrichedPersons = useMemo<EnrichedPerson[]>(() => {
    const contactMap = new Map<number, EnrichedPerson>();
    for (const p of pipelinesData) {
      for (const deal of p.deals) {
        if (!deal.person_id) continue;
        const existing = contactMap.get(deal.person_id);
        if (existing) {
          existing.dealCount++;
          existing.totalValue += deal.value || 0;
        } else {
          const personData = personMap.get(deal.person_id);
          let jobTitle: string | null = null;
          if (personData && jobTitleKey) {
            const val = personData[jobTitleKey];
            if (typeof val === 'string' && val.trim()) jobTitle = val.trim();
          }
          if (!jobTitle && personData) {
            for (const key of ['job_title', 'title', 'role', 'position']) {
              const val = personData[key];
              if (typeof val === 'string' && val.trim()) {
                jobTitle = val.trim();
                break;
              }
            }
          }
          const name = deal.person_name || `Person ${deal.person_id}`;
          const isCsuite = jobTitle ? C_SUITE_PATTERNS.test(jobTitle) : C_SUITE_PATTERNS.test(name);
          contactMap.set(deal.person_id, {
            id: deal.person_id,
            name,
            jobTitle,
            isCsuite,
            orgId: deal.org_id,
            orgName: deal.org_name || null,
            dealCount: 1,
            totalValue: deal.value || 0,
          });
        }
      }
    }
    return [...contactMap.values()].sort((a, b) => b.totalValue - a.totalValue);
  }, [pipelinesData, personMap, jobTitleKey]);

  const companyProfiles = useMemo<CompanyProfile[]>(() => {
    const compMap = new Map<string, CompanyProfile>();
    for (const p of pipelinesData) {
      for (const deal of p.deals) {
        const name = deal.org_name || 'No Organization';
        const existing = compMap.get(name);
        if (existing) {
          existing.dealCount++;
          existing.totalValue += deal.value || 0;
          if (deal.status === 'won') existing.wonDeals++;
          else if (deal.status === 'lost') existing.lostDeals++;
          else existing.openDeals++;
          if (p.category !== existing.category && existing.category !== 'both') {
            existing.category = 'both';
          }
        } else {
          compMap.set(name, {
            name,
            orgId: deal.org_id,
            dealCount: 1,
            totalValue: deal.value || 0,
            avgDealSize: 0,
            contactCount: 0,
            csuiteCount: 0,
            wonDeals: deal.status === 'won' ? 1 : 0,
            openDeals: deal.status === 'open' ? 1 : 0,
            lostDeals: deal.status === 'lost' ? 1 : 0,
            category: p.category,
            spendingTier: 'micro',
            revenue: null,
          });
        }
      }
    }
    for (const comp of compMap.values()) {
      comp.avgDealSize = comp.dealCount > 0 ? comp.totalValue / comp.dealCount : 0;

      let orgRevenue: number | null = null;
      if (comp.orgId && revenueFieldKey) {
        const orgData = orgMap.get(comp.orgId);
        if (orgData) {
          const raw = orgData[revenueFieldKey];
          const parsed =
            typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN;
          if (!isNaN(parsed) && parsed > 0) orgRevenue = parsed;
        }
      }
      comp.revenue = orgRevenue;
      comp.spendingTier = getSpendingTier(orgRevenue, comp.totalValue, tierThresholds);

      const contacts = enrichedPersons.filter((ep) => ep.orgName === comp.name);
      comp.contactCount = contacts.length;
      comp.csuiteCount = contacts.filter((c) => c.isCsuite).length;
    }
    return [...compMap.values()]
      .filter((c) => c.name !== 'No Organization')
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [pipelinesData, enrichedPersons, orgMap, revenueFieldKey, tierThresholds]);

  const csuiteStats = useMemo(() => {
    const total = enrichedPersons.length;
    const csuite = enrichedPersons.filter((p) => p.isCsuite).length;
    return {
      total,
      csuite,
      nonCsuite: total - csuite,
      pct: total > 0 ? Math.round((csuite / total) * 100) : 0,
    };
  }, [enrichedPersons]);

  const tierDistribution = useMemo(() => {
    const tiers = { enterprise: 0, mid_market: 0, smb: 0, micro: 0 };
    const tierValue = { enterprise: 0, mid_market: 0, smb: 0, micro: 0 };
    for (const c of companyProfiles) {
      tiers[c.spendingTier]++;
      tierValue[c.spendingTier] += c.totalValue;
    }
    return Object.entries(tiers).map(([tier, count]) => ({
      tier: tier as CompanyProfile['spendingTier'],
      count,
      value: tierValue[tier as CompanyProfile['spendingTier']],
    }));
  }, [companyProfiles]);

  const pipelineTierBreakdown = useMemo(() => {
    const result: {
      pipelineName: string;
      category: string;
      tiers: Record<CompanyProfile['spendingTier'], number>;
      totalValue: number;
    }[] = [];
    for (const p of pipelinesData) {
      const tiers = { enterprise: 0, mid_market: 0, smb: 0, micro: 0 };
      const orgSeen = new Set<string>();
      for (const deal of p.deals) {
        const orgName = deal.org_name || 'No Organization';
        if (orgSeen.has(orgName)) continue;
        orgSeen.add(orgName);
        const profile = companyProfiles.find((c) => c.name === orgName);
        if (profile) tiers[profile.spendingTier]++;
      }
      result.push({
        pipelineName: p.pipeline.name,
        category: p.category === 'top_of_funnel' ? 'Prospects' : 'Deals',
        tiers,
        totalValue: p.deals.reduce((s, d) => s + (d.value || 0), 0),
      });
    }
    return result;
  }, [pipelinesData, companyProfiles]);

  if (pipelinesData.length === 0) return null;

  const topCompanies = companyProfiles.slice(0, 8);
  const maxCompanyValue = Math.max(1, ...topCompanies.map((c) => c.totalValue));
  const totalTierCompanies = Math.max(1, companyProfiles.length);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Client Intelligence
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Company profiles, decision-maker engagement & spending capacity
            </p>
          </div>
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>
      </div>

      <div className="p-5 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {companyProfiles.length}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Companies</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
              {csuiteStats.csuite}
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400">Decision Makers</div>
            <div className="text-[10px] text-purple-500 dark:text-purple-400/70">
              {csuiteStats.pct}% of contacts
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
              {tierDistribution.find((t) => t.tier === 'enterprise')?.count ?? 0}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400">Enterprise Clients</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
              {companyProfiles.length > 0
                ? formatCurrency(
                    companyProfiles.reduce((s, c) => s + c.avgDealSize, 0) / companyProfiles.length,
                  )
                : '$0'}
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400">Avg Deal Size</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Spending Capacity Tiers
            </div>
            <div className="space-y-2">
              {tierDistribution.map(({ tier, count, value }) => {
                const cfg = tierConfig[tier];
                const pct = (count / totalTierCompanies) * 100;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <div className="w-[90px] flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cfg.bgColor} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex-1 h-7 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg bg-emerald-500 opacity-20 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {count} compan{count !== 1 ? 'ies' : 'y'}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {formatCurrency(value)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Decision-Maker Engagement
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg
                  viewBox="0 0 36 36"
                  className="w-24 h-24"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    className="text-gray-100 dark:text-gray-800"
                    strokeWidth="4"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="currentColor"
                    className="text-purple-500"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${csuiteStats.pct * 0.88} 88`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {csuiteStats.pct}%
                  </span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">C-Suite / Senior</span>
                  <span className="ml-auto text-xs font-bold text-gray-900 dark:text-white">
                    {csuiteStats.csuite}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Other Contacts</span>
                  <span className="ml-auto text-xs font-bold text-gray-900 dark:text-white">
                    {csuiteStats.nonCsuite}
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                  Based on title patterns (CEO, VP, Director, etc.)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Top Company Profiles
          </div>
          {topCompanies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-2 pr-3">Company</th>
                    <th className="pb-2 pr-3">Tier</th>
                    <th className="pb-2 pr-3 text-right">Pipeline Value</th>
                    <th className="pb-2 pr-3 text-right">Deals</th>
                    <th className="pb-2 pr-3 text-right">Avg Deal</th>
                    <th className="pb-2 pr-3 text-right">Contacts</th>
                    <th className="pb-2 pr-3 text-right">C-Suite</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {topCompanies.map((comp) => {
                    const cfg = tierConfig[comp.spendingTier];
                    const barPct = (comp.totalValue / maxCompanyValue) * 100;
                    return (
                      <tr key={comp.name}>
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                            {comp.name}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cfg.bgColor} ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(comp.totalValue)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-gray-700 dark:text-gray-300">
                          {comp.dealCount}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(comp.avgDealSize)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-gray-700 dark:text-gray-300">
                          {comp.contactCount}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          {comp.csuiteCount > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              {comp.csuiteCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            {comp.wonDeals > 0 && (
                              <span className="text-[10px] text-green-600 dark:text-green-400">
                                {comp.wonDeals}W
                              </span>
                            )}
                            {comp.openDeals > 0 && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400">
                                {comp.openDeals}O
                              </span>
                            )}
                            {comp.lostDeals > 0 && (
                              <span className="text-[10px] text-red-500 dark:text-red-400">
                                {comp.lostDeals}L
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="w-[80px] h-4 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden relative">
                            <div
                              className="h-full rounded bg-emerald-500 opacity-25"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {companyProfiles.length > 8 && (
                <div className="mt-2 text-center text-[11px] text-gray-400">
                  Showing top 8 of {companyProfiles.length} companies by pipeline value
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No organization data available</p>
          )}
        </div>

        {pipelineTierBreakdown.length > 0 && (
          <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Client Quality by Pipeline
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pipelineTierBreakdown.map((pp) => {
                const total =
                  pp.tiers.enterprise + pp.tiers.mid_market + pp.tiers.smb + pp.tiers.micro;
                return (
                  <div
                    key={pp.pipelineName}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {pp.pipelineName}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {formatCurrency(pp.totalValue)} total
                    </div>
                    <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                      {total > 0 && (
                        <>
                          {pp.tiers.enterprise > 0 && (
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${(pp.tiers.enterprise / total) * 100}%` }}
                              title={`Enterprise: ${pp.tiers.enterprise}`}
                            />
                          )}
                          {pp.tiers.mid_market > 0 && (
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${(pp.tiers.mid_market / total) * 100}%` }}
                              title={`Mid-Market: ${pp.tiers.mid_market}`}
                            />
                          )}
                          {pp.tiers.smb > 0 && (
                            <div
                              className="h-full bg-teal-500"
                              style={{ width: `${(pp.tiers.smb / total) * 100}%` }}
                              title={`SMB: ${pp.tiers.smb}`}
                            />
                          )}
                          {pp.tiers.micro > 0 && (
                            <div
                              className="h-full bg-gray-400"
                              style={{ width: `${(pp.tiers.micro / total) * 100}%` }}
                              title={`Micro: ${pp.tiers.micro}`}
                            />
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                      {(['enterprise', 'mid_market', 'smb', 'micro'] as const).map((tier) => {
                        const cnt = pp.tiers[tier];
                        if (cnt === 0) return null;
                        const cfg = tierConfig[tier];
                        return (
                          <span key={tier} className={`text-[10px] ${cfg.color}`}>
                            {cfg.label}: {cnt}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage Conversion Trend
// ---------------------------------------------------------------------------

interface StageConversion {
  stageName: string;
  dealCount: number;
  value: number;
  conversionRate: number | null;
  dropOff: number;
  avgDaysInStage: number | null;
  deals: PipedriveDeal[];
}

interface PipelineConversionData {
  pipelineName: string;
  pipelineId: number;
  stages: StageConversion[];
  overallConversion: number;
}

export function StageConversionTrend({
  pipelinesData,
  lastStageIds,
  title = 'Stage Conversion Trend',
  subtitle = 'Deal progression across pipeline stages',
}: {
  pipelinesData: PipelineWithDeals[];
  lastStageIds: Set<number>;
  title?: string;
  subtitle?: string;
}) {
  // Capture timestamp once at mount to avoid impure Date.now() inside useMemo
  const [mountTime] = useState(() => Date.now());

  const conversionData = useMemo(() => {
    return pipelinesData.map((pd): PipelineConversionData => {
      const sortedStages = [...pd.stages].sort((a, b) => a.order_nr - b.order_nr);
      const now = mountTime;

      const stageConversions: StageConversion[] = sortedStages.map((stage, _idx) => {
        const dealsInStage = pd.deals.filter((d) => d.stage_id === stage.id);
        const dealsReachedOrBeyond = pd.deals.filter((d) => {
          const dealStage = sortedStages.find((s) => s.id === d.stage_id);
          if (!dealStage) return false;
          return dealStage.order_nr >= stage.order_nr;
        });
        const wonLostBeyond = pd.deals.filter((d) => {
          if (d.status === 'open') return false;
          if (isDealWon(d, lastStageIds)) return true;
          const dealStageOrderNr = d.stage_order_nr ?? 0;
          return dealStageOrderNr >= stage.order_nr;
        });

        const reachedIds = new Set([
          ...dealsReachedOrBeyond.map((d) => d.id),
          ...wonLostBeyond.map((d) => d.id),
        ]);
        const reachedCount = reachedIds.size;
        const allReachedDeals = pd.deals.filter((d) => reachedIds.has(d.id));

        let avgDays: number | null = null;
        if (dealsInStage.length > 0) {
          const totalDays = dealsInStage.reduce((sum, d) => {
            const changeTime = d.stage_change_time
              ? new Date(d.stage_change_time).getTime()
              : new Date(d.add_time).getTime();
            return sum + (now - changeTime) / (1000 * 60 * 60 * 24);
          }, 0);
          avgDays = Math.round((totalDays / dealsInStage.length) * 10) / 10;
        }

        const stageValue = dealsInStage.reduce((s, d) => s + (d.value || 0), 0);

        return {
          stageName: stage.name,
          dealCount: reachedCount,
          value: stageValue,
          conversionRate: null,
          dropOff: 0,
          avgDaysInStage: avgDays,
          deals: allReachedDeals,
        };
      });

      for (let i = 0; i < stageConversions.length; i++) {
        if (i === 0) {
          stageConversions[i].conversionRate = 100;
          stageConversions[i].dropOff = 0;
        } else {
          const prev = stageConversions[i - 1].dealCount;
          const curr = stageConversions[i].dealCount;
          stageConversions[i].conversionRate = prev > 0 ? Math.round((curr / prev) * 1000) / 10 : 0;
          stageConversions[i].dropOff = prev - curr;
        }
      }

      const first = stageConversions[0]?.dealCount || 0;
      const last = stageConversions[stageConversions.length - 1]?.dealCount || 0;
      const overallConversion = first > 0 ? Math.round((last / first) * 1000) / 10 : 0;

      return {
        pipelineName: pd.pipeline.name,
        pipelineId: pd.pipeline.id,
        stages: stageConversions,
        overallConversion,
      };
    });
  }, [pipelinesData, lastStageIds, mountTime]);

  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const toggleStage = useCallback((key: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (pipelinesData.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>

      <div className="p-5 space-y-8">
        {conversionData.map((pipeline) => (
          <div key={pipeline.pipelineId}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {pipeline.pipelineName}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Overall conversion</span>
                <span
                  className={`text-sm font-bold ${pipeline.overallConversion >= 20 ? 'text-green-600 dark:text-green-400' : pipeline.overallConversion >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}
                >
                  {pipeline.overallConversion}%
                </span>
              </div>
            </div>

            <div className="space-y-1">
              {pipeline.stages.map((stage, idx) => {
                const maxCount = Math.max(1, pipeline.stages[0]?.dealCount ?? 1);
                const barPct = (stage.dealCount / maxCount) * 100;
                const colorClass = stageColorClasses[idx % stageColorClasses.length];
                const stageKey = `${pipeline.pipelineId}-${stage.stageName}`;
                const isExpanded = expandedStages.has(stageKey);

                return (
                  <div key={stage.stageName}>
                    {idx > 0 && (
                      <div className="flex items-center gap-2 py-1.5 pl-4">
                        <div className="flex items-center gap-1.5">
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                          <span
                            className={`text-xs font-semibold ${
                              (stage.conversionRate ?? 0) >= 70
                                ? 'text-green-600 dark:text-green-400'
                                : (stage.conversionRate ?? 0) >= 40
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-500 dark:text-red-400'
                            }`}
                          >
                            {stage.conversionRate}%
                          </span>
                          {stage.dropOff > 0 && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              ({stage.dropOff} dropped)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => stage.deals.length > 0 && toggleStage(stageKey)}
                    >
                      <div className="w-[130px] flex-shrink-0 flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass}`} />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                          {stage.stageName}
                        </span>
                      </div>
                      <div className="flex-1 relative h-9">
                        <div
                          className={`h-full rounded-lg ${colorClass} transition-all duration-700 ease-out`}
                          style={{
                            width: `${Math.max(barPct, 3)}%`,
                            opacity: 0.15 + (barPct / 100) * 0.55,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center pl-3">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            {stage.dealCount} deal{stage.dealCount !== 1 ? 's' : ''}
                          </span>
                          {stage.value > 0 && (
                            <span className="ml-2 text-[10px] text-gray-500 dark:text-gray-400">
                              ({formatCurrency(stage.value)})
                            </span>
                          )}
                          {stage.deals.length > 0 && (
                            <Eye
                              className={`w-3 h-3 ml-2 transition-opacity ${
                                isExpanded
                                  ? 'opacity-60 text-gray-600 dark:text-gray-300'
                                  : 'opacity-0 group-hover:opacity-40 text-gray-500 dark:text-gray-400'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                      <div className="w-[80px] flex-shrink-0 text-right">
                        {stage.avgDaysInStage !== null && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            ~{stage.avgDaysInStage}d avg
                          </div>
                        )}
                      </div>
                    </div>

                    {isExpanded && stage.deals.length > 0 && (
                      <div className="ml-[146px] mr-[80px] mt-1 mb-2 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-hidden max-h-[320px] overflow-y-auto">
                        <table className="w-full text-[11px]">
                          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/90 z-10">
                            <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                              <th className="text-left font-medium px-3 py-1.5">Deal</th>
                              <th className="text-left font-medium px-3 py-1.5">Company</th>
                              <th className="text-right font-medium px-3 py-1.5">Value</th>
                              <th className="text-right font-medium px-3 py-1.5">In stage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stage.deals.map((deal) => (
                              <tr
                                key={deal.id}
                                className="border-b last:border-b-0 border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
                              >
                                <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px]">
                                  {deal.title}
                                </td>
                                <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                  {deal.org_name || '—'}
                                </td>
                                <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {deal.value ? formatCurrency(deal.value, deal.currency) : '—'}
                                </td>
                                <td className="px-3 py-1.5 text-right text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                  {deal.stage_change_time
                                    ? formatDistanceToNow(new Date(deal.stage_change_time), {
                                        addSuffix: false,
                                      })
                                    : formatDistanceToNow(new Date(deal.add_time), {
                                        addSuffix: false,
                                      })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Entry
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {pipeline.stages[0]?.dealCount ?? 0}
                </div>
              </div>
              <div className="flex items-center gap-1 text-gray-300 dark:text-gray-600">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Final Stage
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {pipeline.stages[pipeline.stages.length - 1]?.dealCount ?? 0}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Biggest Drop-off
                </div>
                <div className="text-sm font-semibold text-red-500 dark:text-red-400">
                  {(() => {
                    const maxDrop = pipeline.stages.reduce(
                      (max, s) => (s.dropOff > max.dropOff ? s : max),
                      { stageName: '-', dropOff: 0 } as StageConversion,
                    );
                    return maxDrop.dropOff > 0
                      ? `${maxDrop.stageName} (-${maxDrop.dropOff})`
                      : 'None';
                  })()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline section
// ---------------------------------------------------------------------------

export function PipelineSection({
  pData,
  isTopOfFunnel,
  onSelectDeal,
  stageMap,
}: {
  pData: PipelineWithDeals;
  isTopOfFunnel: boolean;
  onSelectDeal: (deal: PipedriveDeal) => void;
  stageMap: Map<number, PipedriveStage>;
}) {
  const [expanded, setExpanded] = useState(true);
  const pageSize = 10;
  const dealCount = pData.deals.length;
  const maxPage = Math.max(1, Math.ceil(dealCount / pageSize));
  const [currentPage, setCurrentPage] = useState(1);
  // Clamp page to valid range (handles deal count changes)
  const safePage = Math.min(currentPage, maxPage);
  if (safePage !== currentPage) setCurrentPage(safePage);
  const lastStageIds = useMemo(() => buildLastStageIds(pData.stages), [pData.stages]);
  const totalValue = pData.deals.reduce((s, d) => s + (d.value || 0), 0);
  const openDeals = pData.deals.filter((d) => d.status === 'open' && !lastStageIds.has(d.stage_id));
  const wonDeals = isTopOfFunnel ? [] : pData.deals.filter((d) => isDealWon(d, lastStageIds));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isTopOfFunnel
              ? 'bg-indigo-100 dark:bg-indigo-500/15'
              : 'bg-orange-100 dark:bg-orange-500/15'
          }`}
        >
          {isTopOfFunnel ? (
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {pData.pipeline.name}
            </h3>
          </div>
          <div className="flex items-center gap-4 mt-0.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {pData.deals.length} deals
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(totalValue)} value
            </span>
            {!isTopOfFunnel && (
              <span className="text-xs text-green-600 dark:text-green-400">
                {wonDeals.length} won
              </span>
            )}
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {openDeals.length} open
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {expanded && (
        <>
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 border-b border-b-gray-50 dark:border-b-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
            <StageFlow stages={pData.stages} deals={pData.deals} />
          </div>

          {pData.deals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Deal
                    </th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                      Stage
                    </th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-5 py-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                      Value
                    </th>
                    <th className="text-left px-5 py-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                      Added
                    </th>
                    <th className="text-center px-5 py-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {pData.deals
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((deal) => {
                      const stage = stageMap.get(deal.stage_id);
                      return (
                        <tr
                          key={deal.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                          onClick={() => onSelectDeal(deal)}
                        >
                          <td className="px-5 py-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {deal.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {deal.person_name || '—'}
                              {deal.org_name ? ` · ${deal.org_name}` : ''}
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              {stage?.name || `Stage ${deal.stage_id}`}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${
                                statusStyles[deal.status] || statusStyles.open
                              }`}
                            >
                              {deal.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right hidden md:table-cell">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {deal.value ? formatCurrency(deal.value, deal.currency) : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {timeAgo(deal.add_time)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDeal(deal);
                              }}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {pData.deals.length > pageSize &&
                (() => {
                  const totalPages = Math.ceil(pData.deals.length / pageSize);
                  const startItem = (currentPage - 1) * pageSize + 1;
                  const endItem = Math.min(currentPage * pageSize, pData.deals.length);
                  return (
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Showing {startItem}–{endItem} of {pData.deals.length} deals
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage((p) => Math.max(1, p - 1));
                          }}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
                          )
                          .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis');
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((item, idx) =>
                            item === 'ellipsis' ? (
                              <span key={`e-${idx}`} className="px-1 text-xs text-gray-400">
                                …
                              </span>
                            ) : (
                              <button
                                key={item}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentPage(item);
                                }}
                                className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${
                                  currentPage === item
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                              >
                                {item}
                              </button>
                            ),
                          )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage((p) => Math.min(totalPages, p + 1));
                          }}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No deals in this pipeline
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deal detail modal
// ---------------------------------------------------------------------------

export function DealDetailModal({
  deal,
  onClose,
  stageMap,
  allPipelines,
}: {
  deal: PipedriveDeal;
  onClose: () => void;
  stageMap: Map<number, PipedriveStage>;
  allPipelines: PipedrivePipeline[];
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{deal.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {deal.org_name || 'No organization'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {(
            [
              ['Person', deal.person_name || '—'],
              ['Organization', deal.org_name || '—'],
              ['Value', deal.value ? formatCurrency(deal.value, deal.currency) : '—'],
              ['Currency', deal.currency || '—'],
              ['Status', deal.status],
              ['Stage', stageMap.get(deal.stage_id)?.name || `ID: ${deal.stage_id}`],
              [
                'Pipeline',
                allPipelines.find((p) => p.id === deal.pipeline_id)?.name ||
                  `ID: ${deal.pipeline_id}`,
              ],
              ['Owner', deal.owner_name || '—'],
              ['Expected Close', deal.expected_close_date || '—'],
              ['Created', timeAgo(deal.add_time)],
              ['Updated', timeAgo(deal.update_time)],
              ['Probability', deal.probability != null ? `${deal.probability}%` : '—'],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 capitalize">
                {value}
              </div>
            </div>
          ))}
        </div>
        {deal.lost_reason && (
          <div className="px-6 pb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lost Reason</div>
            <div className="text-sm text-red-600 dark:text-red-400">{deal.lost_reason}</div>
          </div>
        )}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// ---------------------------------------------------------------------------
// Deal / Prospect inflow chart (reusable)
// ---------------------------------------------------------------------------

const PIPELINE_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#EF4444',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
];

export function InflowChart({
  pipelinesData,
  title = 'Inflow',
  subtitle = 'New deals added over time',
  accentColor = 'bg-indigo-500',
  accentHex = '#6366F1',
}: {
  pipelinesData: PipelineWithDeals[];
  title?: string;
  subtitle?: string;
  accentColor?: string;
  accentHex?: string;
}) {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  const pipelineNames = useMemo(() => pipelinesData.map((p) => p.pipeline.name), [pipelinesData]);

  const chartData = useMemo(() => {
    const startOf2026 = new Date(2026, 0, 1);

    // Collect all valid dates across pipelines to determine range
    const allDates: Date[] = [];
    for (const pd of pipelinesData) {
      for (const deal of pd.deals) {
        try {
          const d = parseISO(deal.add_time);
          if (d >= startOf2026) allDates.push(d);
        } catch {
          /* skip */
        }
      }
    }
    if (allDates.length === 0) return [];

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // Build bucket keys
    type BucketRow = { label: string; total: number; [pipeline: string]: string | number };
    const bucketOrder: string[] = [];
    const buckets = new Map<string, BucketRow>();

    if (viewMode === 'weekly') {
      const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
      for (const ws of weeks) {
        const key = format(ws, 'yyyy-MM-dd');
        bucketOrder.push(key);
        const row: BucketRow = { label: format(ws, 'MMM d'), total: 0 };
        for (const name of pipelineNames) row[name] = 0;
        buckets.set(key, row);
      }
    } else {
      const months = eachMonthOfInterval({ start: minDate, end: maxDate });
      for (const ms of months) {
        const key = format(ms, 'yyyy-MM');
        bucketOrder.push(key);
        const row: BucketRow = { label: format(ms, 'MMM yyyy'), total: 0 };
        for (const name of pipelineNames) row[name] = 0;
        buckets.set(key, row);
      }
    }

    // Fill counts per pipeline
    for (const pd of pipelinesData) {
      const pName = pd.pipeline.name;
      for (const deal of pd.deals) {
        try {
          const d = parseISO(deal.add_time);
          const key =
            viewMode === 'weekly'
              ? format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
              : format(startOfMonth(d), 'yyyy-MM');
          const row = buckets.get(key);
          if (row) {
            (row[pName] as number)++;
            row.total++;
          }
        } catch {
          /* skip */
        }
      }
    }

    return bucketOrder.map((k) => buckets.get(k)!);
  }, [pipelinesData, pipelineNames, viewMode]);

  // Per-pipeline totals for the summary table
  const pipelineTotals = useMemo(() => {
    const startOf2026 = new Date(2026, 0, 1);
    return pipelinesData
      .map((pd, i) => {
        const count = pd.deals.filter((d) => {
          try {
            return parseISO(d.add_time) >= startOf2026;
          } catch {
            return false;
          }
        }).length;
        return {
          name: pd.pipeline.name,
          count,
          color: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [pipelinesData]);

  if (pipelinesData.length === 0) return null;

  const avgCount =
    chartData.length > 0
      ? Math.round(chartData.reduce((s, d) => s + d.total, 0) / chartData.length)
      : 0;
  const latestCount = chartData.length > 0 ? chartData[chartData.length - 1].total : 0;
  const prevCount = chartData.length > 1 ? chartData[chartData.length - 2].total : 0;
  const trend = prevCount > 0 ? Math.round(((latestCount - prevCount) / prevCount) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${accentColor} flex items-center justify-center`}>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'weekly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Summary stats row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${accentHex}10` }}>
            <div className="text-xl font-bold" style={{ color: accentHex }}>
              {latestCount}
            </div>
            <div className="text-[11px]" style={{ color: accentHex }}>
              Latest {viewMode === 'weekly' ? 'Week' : 'Month'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{avgCount}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Avg per {viewMode === 'weekly' ? 'Week' : 'Month'}
            </div>
          </div>
          <div
            className={`rounded-xl p-3 text-center ${
              trend >= 0 ? 'bg-green-50 dark:bg-green-500/10' : 'bg-red-50 dark:bg-red-500/10'
            }`}
          >
            <div
              className={`text-xl font-bold ${
                trend >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend >= 0 ? '+' : ''}
              {trend}%
            </div>
            <div
              className={`text-[11px] ${
                trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              }`}
            >
              vs Previous
            </div>
          </div>
        </div>

        {/* Grouped bar chart by pipeline */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {pipelineNames.map((name, i) => (
                  <linearGradient key={name} id={`gradPipe${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={PIPELINE_COLORS[i % PIPELINE_COLORS.length]}
                      stopOpacity={0.85}
                    />
                    <stop
                      offset="95%"
                      stopColor={PIPELINE_COLORS[i % PIPELINE_COLORS.length]}
                      stopOpacity={0.5}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                interval={
                  viewMode === 'weekly' && chartData.length > 12
                    ? Math.floor(chartData.length / 8)
                    : 0
                }
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
                labelFormatter={(label) => `${viewMode === 'weekly' ? 'Week of' : ''} ${label}`}
              />
              {pipelineNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  fill={`url(#gradPipe${i})`}
                  radius={[4, 4, 0, 0]}
                  name={name}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-70 text-sm text-gray-400">
            No date data available
          </div>
        )}

        {/* Pipeline legend / breakdown */}
        {pipelineTotals.length > 1 && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              By Pipeline (2026)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pipelineTotals.map((pt) => {
                const maxTotal = pipelineTotals[0].count || 1;
                return (
                  <div
                    key={pt.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pt.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {pt.name}
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(pt.count / maxTotal) * 100}%`,
                            backgroundColor: pt.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                      {pt.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Won Deals by Pipeline (monthly)
// ---------------------------------------------------------------------------

export function WonDealsChart({
  pipelinesData,
  lastStageIds,
  title = 'Won Deals',
  subtitle = 'Deals closed-won by pipeline per month',
  accentColor = 'bg-green-500',
  accentHex = '#10B981',
}: {
  pipelinesData: PipelineWithDeals[];
  lastStageIds: Set<number>;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  accentHex?: string;
}) {
  const pipelineNames = useMemo(() => pipelinesData.map((p) => p.pipeline.name), [pipelinesData]);

  // Current month end-point for the chart (outside useMemo to avoid impure Date call)
  const [currentMonthStr] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()).padStart(2, '0')}`;
  });

  const chartData = useMemo(() => {
    const startOf2026 = new Date(2026, 0, 1);

    // Collect won deals with their date
    type WonEntry = { date: Date; pipelineName: string };
    const entries: WonEntry[] = [];
    for (const pd of pipelinesData) {
      for (const deal of pd.deals) {
        if (!isDealWon(deal, lastStageIds)) continue;
        const raw = deal.won_time || deal.add_time;
        if (!raw) continue;
        try {
          const d = parseISO(raw);
          if (d >= startOf2026) entries.push({ date: d, pipelineName: pd.pipeline.name });
        } catch {
          /* skip */
        }
      }
    }

    // Always show Jan 2026 through current month, even if no won deals
    const [yr, mo] = currentMonthStr.split('-').map(Number);
    const currentMonth = new Date(yr, mo, 1);

    type BucketRow = { label: string; total: number; [pipeline: string]: string | number };
    const bucketOrder: string[] = [];
    const buckets = new Map<string, BucketRow>();

    const months = eachMonthOfInterval({ start: startOf2026, end: currentMonth });
    for (const ms of months) {
      const key = format(ms, 'yyyy-MM');
      bucketOrder.push(key);
      const row: BucketRow = { label: format(ms, 'MMM yyyy'), total: 0 };
      for (const name of pipelineNames) row[name] = 0;
      buckets.set(key, row);
    }

    for (const entry of entries) {
      const key = format(startOfMonth(entry.date), 'yyyy-MM');
      const row = buckets.get(key);
      if (row) {
        (row[entry.pipelineName] as number)++;
        row.total++;
      }
    }

    return bucketOrder.map((k) => buckets.get(k)!);
  }, [pipelinesData, pipelineNames, lastStageIds, currentMonthStr]);

  const pipelineTotals = useMemo(() => {
    const startOf2026 = new Date(2026, 0, 1);
    return pipelinesData
      .map((pd, i) => {
        const count = pd.deals.filter((d) => {
          if (!isDealWon(d, lastStageIds)) return false;
          const raw = d.won_time || d.add_time;
          if (!raw) return false;
          try {
            return parseISO(raw) >= startOf2026;
          } catch {
            return false;
          }
        }).length;
        return {
          name: pd.pipeline.name,
          count,
          color: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [pipelinesData, lastStageIds]);

  if (pipelinesData.length === 0) return null;

  const totalWon = chartData.reduce((s, d) => s + d.total, 0);
  const avgCount = chartData.length > 0 ? Math.round(totalWon / chartData.length) : 0;
  const latestCount = chartData.length > 0 ? chartData[chartData.length - 1].total : 0;
  const prevCount = chartData.length > 1 ? chartData[chartData.length - 2].total : 0;
  const trend = prevCount > 0 ? Math.round(((latestCount - prevCount) / prevCount) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${accentColor} flex items-center justify-center`}>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{totalWon} total</div>
      </div>

      <div className="p-5">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${accentHex}10` }}>
            <div className="text-xl font-bold" style={{ color: accentHex }}>
              {latestCount}
            </div>
            <div className="text-[11px]" style={{ color: accentHex }}>
              Latest Month
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{avgCount}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Avg per Month</div>
          </div>
          <div
            className={`rounded-xl p-3 text-center ${
              trend >= 0 ? 'bg-green-50 dark:bg-green-500/10' : 'bg-red-50 dark:bg-red-500/10'
            }`}
          >
            <div
              className={`text-xl font-bold ${
                trend >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend >= 0 ? '+' : ''}
              {trend}%
            </div>
            <div
              className={`text-[11px] ${
                trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              }`}
            >
              vs Previous
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {pipelineNames.map((name, i) => (
                  <linearGradient key={name} id={`gradWon${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={PIPELINE_COLORS[i % PIPELINE_COLORS.length]}
                      stopOpacity={0.85}
                    />
                    <stop
                      offset="95%"
                      stopColor={PIPELINE_COLORS[i % PIPELINE_COLORS.length]}
                      stopOpacity={0.5}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
              />
              {pipelineNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  fill={`url(#gradWon${i})`}
                  radius={[4, 4, 0, 0]}
                  name={name}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-70 text-sm text-gray-400">
            No won deals data available
          </div>
        )}

        {/* Pipeline breakdown */}
        {pipelineTotals.length > 1 && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Won by Pipeline (2026)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pipelineTotals.map((pt) => {
                const maxTotal = pipelineTotals[0].count || 1;
                return (
                  <div
                    key={pt.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pt.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {pt.name}
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(pt.count / maxTotal) * 100}%`,
                            backgroundColor: pt.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                      {pt.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search + filter bar
// ---------------------------------------------------------------------------

export function SearchFilterBar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  placeholder = 'Search deals by title, person, or organization...',
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
      <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

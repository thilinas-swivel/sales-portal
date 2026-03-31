'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  TrendingUp,
  TrendingDown,
  XCircle,
  Clock,
  DollarSign,
  LayoutList,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CalendarPlus,
  Layers,
  BarChart3,
  ChevronDown,
  Building2,
  Users,
  Loader2,
  Tag,
} from 'lucide-react';
import type {
  CallerLeadsResponse,
  CallerLeadsSummary,
  PipelineSummary,
} from '@/app/api/caller/leads/route';
import type {
  PipelineAnalytics,
  DistributionItem,
} from '@/app/api/caller/pipelines/[id]/analytics/route';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

// ─── KPI card styles ─────────────────────────────────────────────────────────

const KPI_STYLES = {
  open: {
    icon: Clock,
    iconBg: 'bg-blue-100 dark:bg-blue-950/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-gray-900 dark:text-white',
  },
  value: {
    icon: DollarSign,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    valueColor: 'text-indigo-600 dark:text-indigo-400',
  },
  won: {
    icon: TrendingUp,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
  },
  lost: {
    icon: XCircle,
    iconBg: 'bg-red-100 dark:bg-red-950/60',
    iconColor: 'text-red-500 dark:text-red-400',
    valueColor: 'text-gray-700 dark:text-gray-300',
  },
  winRate: {
    icon: TrendingDown,
    iconBg: 'bg-amber-100 dark:bg-amber-950/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-amber-600 dark:text-amber-400',
  },
  total: {
    icon: LayoutList,
    iconBg: 'bg-blue-100 dark:bg-blue-950/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-gray-900 dark:text-white',
  },
  newThisWeek: {
    icon: CalendarPlus,
    iconBg: 'bg-teal-100 dark:bg-teal-950/60',
    iconColor: 'text-teal-600 dark:text-teal-400',
    valueColor: 'text-teal-600 dark:text-teal-400',
  },
  stages: {
    icon: Layers,
    iconBg: 'bg-violet-100 dark:bg-violet-950/60',
    iconColor: 'text-violet-600 dark:text-violet-400',
    valueColor: 'text-violet-600 dark:text-violet-400',
  },
} as const;

function KpiCard({
  label,
  value,
  style,
}: {
  label: string;
  value: string | number;
  style: (typeof KPI_STYLES)[keyof typeof KPI_STYLES];
}) {
  const Icon = style.icon;
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600 transition-all">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <p className={`text-xl font-bold ${style.valueColor} truncate`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Distribution bar ────────────────────────────────────────────────────────

function DistributionBar({ items, colorClass }: { items: DistributionItem[]; colorClass: string }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span
            className="text-xs text-gray-600 dark:text-gray-400 w-28 truncate text-right shrink-0"
            title={item.label}
          >
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass} transition-all`}
              style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right shrink-0">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Analytics section ───────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  deal: 'Deal Field',
  organization: 'Organisation',
  person: 'Contact',
};
const SOURCE_ICON: Record<string, typeof Tag> = {
  deal: Tag,
  organization: Building2,
  person: Users,
};

function AnalyticsPanel({ pipelineId }: { pipelineId: number }) {
  const [data, setData] = useState<PipelineAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/caller/pipelines/${pipelineId}/analytics`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setData(json.data as PipelineAnalytics);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pipelineId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading analytics…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-500">{error ?? 'No data'}</span>
      </div>
    );
  }

  const hasValueData = data.valueBuckets.length > 0;
  const hasOrgData = data.topOrganisations.length > 0;
  const hasFieldData = data.fieldDistributions.length > 0;

  if (!hasValueData && !hasOrgData && !hasFieldData) {
    return (
      <div className="py-6 text-center">
        <BarChart3 className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No analytics data available yet</p>
      </div>
    );
  }

  const FIELD_COLORS = [
    'bg-violet-500 dark:bg-violet-600',
    'bg-rose-500 dark:bg-rose-600',
    'bg-cyan-500 dark:bg-cyan-600',
    'bg-amber-500 dark:bg-amber-600',
    'bg-lime-500 dark:bg-lime-600',
    'bg-fuchsia-500 dark:bg-fuchsia-600',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Deal Value Distribution */}
      {hasValueData && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Deal Value Distribution
            </h4>
          </div>
          <DistributionBar
            items={data.valueBuckets}
            colorClass="bg-indigo-500 dark:bg-indigo-600"
          />
        </div>
      )}

      {/* Top Organisations */}
      {hasOrgData && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Top Organisations
            </h4>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              by deal count
            </span>
          </div>
          <DistributionBar
            items={data.topOrganisations}
            colorClass="bg-emerald-500 dark:bg-emerald-600"
          />
        </div>
      )}

      {/* Dynamic Custom Field Distributions */}
      {data.fieldDistributions.map((dist, idx) => {
        const SrcIcon = SOURCE_ICON[dist.source] ?? Tag;
        const colorIdx = idx % FIELD_COLORS.length;
        return (
          <div
            key={`${dist.source}-${dist.fieldName}`}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <SrcIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {dist.fieldName}
              </h4>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {SOURCE_LABEL[dist.source] ?? dist.source}
              </span>
            </div>
            <DistributionBar items={dist.items} colorClass={FIELD_COLORS[colorIdx]} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Pipeline card ───────────────────────────────────────────────────────────

function PipelineCard({ pipeline, index }: { pipeline: PipelineSummary; index: number }) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const sales = pipeline.wonDeals + pipeline.lostDeals > 0;
  const winRate = sales
    ? Math.round((pipeline.wonDeals / (pipeline.wonDeals + pipeline.lostDeals)) * 100)
    : null;
  const totalDeals = pipeline.openDeals + pipeline.wonDeals + pipeline.lostDeals;

  return (
    <div className="space-y-3">
      {/* Pipeline header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {index + 1}. {pipeline.pipeline_name}
          </h3>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {totalDeals} deals
          </span>
        </div>
        <Link
          href={`/caller/submissions?pipeline=${pipeline.pipeline_id}`}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          View Leads <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* KPI cards grid — dynamic based on pipeline type */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sales ? (
          <>
            <KpiCard label="Open" value={pipeline.openDeals} style={KPI_STYLES.open} />
            <KpiCard
              label="Value"
              value={formatCurrency(pipeline.totalOpenValue, pipeline.currency)}
              style={KPI_STYLES.value}
            />
            <KpiCard label="Won" value={pipeline.wonDeals} style={KPI_STYLES.won} />
            <KpiCard
              label={winRate !== null ? 'Win Rate' : 'Lost'}
              value={winRate !== null ? `${winRate}%` : pipeline.lostDeals}
              style={winRate !== null ? KPI_STYLES.winRate : KPI_STYLES.lost}
            />
          </>
        ) : (
          <>
            <KpiCard label="Total" value={totalDeals} style={KPI_STYLES.total} />
            <KpiCard
              label="Value"
              value={formatCurrency(pipeline.totalOpenValue, pipeline.currency)}
              style={KPI_STYLES.value}
            />
            <KpiCard
              label="New (7d)"
              value={pipeline.recentlyAdded}
              style={KPI_STYLES.newThisWeek}
            />
            <KpiCard label="Stages" value={pipeline.totalStages} style={KPI_STYLES.stages} />
          </>
        )}
      </div>

      {/* Stage pills */}
      {pipeline.stages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {pipeline.stages.map((s) => (
            <Link
              key={s.stage_id}
              href={`/caller/submissions?pipeline=${pipeline.pipeline_id}&stage=${s.stage_id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors shrink-0 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <LayoutList className="w-3 h-3" />
              {s.stage_name}
              <span className="bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {s.count}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Analytics toggle */}
      <button
        onClick={() => setShowAnalytics((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-1"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${showAnalytics ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Analytics panel (lazy) */}
      {showAnalytics && <AnalyticsPanel pipelineId={pipeline.pipeline_id} />}
    </div>
  );
}

// ─── Skeletons ───────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2 px-1 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800" />
            <div className="h-4 w-40 rounded bg-gray-100 dark:bg-slate-800" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-12 rounded bg-gray-100 dark:bg-slate-800" />
                    <div className="h-6 w-16 rounded bg-gray-100 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-7 w-24 shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PipelinesPage() {
  const [summary, setSummary] = useState<CallerLeadsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/caller/leads?status=all_not_deleted&limit=1');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load pipelines');
      const data = json.data as CallerLeadsResponse;
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const noPipelines = !loading && summary && summary.pipelineSummaries.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Pipelines</h1>
            {!loading && summary && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {summary.pipelineSummaries.length} pipeline
                {summary.pipelineSummaries.length !== 1 ? 's' : ''} · {summary.openDeals} open ·{' '}
                {summary.wonDeals} won · {summary.lostDeals} lost
              </p>
            )}
          </div>
          {!loading && summary && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(summary.totalOpenValue, summary.currency)}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">
                Total Value
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Loading */}
        {loading && <PageSkeleton />}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
            <button
              onClick={fetchData}
              className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* No pipelines */}
        {noPipelines && (
          <div className="flex-1 flex items-center justify-center px-4 py-20 text-center">
            <div>
              <GitBranch className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                No Pipelines Assigned
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Contact your admin to gain pipeline access.
              </p>
            </div>
          </div>
        )}

        {/* Pipeline list */}
        {!loading && !error && summary && summary.pipelineSummaries.length > 0 && (
          <div className="space-y-8">
            {summary.pipelineSummaries.map((p, i) => (
              <PipelineCard key={p.pipeline_id} pipeline={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

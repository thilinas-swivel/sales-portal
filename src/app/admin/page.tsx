'use client';

import { useMemo } from 'react';
import { Flame, Target, DollarSign, CheckCircle, ArrowRight, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import {
  usePipelineData,
  isDealWon,
  formatCurrency,
  timeAgo,
  InflowChart,
  WonDealsChart,
} from './_components/pipeline-shared';
import type { PipedriveDeal } from '@/types/pipedrive';

// ── helpers ─────────────────────────────────────────────────────────
function compactValue(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function SummaryCard({
  href,
  icon: Icon,
  iconGradient,
  label,
  stats,
}: {
  href: string;
  icon: React.ElementType;
  iconGradient: string;
  label: string;
  stats: { label: string; value: string | number; accent?: string }[];
}) {
  return (
    <Link
      href={href}
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-linear-to-br ${iconGradient} flex items-center justify-center`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{label}</h3>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5">
            <div className={`text-lg font-bold ${s.accent ?? 'text-gray-900 dark:text-white'}`}>
              {s.value}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}

function RecentDealRow({
  deal,
  category,
  stageMap,
}: {
  deal: PipedriveDeal;
  category: 'warmed' | 'top_of_funnel';
  stageMap: Map<number, string>;
}) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              category === 'warmed' ? 'bg-orange-500' : 'bg-indigo-500'
            }`}
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-60">
              {deal.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {deal.org_name || deal.person_name || '—'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {stageMap.get(deal.stage_id) ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-right">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(deal.value || 0)}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-right">
        <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(deal.add_time)}</span>
      </td>
    </tr>
  );
}

// ── main ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { pipelineDeals, isLoading, stageMap, globalLastStageIds } = usePipelineData();

  const warmed = useMemo(
    () => pipelineDeals.filter((p) => p.category === 'warmed'),
    [pipelineDeals],
  );
  const topOfFunnel = useMemo(
    () => pipelineDeals.filter((p) => p.category === 'top_of_funnel'),
    [pipelineDeals],
  );

  const dealStats = useMemo(() => {
    const all = warmed.flatMap((p) => p.deals);
    const value = all.reduce((s, d) => s + (d.value || 0), 0);
    const won = all.filter((d) => isDealWon(d, globalLastStageIds)).length;
    const open = all.filter(
      (d) => d.status === 'open' && !globalLastStageIds.has(d.stage_id),
    ).length;
    const winRate = all.length > 0 ? Math.round((won / all.length) * 100) : 0;
    return { total: all.length, won, open, value, winRate };
  }, [warmed, globalLastStageIds]);

  const prospectStats = useMemo(() => {
    const all = topOfFunnel.flatMap((p) => p.deals);
    const value = all.reduce((s, d) => s + (d.value || 0), 0);
    const open = all.filter((d) => d.status === 'open').length;
    return { total: all.length, open, value, pipelines: topOfFunnel.length };
  }, [topOfFunnel]);

  const recentDeals = useMemo(() => {
    type TaggedDeal = { deal: PipedriveDeal; category: 'warmed' | 'top_of_funnel' };
    const tagged: TaggedDeal[] = [
      ...warmed.flatMap((p) => p.deals.map((d) => ({ deal: d, category: 'warmed' as const }))),
      ...topOfFunnel.flatMap((p) =>
        p.deals.map((d) => ({ deal: d, category: 'top_of_funnel' as const })),
      ),
    ];
    tagged.sort(
      (a, b) => new Date(b.deal.add_time).getTime() - new Date(a.deal.add_time).getTime(),
    );
    return tagged.slice(0, 8);
  }, [warmed, topOfFunnel]);

  const totalValue = dealStats.value + prospectStats.value;
  const totalOpen = dealStats.open + prospectStats.open;
  const totalDealsAndProspects = dealStats.total + prospectStats.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Summary</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your deals and prospect pipelines
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Top KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              style={{ borderLeft: '3px solid #F97316' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Active Deals
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {dealStats.open}
              </div>
              <div className="text-xs text-gray-400">{dealStats.total} total</div>
            </div>
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              style={{ borderLeft: '3px solid #6366F1' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Active Prospects
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {prospectStats.open}
              </div>
              <div className="text-xs text-gray-400">{prospectStats.total} total</div>
            </div>
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              style={{ borderLeft: '3px solid #10B981' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Pipeline Value
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {compactValue(totalValue)}
              </div>
              <div className="text-xs text-gray-400">{totalDealsAndProspects} items</div>
            </div>
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              style={{ borderLeft: '3px solid #3B82F6' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Win Rate
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {dealStats.winRate}%
              </div>
              <div className="text-xs text-gray-400">{dealStats.won} won</div>
            </div>
            <div
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 col-span-2 lg:col-span-1"
              style={{ borderLeft: '3px solid #8B5CF6' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Total Open
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalOpen}</div>
              <div className="text-xs text-gray-400">across all pipelines</div>
            </div>
          </div>

          {/* Deals + Prospects Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SummaryCard
              href="/admin/deals"
              icon={Flame}
              iconGradient="from-orange-500 to-red-500"
              label="Deals"
              stats={[
                { label: 'Open Deals', value: dealStats.open },
                {
                  label: 'Won Deals',
                  value: dealStats.won,
                  accent: 'text-green-600 dark:text-green-400',
                },
                { label: 'Win Rate', value: `${dealStats.winRate}%` },
                { label: 'Total Value', value: compactValue(dealStats.value) },
              ]}
            />
            <SummaryCard
              href="/admin/prospects"
              icon={Target}
              iconGradient="from-indigo-500 to-purple-600"
              label="Prospects"
              stats={[
                { label: 'Open Prospects', value: prospectStats.open },
                { label: 'Total Prospects', value: prospectStats.total },
                { label: 'Pipelines', value: prospectStats.pipelines },
                { label: 'Total Value', value: compactValue(prospectStats.value) },
              ]}
            />
          </div>

          {/* Combined Inflow Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {warmed.length > 0 && (
              <InflowChart
                pipelinesData={warmed}
                title="Deal Inflow"
                subtitle="New deals added over time"
                accentColor="bg-orange-500"
                accentHex="#F97316"
              />
            )}
            {topOfFunnel.length > 0 && (
              <InflowChart
                pipelinesData={topOfFunnel}
                title="Prospect Inflow"
                subtitle="New prospects added over time"
                accentColor="bg-indigo-500"
                accentHex="#6366F1"
              />
            )}
          </div>

          {/* Won Deals Chart */}
          {warmed.length > 0 && (
            <WonDealsChart pipelinesData={warmed} lastStageIds={globalLastStageIds} />
          )}

          {/* Recent Activity Table */}
          {recentDeals.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between p-5 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Recent Activity
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Latest deals and prospects across all pipelines
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> Deals
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" /> Prospects
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-gray-100 dark:border-gray-800">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Deal
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                        Stage
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                        Value
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {recentDeals.map((rd) => (
                      <RecentDealRow
                        key={rd.deal.id}
                        deal={rd.deal}
                        category={rd.category}
                        stageMap={stageMap}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <Link
                  href="/admin/deals"
                  className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium"
                >
                  View All Deals →
                </Link>
                <Link
                  href="/admin/prospects"
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                >
                  View All Prospects →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

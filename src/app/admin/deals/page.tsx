'use client';

import { useState, useMemo } from 'react';
import { Flame, DollarSign, CheckCircle, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import {
  usePipelineData,
  filterPipelines,
  isDealWon,
  StatCard,
  InflowChart,
  WonDealsChart,
  CategoryStageSummary,
  StageConversionTrend,
  ContactDistribution,
  ClientInsights,
  PipelineSection,
  DealDetailModal,
  SearchFilterBar,
} from '../_components/pipeline-shared';
import type { PipedriveDeal } from '@/types/pipedrive';

export default function DealsPage() {
  const {
    pipelineDeals,
    isLoading,
    error,
    stageMap,
    globalLastStageIds,
    allPipelines,
    handleRefresh,
  } = usePipelineData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState<PipedriveDeal | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter to warmed pipelines only
  const warmedPipelines = useMemo(
    () => pipelineDeals.filter((p) => p.category === 'warmed'),
    [pipelineDeals],
  );

  // Compute stats
  const stats = useMemo(() => {
    const allDeals = warmedPipelines.flatMap((p) => p.deals);
    const totalValue = allDeals.reduce((s, d) => s + (d.value || 0), 0);
    const wonCount = allDeals.filter((d) => isDealWon(d, globalLastStageIds)).length;
    const openCount = allDeals.filter(
      (d) => d.status === 'open' && !globalLastStageIds.has(d.stage_id),
    ).length;
    return { total: allDeals.length, wonCount, openCount, totalValue };
  }, [warmedPipelines, globalLastStageIds]);

  // Apply search + status filters
  const filteredPipelines = useMemo(
    () => filterPipelines(warmedPipelines, searchQuery, statusFilter, globalLastStageIds),
    [warmedPipelines, searchQuery, statusFilter, globalLastStageIds],
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await handleRefresh();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            Deals Pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Active warmed deals across your sales pipelines
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Total Deals" value={stats.total} color="bg-orange-500" />
        <StatCard
          icon={CheckCircle}
          label="Won"
          value={stats.wonCount}
          color="bg-green-500"
          sub={
            stats.total > 0
              ? `${Math.round((stats.wonCount / stats.total) * 100)}% win rate`
              : undefined
          }
        />
        <StatCard icon={BarChart3} label="Open" value={stats.openCount} color="bg-blue-500" />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`$${stats.totalValue >= 1_000_000 ? `${(stats.totalValue / 1_000_000).toFixed(1)}M` : stats.totalValue >= 1_000 ? `${(stats.totalValue / 1_000).toFixed(0)}K` : stats.totalValue}`}
          color="bg-emerald-500"
        />
      </div>

      {/* Analytics */}
      {warmedPipelines.length > 0 && (
        <div className="space-y-6">
          <CategoryStageSummary
            label="Warmed Stage Overview"
            icon={Flame}
            iconColor="bg-orange-500"
            badgeColor="bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
            pipelinesData={warmedPipelines}
            showWon
            lastStageIds={globalLastStageIds}
          />

          <InflowChart
            pipelinesData={warmedPipelines}
            title="Deal Inflow"
            subtitle="New deals added over time"
            accentColor="bg-orange-500"
            accentHex="#F97316"
          />

          <WonDealsChart pipelinesData={warmedPipelines} lastStageIds={globalLastStageIds} />

          <StageConversionTrend
            pipelinesData={warmedPipelines}
            lastStageIds={globalLastStageIds}
            title="Deal Conversion Funnel"
            subtitle="Deal progression across warmed pipeline stages"
          />

          <ContactDistribution pipelinesData={warmedPipelines} />
          <ClientInsights pipelinesData={warmedPipelines} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Search + Filter */}
      <SearchFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        placeholder="Search deals by title, person, or organization..."
      />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && warmedPipelines.length === 0 && (
        <div className="text-center py-16">
          <Flame className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No warmed pipelines configured</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Mark pipelines as warmed on the Pipelines page
          </p>
        </div>
      )}

      {/* Pipeline Sections */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredPipelines.map((pd) => (
            <PipelineSection
              key={pd.pipeline.id}
              pData={pd}
              isTopOfFunnel={false}
              onSelectDeal={setSelectedDeal}
              stageMap={stageMap}
            />
          ))}
        </div>
      )}

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          stageMap={stageMap}
          allPipelines={allPipelines}
        />
      )}
    </div>
  );
}

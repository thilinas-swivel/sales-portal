'use client';

import { useState, useMemo } from 'react';
import { Target, DollarSign, BarChart3, Users, RefreshCw, Loader2, Zap } from 'lucide-react';
import {
  usePipelineData,
  filterPipelines,
  StatCard,
  CategoryStageSummary,
  StageConversionTrend,
  ContactDistribution,
  ClientInsights,
  InflowChart,
  PipelineSection,
  DealDetailModal,
  SearchFilterBar,
} from '../_components/pipeline-shared';
import type { PipedriveDeal } from '@/types/pipedrive';

export default function ProspectsPage() {
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

  // Filter to top-of-funnel pipelines only
  const topOfFunnelPipelines = useMemo(
    () => pipelineDeals.filter((p) => p.category === 'top_of_funnel'),
    [pipelineDeals],
  );

  // Compute stats
  const stats = useMemo(() => {
    const allDeals = topOfFunnelPipelines.flatMap((p) => p.deals);
    const totalValue = allDeals.reduce((s, d) => s + (d.value || 0), 0);
    const openCount = allDeals.filter(
      (d) => d.status === 'open' && !globalLastStageIds.has(d.stage_id),
    ).length;
    return {
      total: allDeals.length,
      openCount,
      totalValue,
      pipelineCount: topOfFunnelPipelines.length,
    };
  }, [topOfFunnelPipelines, globalLastStageIds]);

  // Apply search + status filters
  const filteredPipelines = useMemo(
    () => filterPipelines(topOfFunnelPipelines, searchQuery, statusFilter, globalLastStageIds),
    [topOfFunnelPipelines, searchQuery, statusFilter, globalLastStageIds],
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            Prospects
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Top-of-funnel prospecting pipelines
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

      {/* Apollo integration banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/5 dark:to-purple-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-xl px-5 py-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
            Outbound Sequences Coming Soon
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
            Apollo sequence integration is planned for automated prospecting workflows.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Total Prospects" value={stats.total} color="bg-indigo-500" />
        <StatCard icon={BarChart3} label="Open" value={stats.openCount} color="bg-blue-500" />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`$${stats.totalValue >= 1_000_000 ? `${(stats.totalValue / 1_000_000).toFixed(1)}M` : stats.totalValue >= 1_000 ? `${(stats.totalValue / 1_000).toFixed(0)}K` : stats.totalValue}`}
          color="bg-emerald-500"
        />
        <StatCard
          icon={Users}
          label="Pipelines"
          value={stats.pipelineCount}
          color="bg-purple-500"
        />
      </div>

      {/* Analytics */}
      {topOfFunnelPipelines.length > 0 && (
        <div className="space-y-6">
          <InflowChart
            pipelinesData={topOfFunnelPipelines}
            title="Prospect Inflow"
            subtitle="New prospects added over time"
            accentColor="bg-indigo-500"
            accentHex="#6366F1"
          />

          <CategoryStageSummary
            label="Prospecting Stage Overview"
            icon={Target}
            iconColor="bg-indigo-500"
            badgeColor="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
            pipelinesData={topOfFunnelPipelines}
            showWon={false}
            lastStageIds={globalLastStageIds}
          />

          <StageConversionTrend
            pipelinesData={topOfFunnelPipelines}
            lastStageIds={globalLastStageIds}
            title="Prospect Conversion Funnel"
            subtitle="Prospect progression across top-of-funnel stages"
          />

          <ContactDistribution pipelinesData={topOfFunnelPipelines} />
          <ClientInsights pipelinesData={topOfFunnelPipelines} />
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
        placeholder="Search prospects by title, person, or organization..."
      />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && topOfFunnelPipelines.length === 0 && (
        <div className="text-center py-16">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No prospecting pipelines configured</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Mark pipelines as Top of Funnel on the Pipelines page
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
              isTopOfFunnel
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

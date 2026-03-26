'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Check,
  Loader2,
  RefreshCw,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────

interface Pipeline {
  id: number;
  name: string;
  active: boolean;
  deal_probability: boolean;
  order_nr: number;
}

interface Stage {
  id: number;
  name: string;
  pipeline_id: number;
  order_nr: number;
  deal_probability: number;
  rotten_flag: boolean;
  rotten_days: number | null;
}

interface PipedriveConfig {
  selectedPipelineIds: number[];
  topOfFunnelPipelineIds: number[];
}

// ─── Component ────────────────────────────────────────

export default function PipelineConfigPage() {
  // Pipedrive data
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pipeLoading, setPipeLoading] = useState(true);
  const [pipeError, setPipeError] = useState<string | null>(null);

  // Config state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [topOfFunnelIds, setTopOfFunnelIds] = useState<number[]>([]);
  const [savedTopOfFunnelIds, setSavedTopOfFunnelIds] = useState<number[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  // UI
  const [expandedPipelines, setExpandedPipelines] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasChanges =
    JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...savedIds].sort()) ||
    JSON.stringify([...topOfFunnelIds].sort()) !== JSON.stringify([...savedTopOfFunnelIds].sort());

  // ─── Fetch pipelines from Pipedrive ───────────────

  const fetchPipelines = useCallback(async () => {
    setPipeLoading(true);
    setPipeError(null);
    try {
      const res = await fetch('/api/pipedrive/pipelines');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch pipelines (${res.status})`);
      }
      const json = await res.json();
      const data = json.data as { pipelines: Pipeline[] | null; stages: Stage[] | null };
      setPipelines((data.pipelines ?? []).sort((a, b) => a.order_nr - b.order_nr));
      setStages((data.stages ?? []).sort((a, b) => a.order_nr - b.order_nr));
    } catch (err) {
      setPipeError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPipeLoading(false);
    }
  }, []);

  // ─── Fetch saved config ───────────────────────────

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/pipedrive/config');
      if (res.ok) {
        const json = await res.json();
        const cfg = json.data as PipedriveConfig;
        setSelectedIds(cfg.selectedPipelineIds);
        setSavedIds(cfg.selectedPipelineIds);
        setTopOfFunnelIds(cfg.topOfFunnelPipelineIds ?? []);
        setSavedTopOfFunnelIds(cfg.topOfFunnelPipelineIds ?? []);
      }
    } catch {
      // use defaults
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
    fetchConfig();
  }, [fetchPipelines, fetchConfig]);

  // ─── Save config ──────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/pipedrive/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedPipelineIds: selectedIds,
          topOfFunnelPipelineIds: topOfFunnelIds,
        }),
      });
      if (!res.ok) throw new Error('Failed to save configuration');
      setSavedIds([...selectedIds]);
      setSavedTopOfFunnelIds([...topOfFunnelIds]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Could show a toast here
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle helpers ───────────────────────────────

  const togglePipeline = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    // remove from top-of-funnel if deselected
    if (selectedIds.includes(id)) {
      setTopOfFunnelIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const toggleTopOfFunnel = (id: number) => {
    setTopOfFunnelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleExpand = (id: number) => {
    setExpandedPipelines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(pipelines.map((p) => p.id));
  const deselectAll = () => setSelectedIds([]);

  const stagesFor = (pipelineId: number) => stages.filter((s) => s.pipeline_id === pipelineId);

  // ─── Render ───────────────────────────────────────

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Pipeline Configuration
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
              Select the Pipedrive pipelines to monitor on your dashboard
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={fetchPipelines}
              disabled={pipeLoading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${pipeLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {pipeLoading ? '...' : pipelines.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Pipelines</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">{selectedIds.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Selected for Monitoring</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {pipeLoading ? '...' : stages.filter((s) => selectedIds.includes(s.pipeline_id)).length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Stages Monitored</div>
        </div>
      </div>

      {/* Error Banner */}
      {pipeError && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-800 dark:text-red-300">
              Failed to load pipelines from Pipedrive
            </div>
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">{pipeError}</div>
            <button
              onClick={fetchPipelines}
              className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(pipeLoading || configLoading) && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading pipelines from Pipedrive...
            </span>
          </div>
        </div>
      )}

      {/* Pipeline List */}
      {!pipeLoading && !configLoading && !pipeError && (
        <>
          {/* Bulk Actions */}
          {pipelines.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={selectAll}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-gray-500 dark:text-gray-400 hover:underline font-medium"
              >
                Deselect All
              </button>
              {hasChanges && (
                <span className="ml-auto text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unsaved changes
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {pipelines.map((pipeline) => {
              const isSelected = selectedIds.includes(pipeline.id);
              const isExpanded = expandedPipelines.has(pipeline.id);
              const pipeStages = stagesFor(pipeline.id);

              return (
                <div
                  key={pipeline.id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-300 dark:border-indigo-500/50 shadow-sm'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  {/* Pipeline Header */}
                  <div className="flex items-center gap-4 p-5">
                    {/* Checkbox */}
                    <button
                      onClick={() => togglePipeline(pipeline.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>

                    {/* Pipeline Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {pipeline.name}
                        </h3>
                        {pipeline.active ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTopOfFunnel(pipeline.id);
                            }}
                            className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                              topOfFunnelIds.includes(pipeline.id)
                                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                            title="Toggle Top of Funnel"
                          >
                            {topOfFunnelIds.includes(pipeline.id)
                              ? '★ Top of Funnel'
                              : '☆ Top of Funnel'}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {pipeStages.length} stage{pipeStages.length !== 1 ? 's' : ''}
                        {pipeline.deal_probability && ' · Deal probability enabled'}
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpand(pipeline.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                      title={isExpanded ? 'Collapse stages' : 'Expand stages'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Stages (expanded) */}
                  {isExpanded && pipeStages.length > 0 && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                          Pipeline Stages
                        </div>

                        {/* Stage Flow */}
                        <div className="flex flex-wrap items-center gap-2">
                          {pipeStages.map((stage, idx) => (
                            <div key={stage.id} className="flex items-center gap-2">
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {stage.name}
                                </span>
                                {stage.deal_probability > 0 && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                                    {stage.deal_probability}%
                                  </span>
                                )}
                                {stage.rotten_flag && (
                                  <span
                                    className="text-xs text-amber-500"
                                    title={`Rots after ${stage.rotten_days} days`}
                                  >
                                    ⏰
                                  </span>
                                )}
                              </div>
                              {idx < pipeStages.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Stage Table */}
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                <th className="pb-2 pr-4">#</th>
                                <th className="pb-2 pr-4">Stage Name</th>
                                <th className="pb-2 pr-4">Probability</th>
                                <th className="pb-2 pr-4">Rotting</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {pipeStages.map((stage, idx) => (
                                <tr key={stage.id}>
                                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                                    {stage.name}
                                  </td>
                                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                                    {stage.deal_probability}%
                                  </td>
                                  <td className="py-2 pr-4">
                                    {stage.rotten_flag ? (
                                      <span className="text-amber-600 dark:text-amber-400">
                                        {stage.rotten_days} day{stage.rotten_days !== 1 ? 's' : ''}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-500">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {pipelines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <GitBranch className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                No pipelines found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Make sure your Pipedrive API token and company domain are configured in your
                environment variables, and that you have at least one pipeline set up in Pipedrive.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

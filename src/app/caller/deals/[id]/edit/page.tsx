'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  ChevronDown,
  Tag,
  GitBranch,
  AlertCircle,
  Loader2,
  ArrowRightLeft,
  User,
  Building2,
  DollarSign,
} from 'lucide-react';

// --- types -----------------------------------------------------------------

interface StageOption {
  id: number;
  name: string;
}

interface PipelineOption {
  id: number;
  name: string;
  stages: StageOption[];
}

interface CustomFieldOption {
  id: number;
  label: string;
}

interface CustomFieldDef {
  key: string;
  name: string;
  type: 'enum' | 'set';
  options: CustomFieldOption[];
}

interface DealData {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: 'open' | 'won' | 'lost' | 'deleted';
  pipeline_id: number;
  stage_id: number;
  expected_close_date: string | null;
}

interface PersonData {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface OrgData {
  id: number;
  name: string;
}

interface DealDetail {
  deal: DealData;
  person: PersonData | null;
  org: OrgData | null;
  customFieldValues: Record<string, unknown>;
  pipelines: PipelineOption[];
  customFields: CustomFieldDef[];
}

// --- page ------------------------------------------------------------------

export default function EditDealPage() {
  const router = useRouter();
  const routeParams = useParams();
  const dealId = Number(routeParams.id);

  // Loading state
  const [data, setData] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [status, setStatus] = useState<'open' | 'won' | 'lost'>('open');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Track original pipeline for transfer indicator
  const [originalPipelineId, setOriginalPipelineId] = useState<number | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Load deal data ------------------------------------------------------

  useEffect(() => {
    if (!dealId || isNaN(dealId)) {
      setError('Invalid deal ID');
      setLoading(false);
      return;
    }

    async function loadDeal() {
      try {
        const res = await fetch(`/api/caller/deals/${dealId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load deal');

        const d = json.data as DealDetail;
        setData(d);

        // Populate form
        setTitle(d.deal.title);
        setDealValue(d.deal.value > 0 ? String(d.deal.value) : '');
        setCurrency(d.deal.currency || 'AUD');
        setStatus(d.deal.status === 'deleted' ? 'open' : d.deal.status);
        setExpectedCloseDate(d.deal.expected_close_date ?? '');
        setSelectedPipelineId(d.deal.pipeline_id);
        setSelectedStageId(d.deal.stage_id);
        setOriginalPipelineId(d.deal.pipeline_id);

        // Custom fields
        const cfv: Record<string, string> = {};
        for (const [key, value] of Object.entries(d.customFieldValues)) {
          cfv[key] = String(value ?? '');
        }
        setCustomFieldValues(cfv);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deal');
      } finally {
        setLoading(false);
      }
    }

    loadDeal();
  }, [dealId]);

  // --- Derived data --------------------------------------------------------

  const selectedPipeline = data?.pipelines.find((p) => p.id === selectedPipelineId) ?? null;
  const stages = selectedPipeline?.stages ?? [];
  const isTransfer = originalPipelineId !== null && selectedPipelineId !== originalPipelineId;

  // --- Handlers ------------------------------------------------------------

  const handlePipelineChange = useCallback(
    (pipelineId: number) => {
      setSelectedPipelineId(pipelineId);
      const pipeline = data?.pipelines.find((p) => p.id === pipelineId);
      // Auto-select first stage of new pipeline
      setSelectedStageId(pipeline?.stages[0]?.id ?? null);
    },
    [data],
  );

  const handleCustomFieldChange = useCallback(
    (fieldKey: string, value: string, fieldType: 'enum' | 'set') => {
      if (fieldType === 'set') {
        setCustomFieldValues((prev) => {
          const current = prev[fieldKey] ? prev[fieldKey].split(',').filter(Boolean) : [];
          const idx = current.indexOf(value);
          if (idx >= 0) current.splice(idx, 1);
          else current.push(value);
          return { ...prev, [fieldKey]: current.join(',') };
        });
      } else {
        setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
      }
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPipelineId || !selectedStageId) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: Record<string, unknown> = {
        title,
        pipelineId: selectedPipelineId,
        stageId: selectedStageId,
        status,
      };

      if (expectedCloseDate) {
        payload.expectedCloseDate = expectedCloseDate;
      } else {
        payload.expectedCloseDate = null;
      }

      const numericValue = parseFloat(dealValue);
      if (!isNaN(numericValue) && numericValue >= 0) {
        payload.value = numericValue;
        payload.currency = currency;
      }

      // Custom fields
      const filteredCustomFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(customFieldValues)) {
        filteredCustomFields[key] = value || '';
      }
      if (Object.keys(filteredCustomFields).length > 0) {
        payload.customFields = filteredCustomFields;
      }

      const res = await fetch(`/api/caller/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update deal');

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Success screen ------------------------------------------------------

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Deal Updated!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {title} has been updated
            {isTransfer && (
              <span className="block mt-1 text-indigo-600 dark:text-indigo-400 font-medium">
                Transferred to {selectedPipeline?.name}
              </span>
            )}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => router.push('/caller/submissions')}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Back to My Leads
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Styles --------------------------------------------------------------

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

  // --- Loading / error states ----------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error ?? 'Deal not found'}</p>
          <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-16">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              Edit Deal
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.deal.title}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 sm:px-6 lg:px-8 pt-6 max-w-2xl mx-auto">
        <div className="space-y-5">
          {/* -- Pipeline & Stage (Transfer) Section --------------------- */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-500" /> Pipeline & Stage
              </h3>
              {isTransfer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <ArrowRightLeft className="w-3 h-3" /> Transferring
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Pipeline *
                </label>
                <div className="relative">
                  <select
                    required
                    value={selectedPipelineId ?? ''}
                    onChange={(e) => handlePipelineChange(parseInt(e.target.value, 10))}
                    className={`${inputClass} appearance-none pr-8`}
                  >
                    {data.pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Stage *
                </label>
                <div className="relative">
                  <select
                    required
                    value={selectedStageId ?? ''}
                    onChange={(e) => setSelectedStageId(parseInt(e.target.value, 10))}
                    className={`${inputClass} appearance-none pr-8`}
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {isTransfer && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                <ArrowRightLeft className="w-4 h-4 shrink-0" />
                <span>
                  This deal will be transferred from the current pipeline to{' '}
                  <strong>{selectedPipeline?.name}</strong>.
                </span>
              </div>
            )}
          </div>

          {/* -- Deal Details Section ------------------------------------ */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-500" /> Deal Details
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Deal Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Deal Value
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    placeholder="0"
                    className={`${inputClass} flex-1`}
                  />
                  <div className="relative w-24">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={`${inputClass} appearance-none pr-7`}
                    >
                      <option value="AUD">AUD</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'open' | 'won' | 'lost')}
                    className={`${inputClass} appearance-none pr-8`}
                  >
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* -- Contact & Organisation (read-only info) ----------------- */}
          {(data.person || data.org) && (
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" /> Contact & Organisation
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Contact and organisation are managed through Pipedrive directly.
              </p>
              <div className="space-y-2 bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                {data.person && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {data.person.name}
                    </span>
                    {data.person.email && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({data.person.email})
                      </span>
                    )}
                  </div>
                )}
                {data.org && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {data.org.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -- Custom Fields (dynamic from Pipedrive) ----------------- */}
          {data.customFields.length > 0 && (
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" /> Deal Fields
              </h3>

              <div className="space-y-4">
                {data.customFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      {field.name}
                      {field.type === 'set' && (
                        <span className="text-[10px] text-gray-400 ml-1">(multi-select)</span>
                      )}
                    </label>
                    {field.type === 'enum' ? (
                      <div className="relative">
                        <select
                          value={customFieldValues[field.key] ?? ''}
                          onChange={(e) =>
                            handleCustomFieldChange(field.key, e.target.value, field.type)
                          }
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          <option value="">Select…</option>
                          {field.options.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {field.options.map((opt) => {
                          const selected = (customFieldValues[field.key] ?? '')
                            .split(',')
                            .includes(String(opt.id));
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                handleCustomFieldChange(field.key, String(opt.id), field.type)
                              }
                              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                                selected
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -- Error -------------------------------------------------- */}
          {submitError && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400 flex-1">{submitError}</p>
            </div>
          )}

          {/* -- Submit ------------------------------------------------- */}
          <div className="flex gap-3 pt-2 pb-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPipelineId || !selectedStageId}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
              style={
                isTransfer
                  ? {
                      backgroundColor: '#d97706',
                      boxShadow: '0 10px 15px -3px rgba(245,158,11,0.3)',
                    }
                  : undefined
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : isTransfer ? (
                <>
                  <ArrowRightLeft className="w-4 h-4" /> Transfer & Save
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

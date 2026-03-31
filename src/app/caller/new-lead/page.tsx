'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Building2,
  Save,
  CheckCircle,
  ChevronDown,
  Tag,
  GitBranch,
  AlertCircle,
  Loader2,
  Search,
  Plus,
  Lock,
  X,
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

interface FormMetadata {
  pipelines: PipelineOption[];
  customFields: CustomFieldDef[];
}

interface PersonResult {
  id: number;
  name: string;
  email: string;
  phone: string;
  orgId: number | null;
  orgName: string;
}

interface OrgResult {
  id: number;
  name: string;
}

// --- debounced search hook -------------------------------------------------

function useDebouncedSearch<T>(
  type: 'person' | 'organization',
  term: string,
  enabled: boolean,
  delay = 300,
) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/caller/new-lead/search?type=${type}&term=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (!controller.signal.aborted) {
          setResults(json.data ?? []);
        }
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [type, term, enabled, delay]);

  return { results, loading };
}

// --- page ------------------------------------------------------------------

export default function NewLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Metadata (loaded from API)
  const [meta, setMeta] = useState<FormMetadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  // -- Contact state -------------------------------------------------------
  const [contactMode, setContactMode] = useState<'search' | 'selected' | 'new'>('search');
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  // -- Organisation state --------------------------------------------------
  const [orgMode, setOrgMode] = useState<'search' | 'selected' | 'new' | 'locked'>('search');
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<OrgResult | null>(null);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    contactPerson: '',
    organisation: '',
    email: '',
    phone: '',
    positionTitle: '',
    location: '',
    website: '',
    notes: '',
    dealValue: '',
  });

  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdDealId, setCreatedDealId] = useState<number | null>(null);

  // -- Search hooks --------------------------------------------------------
  const { results: personResults, loading: personSearchLoading } = useDebouncedSearch<PersonResult>(
    'person',
    contactSearchTerm,
    contactMode === 'search',
  );

  const { results: orgResults, loading: orgSearchLoading } = useDebouncedSearch<OrgResult>(
    'organization',
    orgSearchTerm,
    orgMode === 'search',
  );

  // -- Refs for click-outside ----------------------------------------------
  const contactRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) {
        setContactDropdownOpen(false);
      }
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Show dropdown when we have results or loading
  useEffect(() => {
    if (contactMode === 'search' && contactSearchTerm.length >= 2) {
      setContactDropdownOpen(true);
    }
  }, [contactMode, contactSearchTerm, personResults]);

  useEffect(() => {
    if (orgMode === 'search' && orgSearchTerm.length >= 2) {
      setOrgDropdownOpen(true);
    }
  }, [orgMode, orgSearchTerm, orgResults]);

  // -- Load form metadata --------------------------------------------------

  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/caller/new-lead');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load form data');
        const data = json.data as FormMetadata;
        setMeta(data);

        if (data.pipelines.length > 0) {
          const initialPipelineParam = searchParams.get('pipeline');
          const matchPipeline = initialPipelineParam
            ? data.pipelines.find((p) => p.id === parseInt(initialPipelineParam, 10))
            : null;

          const firstPipeline = matchPipeline ?? data.pipelines[0];
          setSelectedPipelineId(firstPipeline.id);
          if (firstPipeline.stages.length > 0) {
            setSelectedStageId(firstPipeline.stages[0].id);
          }
        }
      } catch (err) {
        setMetaError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setMetaLoading(false);
      }
    }
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill from URL params
  useEffect(() => {
    const contact = searchParams.get('contact');
    const org = searchParams.get('org');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    if (contact || org || email || phone) {
      if (contact) {
        setContactMode('new');
        setForm((f) => ({ ...f, contactPerson: contact }));
      }
      if (org) {
        setOrgMode('new');
        setForm((f) => ({ ...f, organisation: org }));
      }
      if (email) setForm((f) => ({ ...f, email }));
      if (phone) setForm((f) => ({ ...f, phone }));
    }
  }, [searchParams]);

  // -- Derived data --------------------------------------------------------

  const selectedPipeline = meta?.pipelines.find((p) => p.id === selectedPipelineId) ?? null;
  const stages = selectedPipeline?.stages ?? [];

  // -- Handlers ------------------------------------------------------------

  const handlePipelineChange = useCallback(
    (pipelineId: number) => {
      setSelectedPipelineId(pipelineId);
      const pipeline = meta?.pipelines.find((p) => p.id === pipelineId);
      setSelectedStageId(pipeline?.stages[0]?.id ?? null);
    },
    [meta],
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

  const handleSelectPerson = useCallback((person: PersonResult) => {
    setSelectedPerson(person);
    setContactMode('selected');
    setContactDropdownOpen(false);
    setContactSearchTerm('');
    setForm((f) => ({
      ...f,
      email: person.email || f.email,
      phone: person.phone || f.phone,
    }));
    // Lock the organisation to person's org
    if (person.orgId) {
      setSelectedOrg({ id: person.orgId, name: person.orgName });
      setOrgMode('locked');
      setOrgSearchTerm('');
    }
  }, []);

  const handleClearPerson = useCallback(() => {
    setSelectedPerson(null);
    setContactMode('search');
    setContactSearchTerm('');
    setForm((f) => ({ ...f, email: '', phone: '' }));
    // Unlock org if it was locked by person selection
    if (orgMode === 'locked') {
      setSelectedOrg(null);
      setOrgMode('search');
      setOrgSearchTerm('');
    }
  }, [orgMode]);

  const handleSelectOrg = useCallback((org: OrgResult) => {
    setSelectedOrg(org);
    setOrgMode('selected');
    setOrgDropdownOpen(false);
    setOrgSearchTerm('');
  }, []);

  const handleClearOrg = useCallback(() => {
    setSelectedOrg(null);
    setOrgMode('search');
    setOrgSearchTerm('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPipelineId || !selectedStageId) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: Record<string, unknown> = {
        pipelineId: selectedPipelineId,
        stageId: selectedStageId,
        notes: form.notes || undefined,
        website: form.website || undefined,
        location: form.location || undefined,
        positionTitle: form.positionTitle || undefined,
      };

      // Contact info
      if (contactMode === 'selected' && selectedPerson) {
        payload.existingPersonId = selectedPerson.id;
        payload.contactPerson = selectedPerson.name;
        payload.email = form.email || selectedPerson.email;
        payload.phone = form.phone || selectedPerson.phone;
      } else {
        payload.contactPerson = form.contactPerson;
        payload.email = form.email;
        payload.phone = form.phone;
      }

      // Org info
      if ((orgMode === 'locked' || orgMode === 'selected') && selectedOrg) {
        payload.existingOrgId = selectedOrg.id;
        payload.organisation = selectedOrg.name;
      } else {
        payload.organisation = form.organisation;
      }

      if (form.dealValue) {
        const numericValue = parseFloat(form.dealValue);
        if (!isNaN(numericValue) && numericValue > 0) {
          payload.dealValue = numericValue;
          payload.currency = 'AUD';
        }
      }

      // Custom fields
      const filteredCustomFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(customFieldValues)) {
        if (value) filteredCustomFields[key] = value;
      }
      if (Object.keys(filteredCustomFields).length > 0) {
        payload.customFields = filteredCustomFields;
      }

      const res = await fetch('/api/caller/new-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create lead');

      setCreatedDealId(json.data.dealId);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = useCallback(() => {
    setSubmitted(false);
    setCreatedDealId(null);
    setForm({
      contactPerson: '',
      organisation: '',
      email: '',
      phone: '',
      positionTitle: '',
      location: '',
      website: '',
      notes: '',
      dealValue: '',
    });
    setCustomFieldValues({});
    setContactMode('search');
    setContactSearchTerm('');
    setSelectedPerson(null);
    setOrgMode('search');
    setOrgSearchTerm('');
    setSelectedOrg(null);
  }, []);

  // -- Success screen ------------------------------------------------------

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Lead Created in Pipedrive!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Deal #{createdDealId} has been created under{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {selectedPipeline?.name}
            </span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            Organisation, contact, and notes have been synced.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/caller/submissions')}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              View My Leads
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Styles --------------------------------------------------------------

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

  // -- Loading / error states ----------------------------------------------

  if (metaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (metaError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{metaError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-indigo-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!meta || meta.pipelines.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <GitBranch className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            No Pipelines Available
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your admin to get pipeline access before creating leads.
          </p>
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
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">New Lead</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Create a deal directly in Pipedrive
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 sm:px-6 lg:px-8 pt-6 max-w-2xl mx-auto">
        <div className="space-y-5">
          {/* -- Pipeline & Stage Section -------------------------------- */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-500" /> Pipeline & Stage
            </h3>

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
                    {meta.pipelines.map((p) => (
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
          </div>

          {/* -- Contact Information Section ----------------------------- */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" /> Contact Information
            </h3>

            {/* -- Contact Person Search / Selected / New --------------- */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Contact Person *
              </label>

              {contactMode === 'selected' && selectedPerson ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30">
                  <User className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedPerson.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {[selectedPerson.email, selectedPerson.phone]
                        .filter(Boolean)
                        .join(' \u00b7 ')}
                      {selectedPerson.orgName && ` \u00b7 ${selectedPerson.orgName}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPerson}
                    className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-indigo-500" />
                  </button>
                </div>
              ) : contactMode === 'new' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                      placeholder="Full name"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setContactMode('search');
                        setForm((f) => ({ ...f, contactPerson: '' }));
                      }}
                      className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                      Search existing
                    </button>
                  </div>
                </div>
              ) : (
                /* search mode */
                <div className="relative" ref={contactRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                      onFocus={() => {
                        if (contactSearchTerm.length >= 2) setContactDropdownOpen(true);
                      }}
                      placeholder="Search existing contacts\u2026"
                      className={`${inputClass} pl-9`}
                    />
                    {personSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>

                  {contactDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                      {personSearchLoading && personResults.length === 0 ? (
                        <div className="px-3 py-4 flex items-center justify-center text-xs text-gray-400">
                          <Loader2 className="w-3 h-3 animate-spin mr-2" /> Searching\u2026
                        </div>
                      ) : personResults.length > 0 ? (
                        <>
                          {personResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPerson(p)}
                              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {p.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {[p.email, p.phone].filter(Boolean).join(' \u00b7 ')}
                                {p.orgName && ` \u00b7 ${p.orgName}`}
                              </p>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setContactMode('new');
                              setContactDropdownOpen(false);
                              setContactSearchTerm('');
                            }}
                            className="w-full text-left px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-indigo-600 dark:text-indigo-400"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Create new contact</span>
                          </button>
                        </>
                      ) : contactSearchTerm.length >= 2 && !personSearchLoading ? (
                        <>
                          <div className="px-3 py-3 text-xs text-gray-400 text-center">
                            No contacts found for &quot;{contactSearchTerm}&quot;
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setContactMode('new');
                              setForm((f) => ({ ...f, contactPerson: contactSearchTerm }));
                              setContactDropdownOpen(false);
                              setContactSearchTerm('');
                            }}
                            className="w-full text-left px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-indigo-600 dark:text-indigo-400 border-t border-gray-100 dark:border-slate-700"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">
                              Create &quot;{contactSearchTerm}&quot; as new contact
                            </span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* -- Email & Phone ---------------------------------------- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Email {contactMode !== 'selected' && '*'}
                </label>
                <input
                  type="email"
                  required={contactMode !== 'selected'}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@company.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+61 400 000 000"
                  className={inputClass}
                />
              </div>
            </div>

            {/* -- Position Title --------------------------------------- */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Position Title
              </label>
              <input
                type="text"
                value={form.positionTitle}
                onChange={(e) => setForm({ ...form, positionTitle: e.target.value })}
                placeholder="e.g. VP of Sales"
                className={inputClass}
              />
            </div>
          </div>

          {/* -- Organisation Section ----------------------------------- */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> Organisation
            </h3>

            {/* -- Organisation Search / Selected / New / Locked -------- */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Organisation Name *
                {orgMode === 'locked' && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                    <Lock className="w-3 h-3" /> Linked to contact
                  </span>
                )}
              </label>

              {orgMode === 'locked' && selectedOrg ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedOrg.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Organisation from selected contact
                    </p>
                  </div>
                </div>
              ) : orgMode === 'selected' && selectedOrg ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30">
                  <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedOrg.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearOrg}
                    className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-indigo-500" />
                  </button>
                </div>
              ) : orgMode === 'new' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={form.organisation}
                    onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                    placeholder="Company name"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOrgMode('search');
                      setForm((f) => ({ ...f, organisation: '' }));
                    }}
                    className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                  >
                    Search existing
                  </button>
                </div>
              ) : (
                /* search mode */
                <div className="relative" ref={orgRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={orgSearchTerm}
                      onChange={(e) => setOrgSearchTerm(e.target.value)}
                      onFocus={() => {
                        if (orgSearchTerm.length >= 2) setOrgDropdownOpen(true);
                      }}
                      placeholder="Search existing organisations\u2026"
                      className={`${inputClass} pl-9`}
                    />
                    {orgSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>

                  {orgDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                      {orgSearchLoading && orgResults.length === 0 ? (
                        <div className="px-3 py-4 flex items-center justify-center text-xs text-gray-400">
                          <Loader2 className="w-3 h-3 animate-spin mr-2" /> Searching\u2026
                        </div>
                      ) : orgResults.length > 0 ? (
                        <>
                          {orgResults.map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => handleSelectOrg(o)}
                              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {o.name}
                              </p>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setOrgMode('new');
                              setOrgDropdownOpen(false);
                              setOrgSearchTerm('');
                            }}
                            className="w-full text-left px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-indigo-600 dark:text-indigo-400"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Create new organisation</span>
                          </button>
                        </>
                      ) : orgSearchTerm.length >= 2 && !orgSearchLoading ? (
                        <>
                          <div className="px-3 py-3 text-xs text-gray-400 text-center">
                            No organisations found for &quot;{orgSearchTerm}&quot;
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setOrgMode('new');
                              setForm((f) => ({ ...f, organisation: orgSearchTerm }));
                              setOrgDropdownOpen(false);
                              setOrgSearchTerm('');
                            }}
                            className="w-full text-left px-3 py-2.5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-indigo-600 dark:text-indigo-400 border-t border-gray-100 dark:border-slate-700"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">
                              Create &quot;{orgSearchTerm}&quot; as new organisation
                            </span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* -- Website & Location & Deal Value ---------------------- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="City, State/Country"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Deal Value (AUD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.dealValue}
                  onChange={(e) => setForm({ ...form, dealValue: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* -- Custom Fields (dynamic from Pipedrive) ----------------- */}
          {meta.customFields.length > 0 && (
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" /> Deal Fields
              </h3>

              <div className="space-y-4">
                {meta.customFields.map((field) => (
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
                          <option value="">Select\u2026</option>
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

          {/* -- Notes Section ------------------------------------------ */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Notes
            </h3>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add any relevant notes about this lead..."
              className={`${inputClass} resize-none`}
            />
          </div>

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
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-500/30 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating\u2026
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Create Lead
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

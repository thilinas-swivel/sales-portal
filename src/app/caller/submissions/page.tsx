'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Building2,
  User,
  X,
  Phone,
  Mail,
  Calendar,
  ChevronDown,
  AlertCircle,
  Loader2,
  RefreshCw,
  GitBranch,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  LayoutList,
  CalendarPlus,
  Layers,
  Pencil,
  Tag,
  FileText,
  Activity,
  CircleCheck,
  Circle,
  Trash2,
} from 'lucide-react';
import type {
  CallerLeadItem,
  CallerLeadsResponse,
  CallerLeadsSummary,
  PipelineSummary,
} from '@/app/api/caller/leads/route';

// ─── helpers ────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

// ─── types ───────────────────────────────────────────────────────────────────

type StatusFilter = 'all_not_deleted' | 'open' | 'won' | 'lost';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all_not_deleted', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

const STATUS_BADGE: Record<string, { label: string; classes: string; icon: typeof CheckCircle2 }> =
  {
    open: {
      label: 'Open',
      icon: Clock,
      classes:
        'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50',
    },
    won: {
      label: 'Won',
      icon: CheckCircle2,
      classes:
        'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
    },
    lost: {
      label: 'Lost',
      icon: XCircle,
      classes:
        'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/50',
    },
  };

// ─── summary section ─────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
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
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-7 w-24 shrink-0 rounded-full bg-gray-100 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

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

/** Determine if pipeline has closable deals (won/lost activity) */
function isSalesPipeline(pipeline: PipelineSummary): boolean {
  return pipeline.wonDeals + pipeline.lostDeals > 0;
}

function PipelineSummarySection({
  pipeline,
  selectedStageId,
  onStageClick,
}: {
  pipeline: PipelineSummary;
  selectedStageId: number | null;
  onStageClick: (stageId: number) => void;
}) {
  const sales = isSalesPipeline(pipeline);
  const winRate = sales
    ? Math.round((pipeline.wonDeals / (pipeline.wonDeals + pipeline.lostDeals)) * 100)
    : null;
  const totalDeals = pipeline.openDeals + pipeline.wonDeals + pipeline.lostDeals;

  return (
    <div className="space-y-3">
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

      {pipeline.stages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {pipeline.stages.map((s) => {
            const active = selectedStageId === s.stage_id;
            return (
              <button
                key={s.stage_id}
                onClick={() => onStageClick(s.stage_id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors shrink-0 ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <LayoutList className="w-3 h-3" />
                {s.stage_name}
                <span
                  className={`${active ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'} px-1.5 py-0.5 rounded-full text-[10px] font-bold`}
                >
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function PipelineDropdown({
  pipelines,
  selected,
  onChange,
}: {
  pipelines: { id: number; name: string }[];
  selected: number | null;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = pipelines.find((p) => p.id === selected);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
        <GitBranch className="w-3.5 h-3.5 text-gray-400" />
        <span className="max-w-[200px] truncate">{current?.name ?? 'Select Pipeline'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 z-20 min-w-[220px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors truncate ${
                selected === p.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Full deal detail types (from /api/caller/deals/[id]) ---
interface DealDetailPerson {
  id: number;
  name: string;
  email: string;
  phone: string;
}
interface DealDetailOrg {
  id: number;
  name: string;
}
interface DealDetailCustomField {
  key: string;
  name: string;
  type: 'enum' | 'set';
  options: { id: number; label: string }[];
}
interface DealDetailHistoryItem {
  object: string;
  timestamp: string;
  data: Record<string, unknown>;
  user_name: string | null;
}
interface DealDetailFull {
  deal: {
    id: number;
    title: string;
    value: number;
    currency: string;
    status: 'open' | 'won' | 'lost' | 'deleted';
    pipeline_id: number;
    stage_id: number;
    expected_close_date: string | null;
    add_time: string | null;
    update_time: string | null;
  };
  person: DealDetailPerson | null;
  org: DealDetailOrg | null;
  customFieldValues: Record<string, unknown>;
  pipelines: { id: number; name: string; stages: { id: number; name: string }[] }[];
  customFields: DealDetailCustomField[];
  history: DealDetailHistoryItem[];
}

function resolveFieldLabel(value: unknown, field: DealDetailCustomField): string | null {
  if (value === null || value === undefined || value === '') return null;
  const ids = String(value).split(',').filter(Boolean);
  const labels = ids
    .map((id) => field.options.find((o) => String(o.id) === id)?.label)
    .filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : null;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderHistoryItem(item: DealDetailHistoryItem): {
  icon: React.ReactNode;
  title: string;
  detail?: string;
  isNote?: boolean;
  noteHtml?: string;
} {
  const d = item.data;

  // Deal change (field updated)
  if (item.object === 'dealChange') {
    const fieldName = (d.field_name as string) ?? (d.field_key as string) ?? 'Field';
    const oldVal = d.old_value as string | null;
    const newVal = d.new_value as string | null;
    const changeText =
      oldVal && newVal
        ? `${oldVal} → ${newVal}`
        : newVal
          ? `Set to ${newVal}`
          : oldVal
            ? `Removed (was ${oldVal})`
            : 'Changed';
    return {
      icon: <RefreshCw className="w-3.5 h-3.5 text-blue-500" />,
      title: `${fieldName}: ${changeText}`,
    };
  }

  // Note
  if (item.object === 'note') {
    const content = (d.content as string) ?? '';
    return {
      icon: <FileText className="w-3.5 h-3.5 text-amber-500" />,
      title: 'Note',
      isNote: true,
      noteHtml: content,
    };
  }

  // Activity
  if (item.object === 'activity') {
    const subject = (d.subject as string) ?? '';
    const type = (d.type as string) ?? '';
    const done = d.done as boolean | undefined;
    return {
      icon: done ? (
        <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-gray-400" />
      ),
      title: subject || 'Activity',
      detail: type ? type.charAt(0).toUpperCase() + type.slice(1) : undefined,
    };
  }

  // Planned activity
  if (item.object === 'plannedActivity') {
    const subject = (d.subject as string) ?? '';
    const type = (d.type as string) ?? '';
    return {
      icon: <Calendar className="w-3.5 h-3.5 text-violet-500" />,
      title: subject || 'Planned activity',
      detail: type ? type.charAt(0).toUpperCase() + type.slice(1) : undefined,
    };
  }

  // Deal created
  if (item.object === 'deal') {
    return {
      icon: <Plus className="w-3.5 h-3.5 text-emerald-500" />,
      title: 'Deal created',
    };
  }

  // Person / org changes
  if (item.object === 'personChange') {
    const fieldName = (d.field_name as string) ?? 'Contact field';
    const newVal = d.new_value as string | null;
    return {
      icon: <User className="w-3.5 h-3.5 text-gray-400" />,
      title: `${fieldName}${newVal ? `: ${newVal}` : ' updated'}`,
    };
  }
  if (item.object === 'organizationChange') {
    const fieldName = (d.field_name as string) ?? 'Org field';
    const newVal = d.new_value as string | null;
    return {
      icon: <Building2 className="w-3.5 h-3.5 text-gray-400" />,
      title: `${fieldName}${newVal ? `: ${newVal}` : ' updated'}`,
    };
  }

  // Follower
  if (item.object === 'follower' || item.object === 'dealFollower') {
    return {
      icon: <User className="w-3.5 h-3.5 text-gray-400" />,
      title: 'Follower changed',
    };
  }

  // Mail message
  if (item.object === 'mailMessage' || item.object === 'mailMessageWithAttachment') {
    const subject = (d.subject as string) ?? 'Email';
    return {
      icon: <Mail className="w-3.5 h-3.5 text-blue-500" />,
      title: subject,
    };
  }

  // File
  if (item.object === 'file') {
    const fileName = (d.file_name as string) ?? (d.name as string) ?? 'File';
    return {
      icon: <FileText className="w-3.5 h-3.5 text-gray-400" />,
      title: `File: ${fileName}`,
    };
  }

  // Generic fallback
  return {
    icon: <Activity className="w-3.5 h-3.5 text-gray-400" />,
    title: item.object.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
  };
}

function DealDetailSheet({
  deal,
  onClose,
  onDeleted,
}: {
  deal: CallerLeadItem;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const badge = STATUS_BADGE[deal.status] ?? STATUS_BADGE.open;
  const BadgeIcon = badge.icon;

  const [fullDetail, setFullDetail] = useState<DealDetailFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/caller/deals/${deal.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setFullDetail(json.data as DealDetailFull);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deal.id]);

  // Resolve stage name from full detail (more accurate than list data)
  const stageName = fullDetail
    ? (fullDetail.pipelines.flatMap((p) => p.stages).find((s) => s.id === fullDetail.deal.stage_id)
        ?.name ?? deal.stage_name)
    : deal.stage_name;

  const pipelineName = fullDetail
    ? (fullDetail.pipelines.find((p) => p.id === fullDetail.deal.pipeline_id)?.name ??
      deal.pipeline_name)
    : deal.pipeline_name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate pr-4">
            {deal.title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status / Stage / Pipeline badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${badge.classes}`}
            >
              <BadgeIcon className="w-3 h-3" />
              {badge.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
              {stageName}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
              <GitBranch className="w-3 h-3" />
              {pipelineName}
            </span>
          </div>

          {/* Deal Value */}
          {deal.value > 0 && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
              <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Deal Value
                </p>
                <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(deal.value, deal.currency)}
                </p>
              </div>
            </div>
          )}

          {/* Contact & Org */}
          <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Contact & Organisation
            </h4>
            {detailLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Loading…</span>
              </div>
            ) : (
              <>
                {(fullDetail?.person || deal.person_name) && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {fullDetail?.person?.name ?? deal.person_name}
                      </span>
                    </div>
                    {fullDetail?.person?.email && (
                      <div className="flex items-center gap-3 pl-7">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a
                          href={`mailto:${fullDetail.person.email}`}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                        >
                          {fullDetail.person.email}
                        </a>
                      </div>
                    )}
                    {fullDetail?.person?.phone && (
                      <div className="flex items-center gap-3 pl-7">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a
                          href={`tel:${fullDetail.person.phone}`}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {fullDetail.person.phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {(fullDetail?.org || deal.org_name) && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {fullDetail?.org?.name ?? deal.org_name}
                    </span>
                  </div>
                )}
                {!fullDetail?.person && !deal.person_name && !fullDetail?.org && !deal.org_name && (
                  <p className="text-xs text-gray-400">No contact or organisation linked</p>
                )}
              </>
            )}
          </div>

          {/* Dates */}
          <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Dates
            </h4>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400">Created</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {formatDate(deal.add_time)}
                </p>
              </div>
            </div>
            {deal.update_time && deal.update_time !== deal.add_time && (
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Last Updated</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {formatDate(deal.update_time)}
                  </p>
                </div>
              </div>
            )}
            {deal.expected_close_date && (
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Expected Close</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {formatDate(deal.expected_close_date)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {!detailLoading && fullDetail && fullDetail.customFields.length > 0 && (
            <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Deal Fields
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {fullDetail.customFields.map((field) => {
                  const label = resolveFieldLabel(fullDetail.customFieldValues[field.key], field);
                  return (
                    <div key={field.key}>
                      <p className="text-[10px] text-gray-400 mb-0.5">{field.name}</p>
                      {label ? (
                        <div className="flex flex-wrap gap-1.5">
                          {label.split(', ').map((l) => (
                            <span
                              key={l}
                              className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Not set</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History (unified timeline) */}
          {!detailLoading && fullDetail && fullDetail.history.length > 0 && (
            <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> History
              </h4>
              <div className="space-y-0 relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200 dark:bg-slate-700" />
                {fullDetail.history.map((item, idx) => {
                  const rendered = renderHistoryItem(item);
                  return (
                    <div key={idx} className="relative flex items-start gap-3 py-2">
                      <div className="relative z-10 mt-0.5 w-4 h-4 flex items-center justify-center bg-gray-50 dark:bg-slate-800 shrink-0">
                        {rendered.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        {rendered.isNote && rendered.noteHtml ? (
                          <>
                            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                              Note
                            </p>
                            <div
                              className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 line-clamp-4"
                              dangerouslySetInnerHTML={{ __html: rendered.noteHtml }}
                            />
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              {rendered.title}
                            </p>
                            {rendered.detail && (
                              <span className="inline-block mt-0.5 text-[10px] font-medium uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                                {rendered.detail}
                              </span>
                            )}
                          </>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatDateTime(item.timestamp)}
                          {item.user_name ? ` · ${item.user_name}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <Link
              href={`/caller/deals/${deal.id}/edit`}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <Pencil className="w-4 h-4" /> Edit Deal
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Are you sure you want to delete this deal?
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">
                This will mark the deal as deleted in Pipedrive. It can be recovered within 30 days.
              </p>
              {deleteError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {deleteError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setDeleting(true);
                    setDeleteError(null);
                    try {
                      const res = await fetch(`/api/caller/deals/${deal.id}`, { method: 'DELETE' });
                      const json = await res.json();
                      if (json.success) {
                        onClose();
                        onDeleted?.();
                      } else {
                        setDeleteError(json.error ?? 'Failed to delete deal');
                      }
                    } catch {
                      setDeleteError('Network error');
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleting ? 'Deleting…' : 'Delete Deal'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onClick }: { deal: CallerLeadItem; onClick: () => void }) {
  const badge = STATUS_BADGE[deal.status] ?? STATUS_BADGE.open;
  const BadgeIcon = badge.icon;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center shrink-0 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
          {initials(deal.title)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {deal.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {deal.org_name && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[120px]">{deal.org_name}</span>
              </span>
            )}
            {deal.person_name && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[100px]">{deal.person_name}</span>
              </span>
            )}
          </div>
          {/* Stage pill — real Pipedrive stage name */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-md font-medium">
              {deal.stage_name}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${badge.classes}`}
          >
            <BadgeIcon className="w-2.5 h-2.5" />
            {badge.label}
          </span>
          {deal.value > 0 && (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {formatCurrency(deal.value, deal.currency)}
            </span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatDate(deal.add_time)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const searchParams = useSearchParams();
  const initialPipeline = searchParams.get('pipeline');
  const initialStage = searchParams.get('stage');

  const [rawSearch, setRawSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all_not_deleted');
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(
    initialPipeline ? parseInt(initialPipeline, 10) : null,
  );
  const [selectedStageId, setSelectedStageId] = useState<number | null>(
    initialStage ? parseInt(initialStage, 10) : null,
  );
  const [pipelineInitialised, setPipelineInitialised] = useState(false);

  const [deals, setDeals] = useState<CallerLeadItem[]>([]);
  const [pipelines, setPipelines] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState<CallerLeadsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextStart, setNextStart] = useState(0);
  const [noPipelines, setNoPipelines] = useState(false);

  const [selectedDeal, setSelectedDeal] = useState<CallerLeadItem | null>(null);

  const search = useDebounce(rawSearch, 350);

  // Always send pipeline_id to the API so summary is scoped to one pipeline
  const effectivePipelineId = selectedPipelineId;

  const buildUrl = useCallback(
    (start: number) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('status', statusFilter);
      if (effectivePipelineId !== null) params.set('pipeline_id', String(effectivePipelineId));
      if (selectedStageId !== null) params.set('stage_id', String(selectedStageId));
      params.set('start', String(start));
      params.set('limit', '50');
      return `/api/caller/leads?${params}`;
    },
    [search, statusFilter, effectivePipelineId, selectedStageId],
  );

  const fetchDeals = useCallback(
    async (replace: boolean) => {
      if (replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const start = replace ? 0 : nextStart;
        const res = await fetch(buildUrl(start));
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load leads');
        const data = json.data as CallerLeadsResponse;
        if (replace) {
          setDeals(data.deals);
          if (data.pipelines.length > 0) {
            setPipelines(data.pipelines);
            // Auto-select first pipeline if none selected yet
            if (!pipelineInitialised && selectedPipelineId === null && data.pipelines.length > 0) {
              setSelectedPipelineId(data.pipelines[0].id);
              setPipelineInitialised(true);
              return; // Will re-fetch with pipeline_id set
            }
          }
          setSummary(data.summary);
        } else {
          setDeals((prev) => [...prev, ...data.deals]);
        }
        setHasMore(data.hasMore);
        setNextStart(data.nextStart);
        setNoPipelines(data.pipelines.length === 0 && data.deals.length === 0);
        if (!pipelineInitialised) setPipelineInitialised(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildUrl],
  );

  useEffect(() => {
    // If we have URL params for stage, auto-set to open filter
    if (initialStage && !pipelineInitialised) {
      setStatusFilter('open');
    }
    fetchDeals(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, selectedPipelineId, selectedStageId]);

  // Toggle stage pill: tap same stage to deselect
  function handleStageClick(stageId: number) {
    setSelectedStageId((prev) => (prev === stageId ? null : stageId));
    // Stage filter only makes sense with open status
    setStatusFilter('open');
  }

  // Get the active pipeline summary for the selected pipeline
  const activePipelineSummary: PipelineSummary | null =
    summary?.pipelineSummaries.find((p) => p.pipeline_id === selectedPipelineId) ??
    summary?.pipelineSummaries[0] ??
    null;

  const _currentPipelineName = pipelines.find((p) => p.id === selectedPipelineId)?.name;

  if (!loading && noPipelines) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 h-16 flex items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Leads</h1>
        </div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Leads</h1>
            {!loading && activePipelineSummary && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isSalesPipeline(activePipelineSummary)
                  ? `${activePipelineSummary.openDeals} open · ${activePipelineSummary.wonDeals} won · ${activePipelineSummary.lostDeals} lost`
                  : `${activePipelineSummary.openDeals + activePipelineSummary.wonDeals + activePipelineSummary.lostDeals} leads · ${activePipelineSummary.stages.length} active stages`}
              </p>
            )}
          </div>
          <Link
            href="/caller/new-lead"
            className="flex items-center gap-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors text-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> New Lead
          </Link>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-4 space-y-3">
        {/* Summary KPI for current pipeline */}
        {loading && !summary ? (
          <SummarySkeleton />
        ) : activePipelineSummary ? (
          <PipelineSummarySection
            pipeline={activePipelineSummary}
            selectedStageId={selectedStageId}
            onStageClick={handleStageClick}
          />
        ) : null}

        {/* Search + pipeline picker */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {rawSearch && (
              <button
                onClick={() => setRawSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <input
              type="text"
              placeholder="Search by title, org, person..."
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {pipelines.length > 1 && (
            <PipelineDropdown
              pipelines={pipelines}
              selected={selectedPipelineId}
              onChange={(id) => {
                setSelectedPipelineId(id ?? pipelines[0]?.id ?? null);
                setSelectedStageId(null);
                setStatusFilter('all_not_deleted');
              }}
            />
          )}
        </div>

        {/* Status tabs + active stage filter indicator */}
        <div className="space-y-2">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            {(activePipelineSummary && !isSalesPipeline(activePipelineSummary)
              ? STATUS_TABS.filter((t) => t.key === 'all_not_deleted' || t.key === 'open')
              : STATUS_TABS
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  if (tab.key !== 'open') setSelectedStageId(null);
                }}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {selectedStageId !== null && activePipelineSummary && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Filtered by stage:</span>
              <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                {activePipelineSummary.stages.find((s) => s.stage_id === selectedStageId)
                  ?.stage_name ?? 'Stage'}
                <button onClick={() => setSelectedStageId(null)} className="hover:text-indigo-800">
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
            <button
              onClick={() => fetchDeals(true)}
              className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/5 rounded bg-gray-100 dark:bg-slate-800" />
                    <div className="h-3 w-2/5 rounded bg-gray-100 dark:bg-slate-800" />
                    <div className="h-5 w-1/3 rounded-md bg-gray-100 dark:bg-slate-800" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="h-4 w-12 rounded-full bg-gray-100 dark:bg-slate-800" />
                    <div className="h-3 w-16 rounded bg-gray-100 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deal list */}
        {!loading && !error && (
          <>
            {deals.length === 0 ? (
              <div className="py-16 text-center">
                <User className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {rawSearch
                    ? 'No deals match your search'
                    : selectedStageId !== null
                      ? 'No deals in this stage'
                      : 'No deals found'}
                </p>
                {(rawSearch || selectedStageId !== null) && (
                  <button
                    onClick={() => {
                      setRawSearch('');
                      setSelectedStageId(null);
                    }}
                    className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onClick={() => setSelectedDeal(deal)} />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="pt-2 pb-4">
                <button
                  onClick={() => fetchDeals(false)}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedDeal && (
        <DealDetailSheet
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onDeleted={() => fetchDeals(true)}
        />
      )}
    </div>
  );
}

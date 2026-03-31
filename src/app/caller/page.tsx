'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Phone,
  Target,
  Award,
  Bell,
  Plus,
  ClipboardList,
  GitBranch,
  AlertCircle,
  Building2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import type { CallerStats } from '@/app/api/caller/stats/route';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PageHeader({
  onRefresh,
  refreshing,
  notifCount,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  notifCount: number;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 h-16">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Statistics</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Live from your pipelines</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/caller/new-lead"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> New Lead
          </Link>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/caller/notifications"
            className="relative w-10 h-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            {notifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

const kpiConfig = [
  {
    key: 'openDeals' as const,
    label: 'Open Deals',
    sub: 'Across your pipelines',
    icon: Target,
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    format: (v: number) => String(v),
  },
  {
    key: 'wonThisMonth' as const,
    label: 'Won This Month',
    sub: 'Current calendar month',
    icon: Award,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    format: (v: number) => String(v),
  },
  {
    key: 'newThisWeek' as const,
    label: 'New This Week',
    sub: 'Added in last 7 days',
    icon: Phone,
    iconBg: 'bg-blue-50 dark:bg-blue-950/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    format: (v: number) => String(v),
  },
  {
    key: 'conversionRate' as const,
    label: 'Win Rate',
    sub: 'Won vs. closed (all time)',
    icon: TrendingUp,
    iconBg: 'bg-amber-50 dark:bg-amber-950/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    format: (v: number) => `${v}%`,
  },
];

export default function CallerHomePage() {
  const [stats, setStats] = useState<CallerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPipelines, setNoPipelines] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = isRefresh ? '/api/caller/stats?refresh=true' : '/api/caller/stats';
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load stats');
      if (json.noPipelines) {
        setNoPipelines(true);
      } else {
        setStats(json.data as CallerStats);
        setNoPipelines(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetch('/api/caller/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.notifications) {
          try {
            const stored = localStorage.getItem('leadflow-read-notif-ids');
            const readIds: Set<string> = stored ? new Set(JSON.parse(stored)) : new Set();
            const unread = d.notifications.filter((n: { id: string }) => !readIds.has(n.id)).length;
            setNotifCount(unread);
          } catch {
            setNotifCount(d.notifications.length);
          }
        }
      })
      .catch(() => {});
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-8">
        <PageHeader onRefresh={() => fetchStats(true)} refreshing={false} notifCount={notifCount} />
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 mb-4" />
                <div className="h-8 w-16 rounded bg-gray-100 dark:bg-slate-800 mb-2" />
                <div className="h-3 w-28 rounded bg-gray-100 dark:bg-slate-800 mb-1" />
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse h-48"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (noPipelines) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
        <PageHeader
          onRefresh={() => fetchStats(true)}
          refreshing={refreshing}
          notifCount={notifCount}
        />
        <div className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
              <GitBranch className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Pipelines Assigned
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You don&apos;t have any Pipedrive pipelines assigned to your account. Contact your
              administrator to get access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
        <PageHeader
          onRefresh={() => fetchStats(true)}
          refreshing={refreshing}
          notifCount={notifCount}
        />
        <div className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-sm text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => fetchStats(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxOpen = Math.max(...(stats?.pipelines.map((p) => p.openCount) ?? []), 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-8">
      <PageHeader
        onRefresh={() => fetchStats(true)}
        refreshing={refreshing}
        notifCount={notifCount}
      />
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiConfig.map(({ key, label, sub, icon: Icon, iconBg, iconColor, format }) => (
            <div
              key={key}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm"
            >
              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-0.5">
                {stats ? format(stats[key] as number) : '---'}
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Pipeline Breakdown
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              {stats?.pipelines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <GitBranch className="w-6 h-6 text-gray-300 dark:text-gray-700 mb-2" />
                  <p className="text-sm text-gray-400">No pipelines found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.pipelines.map((pipeline) => (
                    <div key={pipeline.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mr-2">
                          {pipeline.name}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">
                          {pipeline.openCount}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${(pipeline.openCount / maxOpen) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Total open deal value
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {stats ? formatCurrency(stats.totalOpenValue, stats.currency) : '---'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Recent Deals
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              {stats?.recentDeals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="w-6 h-6 text-gray-300 dark:text-gray-700 mb-2" />
                  <p className="text-sm text-gray-400">No open deals yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.recentDeals.map((deal) => (
                    <div key={deal.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {deal.title}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {deal.org_name ?? deal.person_name ?? 'No org'} &middot;{' '}
                          {timeAgo(deal.update_time)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                        {formatCurrency(deal.value, deal.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/caller/submissions"
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mb-3">
                <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">View Leads</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">See all submissions</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

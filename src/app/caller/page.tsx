'use client';

import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Phone,
  Target,
  Award,
  Zap,
  Calendar,
  Bell,
  Clock,
  PhoneCall,
  FileText,
  Plus,
} from 'lucide-react';

const stats = [
  {
    label: 'Weekly Leads',
    value: '47',
    target: 60,
    icon: Zap,
    trend: '+12%',
    trendUp: true,
    bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    cardBg:
      'bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-white dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-900/40',
    borderColor: 'border-indigo-200/60 dark:border-indigo-800/60',
    progressColor: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
  },
  {
    label: 'Connected Calls',
    value: '34',
    target: 50,
    icon: Phone,
    trend: '+8%',
    trendUp: true,
    bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    cardBg:
      'bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-slate-900/40',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/60',
    progressColor: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  },
  {
    label: 'MQLs',
    value: '18',
    target: 25,
    icon: Target,
    trend: '-3%',
    trendUp: false,
    bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
    cardBg:
      'bg-gradient-to-br from-blue-50 via-blue-50/50 to-white dark:from-blue-950/40 dark:via-blue-950/20 dark:to-slate-900/40',
    borderColor: 'border-blue-200/60 dark:border-blue-800/60',
    progressColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  {
    label: 'SQLs',
    value: '11',
    target: 15,
    icon: Award,
    trend: '+5%',
    trendUp: true,
    bgColor: 'bg-gradient-to-br from-amber-500 to-amber-600',
    cardBg:
      'bg-gradient-to-br from-amber-50 via-amber-50/50 to-white dark:from-amber-950/40 dark:via-amber-950/20 dark:to-slate-900/40',
    borderColor: 'border-amber-200/60 dark:border-amber-800/60',
    progressColor: 'bg-gradient-to-r from-amber-500 to-amber-600',
  },
];

export default function CallerHomePage() {
  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-20">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Statistics
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Your performance overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/caller/new-lead"
              className="hidden sm:flex items-center gap-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors h-11 shadow-lg shadow-indigo-500/30 text-sm"
            >
              <Plus className="w-4 h-4" /> New Lead
            </Link>
            <button className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg h-11 shadow-md text-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">This Week</span>
              <span className="sm:hidden">Week</span>
            </button>
            <Link
              href="/caller/notifications"
              className="relative w-11 h-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center shadow-md"
            >
              <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trendUp ? TrendingUp : TrendingDown;
            const prog = (parseInt(stat.value) / stat.target) * 100;
            return (
              <div
                key={stat.label}
                className={`${stat.cardBg} border ${stat.borderColor} rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] duration-200 relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${stat.bgColor} flex items-center justify-center shadow-md`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div
                      className={`flex items-center gap-0.5 text-xs font-semibold ${stat.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      <TrendIcon className="w-3 h-3" />
                      {stat.trend}
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                      {stat.label}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-2 bg-slate-200/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${stat.progressColor}`}
                        style={{ width: `${Math.min(prog, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {stat.value} of {stat.target} target
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Focus + Quick Insights */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Focus */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Today&apos;s Focus
            </h2>
            <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-amber-300/50 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-3 border border-white/30">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    Priority Action
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 drop-shadow-lg">
                  You need 3 more calls to hit today&apos;s target
                </h3>
                <p className="text-sm text-white/90">
                  You&apos;re making great progress! Stay focused!
                </p>
                <div className="mt-5 bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">Daily Progress</span>
                    <span className="text-xs font-bold text-white">70% Complete</span>
                  </div>
                  <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full shadow-lg"
                      style={{ width: '70%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="lg:flex lg:flex-col">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Quick Insights
            </h2>
            <div className="flex flex-col gap-3 lg:flex-1">
              <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-4 sm:p-5 shadow-lg lg:flex-1">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Strong Week Performance</p>
                    <p className="text-xs text-purple-100">
                      You&apos;re on track to exceed your weekly target.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      MQL Rate
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">38%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      style={{ width: '38%' }}
                    />
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      SQL Rate
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">61%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                      style={{ width: '61%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Activity + Quick Actions */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Last Activity
            </h2>
            <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex flex-col lg:flex-row items-start gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PhoneCall className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      Last call: Emma Davis – CloudBase Pty
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        MQL
                      </span>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        1h ago
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-700">
                  <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-95">
                    <PhoneCall className="w-4 h-4" />
                    Call Again
                  </button>
                  <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-300 dark:border-slate-600 active:scale-95">
                    <FileText className="w-4 h-4" />
                    View Note
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/caller/submissions"
                className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 sm:p-5 text-center hover:shadow-2xl hover:shadow-indigo-500/30 transition-all active:scale-95 shadow-lg"
              >
                <p className="text-sm font-semibold text-white mb-1">View Leads</p>
                <p className="text-xs text-indigo-100">See all submissions</p>
              </Link>
              <Link
                href="/caller/help"
                className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 sm:p-5 text-center hover:shadow-2xl hover:shadow-emerald-500/30 transition-all active:scale-95 shadow-lg"
              >
                <p className="text-sm font-semibold text-white mb-1">Get Help</p>
                <p className="text-xs text-emerald-100">Field hints & tips</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

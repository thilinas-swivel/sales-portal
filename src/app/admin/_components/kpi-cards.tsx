'use client';

import { useMemo } from 'react';
import { Target, Activity, Users, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useDateRange } from '@/contexts';
import { generateKPIMetrics } from '@/lib/data-generator';

const kpiConfig = [
  {
    key: 'totalLeads',
    label: 'Total Leads',
    icon: Target,
    color: 'blue',
    bg: 'from-blue-500/10 to-blue-600/5',
    border: '#3B82F6',
    iconBg: 'bg-blue-100 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'weeklyVolume',
    label: 'Volume',
    icon: Activity,
    color: 'purple',
    bg: 'from-purple-500/10 to-purple-600/5',
    border: '#8B5CF6',
    iconBg: 'bg-purple-100 dark:bg-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'activeLeads',
    label: 'Active Leads',
    icon: Users,
    color: 'amber',
    bg: 'from-amber-500/10 to-amber-600/5',
    border: '#F59E0B',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'syncRate',
    label: 'Sync Success Rate',
    icon: Zap,
    color: 'green',
    bg: 'from-green-500/10 to-green-600/5',
    border: '#10B981',
    iconBg: 'bg-green-100 dark:bg-green-500/20',
    iconColor: 'text-green-600 dark:text-green-400',
  },
] as const;

export default function KPICards() {
  const { dateRange } = useDateRange();
  const metrics = useMemo(() => generateKPIMetrics(dateRange), [dateRange]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {kpiConfig.map((kpi) => {
        const Icon = kpi.icon;
        const data = metrics[kpi.key as keyof typeof metrics];
        const isUp = data.trend.direction === 'up';
        const isDown = data.trend.direction === 'down';

        return (
          <div
            key={kpi.key}
            className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all"
            style={{ borderLeft: `3px solid ${kpi.border}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  isUp
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                    : isDown
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {isUp ? (
                  <TrendingUp className="w-3 h-3" />
                ) : isDown ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
                {data.trend.value}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {kpi.label}
              {'subValue' in data && (
                <span className="text-xs ml-1">{(data as { subValue?: string }).subValue}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

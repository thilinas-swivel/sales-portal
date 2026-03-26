'use client';

import { useMemo } from 'react';
import { useDateRange } from '@/contexts';
import { generateTeamPerformance } from '@/lib/data-generator';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function TeamPerformance() {
  const { dateRange } = useDateRange();
  const team = useMemo(() => generateTeamPerformance(dateRange), [dateRange]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Team Performance</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Top performers this period
        </p>
      </div>
      <div className="space-y-3">
        {team.map((member) => (
          <div
            key={member.name}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {member.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {member.name}
                </span>
                {member.trend === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{member.role}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {member.leadsProcessed} leads
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {member.conversionRate} conv. · {member.revenue}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickStats() {
  const stats = [
    {
      label: 'Avg Response Time',
      value: '2.4 hrs',
      trend: '-12%',
      trendUp: true,
      color: 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400',
    },
    {
      label: 'Lead Quality Score',
      value: '8.4/10',
      trend: '+5%',
      trendUp: true,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
    },
    {
      label: 'Active Opportunities',
      value: '87',
      trend: '+18%',
      trendUp: true,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Quick Stats</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Key performance indicators
        </p>
      </div>
      <div className="space-y-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
          >
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                {stat.value}
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stat.color}`}>
              {stat.trend}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Top Performers</h4>
        <div className="space-y-2">
          {[
            { name: 'Sarah Johnson', leads: 342, rank: 1, medal: '🥇' },
            { name: 'Michael Chen', leads: 298, rank: 2, medal: '🥈' },
            { name: 'Emily Rodriguez', leads: 276, rank: 3, medal: '🥉' },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-base">{p.medal}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{p.name}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{p.leads}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

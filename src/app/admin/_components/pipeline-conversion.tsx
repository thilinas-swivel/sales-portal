'use client';

import { useMemo } from 'react';
import { useDateRange } from '@/contexts';
import { generateFunnelStages } from '@/lib/data-generator';
import { TrendingUp, TrendingDown } from 'lucide-react';

const stageColors = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-emerald-500',
];
const stageTextColors = [
  'text-blue-600 dark:text-blue-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-violet-600 dark:text-violet-400',
  'text-purple-600 dark:text-purple-400',
  'text-fuchsia-600 dark:text-fuchsia-400',
  'text-emerald-600 dark:text-emerald-400',
];
const stageBgColors = [
  'bg-blue-50 dark:bg-blue-500/10',
  'bg-indigo-50 dark:bg-indigo-500/10',
  'bg-violet-50 dark:bg-violet-500/10',
  'bg-purple-50 dark:bg-purple-500/10',
  'bg-fuchsia-50 dark:bg-fuchsia-500/10',
  'bg-emerald-50 dark:bg-emerald-500/10',
];

export default function PipelineConversion() {
  const { dateRange } = useDateRange();
  const stages = useMemo(() => generateFunnelStages(dateRange), [dateRange]);

  const maxCount = Math.max(...stages.map((s) => parseInt(s.count.replace(/,/g, ''))));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pipeline Conversion
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Lead distribution across pipeline stages
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stages.map((stage, i) => {
          const count = parseInt(stage.count.replace(/,/g, ''));
          const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const trendNum = parseInt(stage.trend);
          const isUp = trendNum > 0;

          return (
            <div key={stage.stage} className={`${stageBgColors[i]} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${stageTextColors[i]}`}>{stage.stage}</span>
                <span
                  className={`text-xs font-medium flex items-center gap-0.5 ${isUp ? 'text-green-600' : 'text-red-500'}`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stage.trend}
                </span>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {stage.count}
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${stageColors[i]} rounded-full transition-all`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stage.basePercentage}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

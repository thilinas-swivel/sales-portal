'use client';

import { useMemo } from 'react';
import { useDateRange } from '@/contexts';
import {
  generateLeadTrendsData,
  generatePartnerDistribution,
  generateSourceDistribution,
} from '@/lib/data-generator';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function LeadTrendsChart() {
  const { dateRange } = useDateRange();
  const data = useMemo(() => generateLeadTrendsData(dateRange), [dateRange]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Lead Trends</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Tracking leads, qualified, and conversions over time
        </p>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradQualified" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradConverted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 30]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '13px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="#6366F1"
            fillOpacity={1}
            fill="url(#gradLeads)"
            name="Total Leads"
          />
          <Area
            type="monotone"
            dataKey="qualified"
            stroke="#8B5CF6"
            fillOpacity={1}
            fill="url(#gradQualified)"
            name="Qualified"
          />
          <Area
            type="monotone"
            dataKey="converted"
            stroke="#10B981"
            fillOpacity={1}
            fill="url(#gradConverted)"
            name="Converted"
          />
          <Line
            type="monotone"
            dataKey="conversionRate"
            stroke="#F59E0B"
            yAxisId="right"
            strokeWidth={2}
            dot={false}
            name="Conv. Rate %"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PartnerDistributionChart() {
  const { dateRange } = useDateRange();
  const data = useMemo(() => generatePartnerDistribution(dateRange), [dateRange]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Partner Distribution
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Lead volume by partner</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{ borderRadius: '12px', fontSize: '13px', border: '1px solid #E5E7EB' }}
          />
          <Bar dataKey="leads" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((entry, i) => (
              <rect key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">{data.length} partners</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {data.reduce((sum, d) => sum + d.leads, 0).toLocaleString()} total leads
        </span>
      </div>
    </div>
  );
}

export function SourceDistributionChart() {
  const data = useMemo(() => generateSourceDistribution(), []);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Source Distribution
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Lead sources breakdown</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', fontSize: '13px', border: '1px solid #E5E7EB' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} name="Percentage">
            {data.map((entry, i) => (
              <rect key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(total)}</div>
          <div className="text-xs text-gray-500">Total %</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data.length}</div>
          <div className="text-xs text-gray-500">Sources</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {(total / data.length).toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">Avg/Source</div>
        </div>
      </div>
    </div>
  );
}

// Utility functions to generate dashboard data based on date range

export interface DateRange {
  preset: string;
  startDate: Date | null;
  endDate: Date | null;
}

export function getDaysInRange(dateRange: DateRange): number {
  if (!dateRange.startDate || !dateRange.endDate) return 30;
  const diffTime = Math.abs(dateRange.endDate.getTime() - dateRange.startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function generateKPIMetrics(dateRange: DateRange) {
  const days = getDaysInRange(dateRange);
  const baseMultiplier = days / 30;

  const totalLeads = Math.round(12847 * baseMultiplier);
  const weeklyVolume = Math.round(1234 * (days / 7));
  const activeLeads = Math.round(3456 * Math.min(baseMultiplier, 1.5));
  const syncRate = Math.max(95, Math.min(99.9, 98.7 + (Math.random() - 0.5) * 2));

  const trendVariance = days < 7 ? 20 : days < 30 ? 15 : 10;
  const totalLeadsTrend = (Math.random() * trendVariance - trendVariance / 4).toFixed(1);
  const weeklyVolumeTrend = (Math.random() * trendVariance - trendVariance / 4).toFixed(1);
  const activeLeadsTrend = ((Math.random() * trendVariance) / 2 - trendVariance / 3).toFixed(1);
  const syncRateTrend = (Math.random() * 2 - 0.8).toFixed(1);

  let subValue = '';
  switch (dateRange.preset) {
    case 'Today':
    case 'Yesterday':
      subValue = '/day';
      break;
    case 'Last 7 Days':
      subValue = '/week';
      break;
    case 'Last 14 Days':
      subValue = '/2 weeks';
      break;
    case 'Last 30 Days':
      subValue = '/month';
      break;
    case 'Last 90 Days':
      subValue = '/quarter';
      break;
    case 'Custom':
      subValue = '/period';
      break;
  }

  return {
    totalLeads: {
      value: totalLeads.toLocaleString(),
      trend: {
        value: `${Number(totalLeadsTrend) > 0 ? '+' : ''}${totalLeadsTrend}%`,
        direction:
          Number(totalLeadsTrend) > 0 ? 'up' : Number(totalLeadsTrend) < 0 ? 'down' : 'neutral',
      },
    },
    weeklyVolume: {
      value: weeklyVolume.toLocaleString(),
      subValue,
      trend: {
        value: `${Number(weeklyVolumeTrend) > 0 ? '+' : ''}${weeklyVolumeTrend}%`,
        direction:
          Number(weeklyVolumeTrend) > 0 ? 'up' : Number(weeklyVolumeTrend) < 0 ? 'down' : 'neutral',
      },
    },
    activeLeads: {
      value: activeLeads.toLocaleString(),
      trend: {
        value: `${Number(activeLeadsTrend) > 0 ? '+' : ''}${activeLeadsTrend}%`,
        direction:
          Number(activeLeadsTrend) > 0 ? 'up' : Number(activeLeadsTrend) < 0 ? 'down' : 'neutral',
      },
    },
    syncRate: {
      value: `${syncRate.toFixed(1)}%`,
      trend: {
        value: `${Number(syncRateTrend) > 0 ? '+' : ''}${syncRateTrend}%`,
        direction:
          Number(syncRateTrend) > 0 ? 'up' : Number(syncRateTrend) < 0 ? 'down' : 'neutral',
      },
    },
  };
}

export function generateFunnelStages(dateRange: DateRange) {
  const days = getDaysInRange(dateRange);
  const m = days / 30;
  const stages = [
    { stage: 'New', baseCount: 2847, basePercentage: 22.2 },
    { stage: 'Contacted', baseCount: 2156, basePercentage: 16.8 },
    { stage: 'Qualified', baseCount: 3234, basePercentage: 25.2 },
    { stage: 'Proposal', baseCount: 1876, basePercentage: 14.6 },
    { stage: 'Negotiation', baseCount: 1423, basePercentage: 11.1 },
    { stage: 'Closed Won', baseCount: 1311, basePercentage: 10.2 },
  ];
  return stages.map((s) => {
    const count = Math.round(s.baseCount * m);
    const trendValue = Math.round((Math.random() - 0.3) * 200);
    return {
      ...s,
      count: count.toLocaleString(),
      trend: `${trendValue > 0 ? '+' : ''}${trendValue}`,
    };
  });
}

export function generateLeadTrendsData(dateRange: DateRange) {
  const days = getDaysInRange(dateRange);
  const dataPoints = days <= 7 ? days : days <= 14 ? 14 : days <= 30 ? 15 : days <= 90 ? 15 : 12;
  const data = [];
  const endDate = dateRange.endDate || new Date();
  const startDate = dateRange.startDate || new Date();
  const interval = Math.max(1, Math.floor(days / (dataPoints - 1)));

  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * interval);
    if (date > endDate && i > 0) break;
    const baseValue = 400;
    const trend = i * 5;
    const variance = Math.random() * 100 - 50;
    const leads = Math.max(200, Math.round(baseValue + trend + variance));
    const qualified = Math.round(leads * (0.6 + Math.random() * 0.1));
    const converted = Math.round(leads * (0.15 + Math.random() * 0.1));
    const conversionRate = leads > 0 ? parseFloat(((converted / leads) * 100).toFixed(1)) : 0;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      leads,
      qualified,
      converted,
      conversionRate,
    });
  }
  return data;
}

export function generatePartnerDistribution(dateRange: DateRange) {
  const m = getDaysInRange(dateRange) / 30;
  return [
    { name: 'TechVentures', leads: Math.round(3240 * m), color: '#4F46E5' },
    { name: 'DataFlow Solutions', leads: Math.round(2890 * m), color: '#7C3AED' },
    { name: 'CloudSync Pro', leads: Math.round(2150 * m), color: '#06B6D4' },
    { name: 'Enterprise Hub', leads: Math.round(1980 * m), color: '#10B981' },
    { name: 'Digital Partners', leads: Math.round(1587 * m), color: '#F59E0B' },
    { name: 'Other', leads: Math.round(1000 * m), color: '#6B7280' },
  ];
}

export function generateSourceDistribution() {
  return [
    { name: 'Website', value: 45 + (Math.random() - 0.5) * 5, color: '#4F46E5' },
    { name: 'Referral', value: 30 + (Math.random() - 0.5) * 5, color: '#7C3AED' },
    { name: 'Email', value: 15 + (Math.random() - 0.5) * 5, color: '#06B6D4' },
    { name: 'Social', value: 7 + (Math.random() - 0.5) * 5, color: '#10B981' },
    { name: 'Other', value: 3 + (Math.random() - 0.5) * 5, color: '#6B7280' },
  ];
}

export function generateFunnelBreakdownData(dateRange: DateRange) {
  const m = getDaysInRange(dateRange) / 30;
  const stages = [
    { stage: 'New Leads', baseCount: 2847, basePercentage: 100 },
    { stage: 'Contacted', baseCount: 2156, basePercentage: 75.7 },
    { stage: 'Qualified', baseCount: 1634, basePercentage: 57.4 },
    { stage: 'Proposal Sent', baseCount: 1156, basePercentage: 40.6 },
    { stage: 'Negotiation', baseCount: 745, basePercentage: 26.2 },
    { stage: 'Closed Won', baseCount: 423, basePercentage: 14.9 },
  ];
  const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#C026D3', '#10B981'];
  return stages.map((s, i) => ({
    stage: s.stage,
    count: Math.round(s.baseCount * m),
    percentage: s.basePercentage,
    color: colors[i],
  }));
}

export function generateTeamPerformance(dateRange: DateRange) {
  const m = getDaysInRange(dateRange) / 30;
  const members = [
    {
      avatar: 'JD',
      name: 'John Doe',
      role: 'Senior Sales Rep',
      baseLeads: 156,
      baseConversion: 32,
      baseRevenue: 245000,
      trendDirection: 'up' as const,
    },
    {
      avatar: 'JS',
      name: 'Jane Smith',
      role: 'Sales Representative',
      baseLeads: 143,
      baseConversion: 28,
      baseRevenue: 198000,
      trendDirection: 'up' as const,
    },
    {
      avatar: 'MW',
      name: 'Mike Wilson',
      role: 'Sales Representative',
      baseLeads: 128,
      baseConversion: 25,
      baseRevenue: 176000,
      trendDirection: 'down' as const,
    },
    {
      avatar: 'SP',
      name: 'Sarah Parker',
      role: 'Junior Sales Rep',
      baseLeads: 94,
      baseConversion: 22,
      baseRevenue: 134000,
      trendDirection: 'up' as const,
    },
  ];
  return members.map((member) => ({
    avatar: member.avatar,
    name: member.name,
    role: member.role,
    leadsProcessed: Math.round(member.baseLeads * m),
    conversionRate: `${Math.max(15, Math.min(40, member.baseConversion + (Math.random() - 0.5) * 6)).toFixed(0)}%`,
    revenue: `$${(Math.round(member.baseRevenue * m) / 1000).toFixed(0)}K`,
    trend: member.trendDirection,
  }));
}

export function generateSparklineData(points: number = 12) {
  const data = [];
  for (let i = 0; i < points; i++) {
    data.push({ value: Math.max(0, 50 + i * 2 + (Math.random() * 20 - 10)) });
  }
  return data;
}

export function generateCallerLeaderboardData(dateRange: DateRange) {
  const m = getDaysInRange(dateRange) / 30;
  const callers = [
    { name: 'Sarah Johnson', initials: 'SJ', baseLeads: 342, baseTrend: 15.2, color: '#4F46E5' },
    { name: 'Michael Chen', initials: 'MC', baseLeads: 298, baseTrend: 8.7, color: '#10b981' },
    { name: 'Emily Rodriguez', initials: 'ER', baseLeads: 276, baseTrend: 12.3, color: '#f59e0b' },
    { name: 'James Wilson', initials: 'JW', baseLeads: 245, baseTrend: -3.4, color: '#8b5cf6' },
    { name: 'Lisa Thompson', initials: 'LT', baseLeads: 234, baseTrend: 6.8, color: '#ec4899' },
    { name: 'David Martinez', initials: 'DM', baseLeads: 198, baseTrend: 18.9, color: '#06b6d4' },
    { name: 'Jennifer Lee', initials: 'JL', baseLeads: 187, baseTrend: 4.2, color: '#f97316' },
    { name: 'Robert Taylor', initials: 'RT', baseLeads: 156, baseTrend: -5.1, color: '#84cc16' },
  ];
  return callers.map((c) => ({
    name: c.name,
    initials: c.initials,
    leads: Math.round(c.baseLeads * m),
    trend: c.baseTrend + (Math.random() - 0.5) * 2,
    color: c.color,
  }));
}

export function generatePipelineData(dateRange: DateRange) {
  const m = getDaysInRange(dateRange) / 30;
  const stages = [
    { stage: 'New', baseCount: 234, baseValue: 1200000, avgTime: '2.3 days' },
    { stage: 'Prospecting', baseCount: 189, baseValue: 980000, avgTime: '4.5 days' },
    { stage: 'Qualification', baseCount: 156, baseValue: 820000, avgTime: '6.2 days' },
    { stage: 'Needs Analysis', baseCount: 98, baseValue: 520000, avgTime: '8.7 days' },
    { stage: 'Proposal', baseCount: 54, baseValue: 280000, avgTime: '5.1 days' },
    { stage: 'Negotiation', baseCount: 32, baseValue: 170000, avgTime: '4.8 days' },
    { stage: 'Closed Won', baseCount: 28, baseValue: 450000, avgTime: '1.2 days' },
  ];
  return stages.map((s) => ({
    stage: s.stage,
    count: Math.round(s.baseCount * m),
    value: Math.round(s.baseValue * m),
    avgTime: s.avgTime,
  }));
}

export function generateSyncStatusData(dateRange: DateRange) {
  const m = getDaysInRange(dateRange) / 30;
  return [
    { name: 'Successful', value: Math.round(892 * m), color: '#10b981' },
    { name: 'Failed', value: Math.round(12 * m), color: '#ef4444' },
    { name: 'Pending', value: Math.round(8 * m), color: '#f59e0b' },
  ];
}

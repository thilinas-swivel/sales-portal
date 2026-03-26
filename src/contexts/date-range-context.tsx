'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface DateRange {
  preset: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  getDateRangeLabel: () => string;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'Last 30 Days',
    startDate: thirtyDaysAgo,
    endDate: endOfToday,
  });

  const getDateRangeLabel = () => {
    if (dateRange.preset === 'Custom' && dateRange.startDate) {
      if (dateRange.endDate) {
        return `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
      }
      return dateRange.startDate.toLocaleDateString();
    }
    return dateRange.preset;
  };

  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange, getDateRangeLabel }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (!context) throw new Error('useDateRange must be used within DateRangeProvider');
  return context;
}

'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useDateRange } from '@/contexts';

const presets = [
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 14 Days',
  'Last 30 Days',
  'Last 90 Days',
];

export default function DatePicker() {
  const { dateRange, setDateRange, getDateRangeLabel } = useDateRange();
  const [open, setOpen] = useState(false);

  const handlePresetClick = (preset: string) => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;

    switch (preset) {
      case 'Today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'Yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'Last 7 Days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case 'Last 14 Days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
        break;
      case 'Last 30 Days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        break;
      case 'Last 90 Days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    }

    setDateRange({ preset, startDate: start, endDate: end });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>{getDateRangeLabel()}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-2">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  dateRange.preset === preset
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

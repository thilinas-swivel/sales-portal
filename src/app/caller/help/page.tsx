'use client';

import { useState } from 'react';
import { ArrowLeft, Search, User, Building2, Tag, ChevronRight, Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';

const fieldHints = [
  {
    category: 'Contact Information',
    icon: User,
    color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    fields: [
      {
        name: 'Contact Person',
        tip: 'Enter the full name of the primary contact. Use proper capitalization (e.g., "John Smith").',
        example: 'Sarah Johnson',
      },
      {
        name: 'Position Title',
        tip: "The contact's job title or role. This helps prioritize leads by seniority.",
        example: 'VP of Sales, CTO, Marketing Director',
      },
      {
        name: 'Phone Number',
        tip: 'Include country code. The system auto-formats numbers. Direct lines are preferred over reception.',
        example: '+1 (555) 123-4567',
      },
      {
        name: 'Email',
        tip: "Use the contact's professional email. Avoid generic addresses like info@ or support@.",
        example: 'sarah.johnson@techcorp.com',
      },
    ],
  },
  {
    category: 'Organisation',
    icon: Building2,
    color: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    fields: [
      {
        name: 'Organisation Name',
        tip: 'Use the official company name. Include "Inc", "Ltd", "Pty" if known. Check for existing entries.',
        example: 'TechCorp Solutions Inc',
      },
      {
        name: 'Website',
        tip: 'Company website URL. Helps verify the organisation and gather intelligence.',
        example: 'https://techcorp.com',
      },
      {
        name: 'Location',
        tip: 'City and state/country. Important for territory assignment and timezone awareness.',
        example: 'San Francisco, CA',
      },
    ],
  },
  {
    category: 'Lead Details',
    icon: Tag,
    color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    fields: [
      {
        name: 'Pipeline Stage',
        tip: 'New Lead: First contact. Contacted: Spoke with them. Qualified: Confirmed interest/fit. Proposal: Sent pricing/proposal.',
        example: 'Start with "New Lead" for cold calls',
      },
      {
        name: 'Lead Source',
        tip: 'How this lead was acquired. Helps track which channels perform best.',
        example: 'Phone Call, Referral, LinkedIn',
      },
      {
        name: 'Notes',
        tip: 'Add key details: pain points, budget range, timeline, decision makers, next steps. Be concise but thorough.',
        example:
          'Interested in enterprise plan. Budget approved for Q2. Follow up with demo next Tuesday.',
      },
    ],
  },
];

const tips = [
  "Always ask for the decision-maker's name and direct line",
  'Note the best time to call back in your lead notes',
  'Mention specific pain points to increase conversion rate',
  'Set a follow-up reminder before ending the call',
  'Quality notes lead to better handoffs and higher close rates',
];

export default function CallerHelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0);

  const filtered = search
    ? fieldHints
        .map((cat) => ({
          ...cat,
          fields: cat.fields.filter(
            (f) =>
              f.name.toLowerCase().includes(search.toLowerCase()) ||
              f.tip.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((cat) => cat.fields.length > 0)
    : fieldHints;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center gap-3 h-16 sm:h-20">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Help & Field Hints
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Guidance for lead capture
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 max-w-2xl mx-auto">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search field hints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
          />
        </div>

        {/* Quick Tips */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-2xl p-5 mb-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-white" />
            <h3 className="text-sm font-bold text-white">Pro Tips</h3>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-white/90">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Field Hints */}
        <div className="space-y-3">
          {filtered.map((cat, idx) => (
            <div
              key={cat.category}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedCategory(expandedCategory === idx ? null : idx)}
                className="w-full flex items-center gap-3 px-5 py-4"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <cat.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {cat.category}
                  </p>
                  <p className="text-xs text-slate-500">{cat.fields.length} fields</p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${expandedCategory === idx ? 'rotate-90' : ''}`}
                />
              </button>

              {expandedCategory === idx && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 space-y-4">
                  {cat.fields.map((field) => (
                    <div key={field.name} className="py-2">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                        {field.name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                        {field.tip}
                      </p>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Example:
                        </span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {field.example}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

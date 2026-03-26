'use client';

import { useState } from 'react';
import { Eye, ExternalLink } from 'lucide-react';

const sampleLeads = [
  {
    id: 1,
    name: 'John Smith',
    company: 'TechCorp Inc.',
    email: 'john@techcorp.com',
    source: 'Website',
    status: 'qualified',
    score: 85,
    value: '$45,000',
    lastContact: '2 hrs ago',
  },
  {
    id: 2,
    name: 'Emily Chen',
    company: 'DataFlow Ltd',
    email: 'emily@dataflow.com',
    source: 'Referral',
    status: 'contacted',
    score: 72,
    value: '$32,000',
    lastContact: '5 hrs ago',
  },
  {
    id: 3,
    name: 'Mike Davis',
    company: 'CloudSync',
    email: 'mike@cloudsync.com',
    source: 'Email',
    status: 'new',
    score: 56,
    value: '$28,000',
    lastContact: '1 day ago',
  },
  {
    id: 4,
    name: 'Sarah Wilson',
    company: 'Innovation Labs',
    email: 'sarah@innolabs.com',
    source: 'Social',
    status: 'qualified',
    score: 91,
    value: '$67,000',
    lastContact: '3 hrs ago',
  },
  {
    id: 5,
    name: 'Robert Lee',
    company: 'Enterprise Hub',
    email: 'robert@enterprisehub.com',
    source: 'Website',
    status: 'contacted',
    score: 68,
    value: '$51,000',
    lastContact: '12 hrs ago',
  },
];

const statusColors: Record<string, string> = {
  qualified: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  contacted: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  new: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
};

export default function RecentLeadsTable() {
  const [selectedLead, setSelectedLead] = useState<(typeof sampleLeads)[0] | null>(null);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Latest lead activity</p>
        </div>
        <a
          href="/admin/deals"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          View All <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-100 dark:border-gray-800">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Lead
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                Source
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                Score
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                Value
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                Last Contact
              </th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {sampleLeads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {lead.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{lead.company}</div>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{lead.source}</span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${statusColors[lead.status]}`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${lead.score >= 80 ? 'bg-green-500' : lead.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{lead.score}</span>
                  </div>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {lead.value}
                  </span>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {lead.lastContact}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setSelectedLead(lead)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedLead.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedLead.company}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {selectedLead.email}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Source</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {selectedLead.source}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {selectedLead.score}/100
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Value</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {selectedLead.value}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full capitalize mt-0.5 ${statusColors[selectedLead.status]}`}
                  >
                    {selectedLead.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Last Contact</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {selectedLead.lastContact}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

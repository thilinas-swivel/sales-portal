'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Filter,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  User,
  Plus,
  X,
  Phone,
  Mail,
  Calendar,
  FileText,
} from 'lucide-react';

type SyncStatus = 'synced' | 'pending' | 'failed';
type PipelineStage = 'new' | 'contacted' | 'qualified' | 'proposal';

interface Lead {
  id: string;
  contactPerson: string;
  organisation: string;
  phoneNumber: string;
  email: string;
  pipelineStage: PipelineStage;
  syncStatus: SyncStatus;
  submittedAt: string;
  notes: string;
}

const leads: Lead[] = [
  {
    id: '1',
    contactPerson: 'Sarah Johnson',
    organisation: 'TechCorp Solutions',
    phoneNumber: '+1 (555) 123-4567',
    email: 'sarah@techcorp.com',
    pipelineStage: 'qualified',
    syncStatus: 'synced',
    submittedAt: '2026-01-08T09:30:00',
    notes: 'Interested in enterprise plan. Follow up next week.',
  },
  {
    id: '2',
    contactPerson: 'Michael Chen',
    organisation: 'Global Innovations Inc',
    phoneNumber: '+1 (555) 234-5678',
    email: 'mchen@globalinv.com',
    pipelineStage: 'contacted',
    syncStatus: 'pending',
    submittedAt: '2026-01-08T10:15:00',
    notes: 'Left voicemail. Will try again tomorrow.',
  },
  {
    id: '3',
    contactPerson: 'Emily Rodriguez',
    organisation: 'StartUp Dynamics',
    phoneNumber: '+1 (555) 345-6789',
    email: 'emily@startup.io',
    pipelineStage: 'new',
    syncStatus: 'synced',
    submittedAt: '2026-01-08T11:00:00',
    notes: 'New inbound lead from website.',
  },
  {
    id: '4',
    contactPerson: 'David Kim',
    organisation: 'Enterprise Systems',
    phoneNumber: '+1 (555) 456-7890',
    email: 'dkim@enterprise.com',
    pipelineStage: 'proposal',
    syncStatus: 'failed',
    submittedAt: '2026-01-08T11:45:00',
    notes: 'Proposal sent. Waiting for decision maker sign-off.',
  },
  {
    id: '5',
    contactPerson: 'Jessica Martinez',
    organisation: 'CloudFirst Technologies',
    phoneNumber: '+1 (555) 567-8901',
    email: 'jess@cloudfirst.com',
    pipelineStage: 'contacted',
    syncStatus: 'synced',
    submittedAt: '2026-01-08T13:20:00',
    notes: 'Scheduled demo for next Tuesday.',
  },
  {
    id: '6',
    contactPerson: 'Robert Taylor',
    organisation: 'DataDrive Analytics',
    phoneNumber: '+1 (555) 678-9012',
    email: 'rtaylor@datadrive.com',
    pipelineStage: 'new',
    syncStatus: 'pending',
    submittedAt: '2026-01-08T14:00:00',
    notes: 'Referral from existing client. High priority.',
  },
  {
    id: '7',
    contactPerson: 'Amanda Lee',
    organisation: 'Quantum Soft',
    phoneNumber: '+1 (555) 789-0123',
    email: 'alee@quantum.com',
    pipelineStage: 'qualified',
    syncStatus: 'synced',
    submittedAt: '2026-01-07T16:00:00',
    notes: 'Budget approved. Moving to proposal stage.',
  },
  {
    id: '8',
    contactPerson: 'Tom Brooks',
    organisation: 'Pacific Ventures',
    phoneNumber: '+1 (555) 890-1234',
    email: 'tom@pacific.vc',
    pipelineStage: 'new',
    syncStatus: 'synced',
    submittedAt: '2026-01-07T12:30:00',
    notes: 'Cold call. Expressed interest in basic plan.',
  },
];

const stageConfig: Record<PipelineStage, { label: string; color: string }> = {
  new: {
    label: 'New Lead',
    color:
      'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
  },
  contacted: {
    label: 'Contacted',
    color:
      'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50',
  },
  qualified: {
    label: 'Qualified',
    color:
      'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
  },
  proposal: {
    label: 'Proposal',
    color:
      'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
  },
};

const syncConfig: Record<SyncStatus, { label: string; icon: typeof CheckCircle2; color: string }> =
  {
    synced: {
      label: 'Synced',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    pending: { label: 'Pending', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
    failed: { label: 'Failed', icon: XCircle, color: 'text-red-600 dark:text-red-400' },
  };

export default function SubmissionsPage() {
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState<PipelineStage | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
        l.organisation.toLowerCase().includes(search.toLowerCase());
      const matchesStage = filterStage === 'all' || l.pipelineStage === filterStage;
      return matchesSearch && matchesStage;
    });
  }, [search, filterStage]);

  const stageCount = (stage: PipelineStage) =>
    leads.filter((l) => l.pipelineStage === stage).length;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-20">
          <div>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
              My Leads
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {leads.length} total submissions
            </p>
          </div>
          <Link
            href="/caller/new-lead"
            className="flex items-center gap-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-500/30 text-sm"
          >
            <Plus className="w-4 h-4" /> New Lead
          </Link>
        </div>
      </div>

      {/* Pipeline Stages Summary */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {(Object.entries(stageConfig) as [PipelineStage, typeof stageConfig.new][]).map(
            ([stage, cfg]) => (
              <button
                key={stage}
                onClick={() => setFilterStage(filterStage === stage ? 'all' : stage)}
                className={`rounded-xl p-2 sm:p-3 text-center border transition-all ${
                  filterStage === stage
                    ? `${cfg.color} border-current ring-2 ring-current/20`
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {stageCount(stage)}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {cfg.label}
                </div>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
              showFilters
                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 text-indigo-600'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lead Cards */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 space-y-3">
        {filtered.map((lead) => {
          const stage = stageConfig[lead.pipelineStage];
          const sync = syncConfig[lead.syncStatus];
          const SyncIcon = sync.icon;
          return (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {lead.contactPerson
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {lead.contactPerson}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {lead.organisation}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full border ${stage.color}`}
                  >
                    {stage.label}
                  </span>
                  <div className={`flex items-center gap-1 ${sync.color}`}>
                    <SyncIcon className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{sync.label}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No leads found</p>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Lead Details</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Contact */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                  {selectedLead.contactPerson
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedLead.contactPerson}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedLead.organisation}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${stageConfig[selectedLead.pipelineStage].color}`}
                >
                  {stageConfig[selectedLead.pipelineStage].label}
                </span>
                <span
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 ${syncConfig[selectedLead.syncStatus].color}`}
                >
                  {(() => {
                    const I = syncConfig[selectedLead.syncStatus].icon;
                    return <I className="w-3 h-3" />;
                  })()}
                  {syncConfig[selectedLead.syncStatus].label}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedLead.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedLead.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Submitted {new Date(selectedLead.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Notes
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  {selectedLead.notes}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-medium transition-colors">
                  <Phone className="w-4 h-4" /> Call
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700">
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

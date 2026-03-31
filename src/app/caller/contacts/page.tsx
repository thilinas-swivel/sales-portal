'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Building2,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';
import type {
  CallerContactPerson,
  CallerContactOrg,
  CallerContactsResponse,
} from '@/app/api/caller/contacts/route';

function formatRelativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))}w ago`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
  return `${Math.floor(diff / (86400 * 365))}y ago`;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className ?? ''}`} />
  );
}

export default function ContactsPage() {
  const [tab, setTab] = useState<'people' | 'organisations'>('people');
  const [search, setSearch] = useState('');
  const [persons, setPersons] = useState<CallerContactPerson[]>([]);
  const [orgs, setOrgs] = useState<CallerContactOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<CallerContactPerson | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<CallerContactOrg | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/caller/contacts');
      if (!res.ok) throw new Error(`Failed to load contacts (${res.status})`);
      const json = (await res.json()) as {
        success: boolean;
        data?: CallerContactsResponse;
        error?: string;
      };
      if (!json.success || !json.data) throw new Error(json.error ?? 'Unknown error');
      setPersons(json.data.persons);
      setOrgs(json.data.orgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const q = search.toLowerCase();

  const filteredPeople = useMemo(
    () =>
      persons.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.org_name?.toLowerCase().includes(q) ?? false) ||
          (p.email?.toLowerCase().includes(q) ?? false),
      ),
    [persons, q],
  );

  const filteredOrgs = useMemo(
    () =>
      orgs.filter(
        (o) => o.name.toLowerCase().includes(q) || (o.address?.toLowerCase().includes(q) ?? false),
      ),
    [orgs, q],
  );

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-20">
          <div>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Contacts
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {loading ? 'Loading…' : `${persons.length} people · ${orgs.length} organisations`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex rounded-xl bg-slate-200/60 dark:bg-slate-800 p-1">
          <button
            onClick={() => setTab('people')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'people'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <User className="w-4 h-4" /> People
          </button>
          <button
            onClick={() => setTab('organisations')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'organisations'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Building2 className="w-4 h-4" /> Organisations
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 sm:px-6 lg:px-8 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${tab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
          />
        </div>
      </div>

      {/* People Tab */}
      {tab === 'people' && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 space-y-2">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          {error && !loading && (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}
          {!loading &&
            !error &&
            filteredPeople.map((person) => (
              <button
                key={person.id}
                onClick={() => setSelectedPerson(person)}
                className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {person.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {person.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {[person.job_title, person.org_name].filter(Boolean).join(' · ') ||
                        'No organisation'}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {formatRelativeTime(person.update_time)}
                  </div>
                </div>
              </button>
            ))}
          {!loading && !error && filteredPeople.length === 0 && (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No contacts found</p>
            </div>
          )}
        </div>
      )}

      {/* Organisations Tab */}
      {tab === 'organisations' && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 space-y-2">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          {error && !loading && (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}
          {!loading &&
            !error &&
            filteredOrgs.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {org.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {org.address ?? 'No address'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {org.people_count} contacts
                    </span>
                    <span className="text-xs text-slate-400">
                      {org.open_deals_count} open deals
                    </span>
                  </div>
                </div>
              </button>
            ))}
          {!loading && !error && filteredOrgs.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No organisations found</p>
            </div>
          )}
        </div>
      )}

      {/* Person Detail Modal */}
      {selectedPerson && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Contact Details
              </h3>
              <button
                onClick={() => setSelectedPerson(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                  {selectedPerson.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedPerson.name}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {[selectedPerson.job_title, selectedPerson.org_name]
                      .filter(Boolean)
                      .join(' · ') || 'No organisation'}
                  </p>
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                {selectedPerson.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedPerson.phone}
                    </span>
                  </div>
                )}
                {selectedPerson.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedPerson.email}
                    </span>
                  </div>
                )}
                {selectedPerson.open_deals_count > 0 && (
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedPerson.open_deals_count} open deal
                      {selectedPerson.open_deals_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {selectedPerson.phone ? (
                  <a
                    href={`tel:${selectedPerson.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Phone className="w-4 h-4" /> Call
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-300 dark:bg-slate-700 text-slate-500 py-3 rounded-xl text-sm font-medium cursor-not-allowed"
                  >
                    <Phone className="w-4 h-4" /> Call
                  </button>
                )}
                <Link
                  href={`/caller/new-lead?contact=${encodeURIComponent(selectedPerson.name)}&org=${encodeURIComponent(selectedPerson.org_name ?? '')}&email=${encodeURIComponent(selectedPerson.email ?? '')}&phone=${encodeURIComponent(selectedPerson.phone ?? '')}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
                  onClick={() => setSelectedPerson(null)}
                >
                  <Plus className="w-4 h-4" /> Convert to Lead
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organisation Detail Modal */}
      {selectedOrg && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setSelectedOrg(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Organisation Details
              </h3>
              <button
                onClick={() => setSelectedOrg(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                  {selectedOrg.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedOrg.name}
                  </h4>
                  {selectedOrg.address && (
                    <p className="text-sm text-slate-500">{selectedOrg.address}</p>
                  )}
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                {selectedOrg.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedOrg.address}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedOrg.people_count} contact{selectedOrg.people_count !== 1 ? 's' : ''} ·{' '}
                    {selectedOrg.open_deals_count} open deal
                    {selectedOrg.open_deals_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <Link
                href={`/caller/new-lead?org=${encodeURIComponent(selectedOrg.name)}`}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
                onClick={() => setSelectedOrg(null)}
              >
                <Plus className="w-4 h-4" /> Create Lead for this Organisation
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

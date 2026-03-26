'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Building2, User, Users, Phone, Mail, MapPin, Globe, Plus, X } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  organisation: string;
  role: string;
  phone: string;
  email: string;
  lastContacted: string;
}

interface Organisation {
  id: string;
  name: string;
  industry: string;
  location: string;
  website: string;
  contacts: number;
  leads: number;
}

const people: Person[] = [
  {
    id: 'p1',
    name: 'Sarah Johnson',
    organisation: 'TechCorp Solutions',
    role: 'VP of Sales',
    phone: '+1 (555) 123-4567',
    email: 'sarah@techcorp.com',
    lastContacted: '2 hours ago',
  },
  {
    id: 'p2',
    name: 'Michael Chen',
    organisation: 'Global Innovations',
    role: 'CTO',
    phone: '+1 (555) 234-5678',
    email: 'mchen@globalinv.com',
    lastContacted: '1 day ago',
  },
  {
    id: 'p3',
    name: 'Emily Rodriguez',
    organisation: 'StartUp Dynamics',
    role: 'CEO',
    phone: '+1 (555) 345-6789',
    email: 'emily@startup.io',
    lastContacted: '3 days ago',
  },
  {
    id: 'p4',
    name: 'David Kim',
    organisation: 'Enterprise Systems',
    role: 'Head of IT',
    phone: '+1 (555) 456-7890',
    email: 'dkim@enterprise.com',
    lastContacted: '1 week ago',
  },
  {
    id: 'p5',
    name: 'Jessica Martinez',
    organisation: 'CloudFirst Tech',
    role: 'Director',
    phone: '+1 (555) 567-8901',
    email: 'jess@cloudfirst.com',
    lastContacted: '2 weeks ago',
  },
  {
    id: 'p6',
    name: 'Robert Taylor',
    organisation: 'DataDrive Analytics',
    role: 'Manager',
    phone: '+1 (555) 678-9012',
    email: 'rtaylor@datadrive.com',
    lastContacted: '3 weeks ago',
  },
  {
    id: 'p7',
    name: 'Amanda Lee',
    organisation: 'Quantum Soft',
    role: 'VP Engineering',
    phone: '+1 (555) 789-0123',
    email: 'alee@quantum.com',
    lastContacted: '1 month ago',
  },
  {
    id: 'p8',
    name: 'Tom Brooks',
    organisation: 'Pacific Ventures',
    role: 'Partner',
    phone: '+1 (555) 890-1234',
    email: 'tom@pacific.vc',
    lastContacted: '1 month ago',
  },
];

const organisations: Organisation[] = [
  {
    id: 'o1',
    name: 'TechCorp Solutions',
    industry: 'Technology',
    location: 'San Francisco, CA',
    website: 'techcorp.com',
    contacts: 4,
    leads: 3,
  },
  {
    id: 'o2',
    name: 'Global Innovations Inc',
    industry: 'Consulting',
    location: 'New York, NY',
    website: 'globalinv.com',
    contacts: 3,
    leads: 2,
  },
  {
    id: 'o3',
    name: 'StartUp Dynamics',
    industry: 'SaaS',
    location: 'Austin, TX',
    website: 'startup.io',
    contacts: 2,
    leads: 1,
  },
  {
    id: 'o4',
    name: 'Enterprise Systems',
    industry: 'Enterprise Software',
    location: 'Seattle, WA',
    website: 'enterprise.com',
    contacts: 5,
    leads: 4,
  },
  {
    id: 'o5',
    name: 'CloudFirst Technologies',
    industry: 'Cloud Services',
    location: 'Denver, CO',
    website: 'cloudfirst.com',
    contacts: 2,
    leads: 1,
  },
  {
    id: 'o6',
    name: 'DataDrive Analytics',
    industry: 'Data & Analytics',
    location: 'Chicago, IL',
    website: 'datadrive.com',
    contacts: 3,
    leads: 2,
  },
];

export default function ContactsPage() {
  const [tab, setTab] = useState<'people' | 'organisations'>('people');
  const [search, setSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);

  const filteredPeople = useMemo(
    () =>
      people.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.organisation.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const filteredOrgs = useMemo(
    () =>
      organisations.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.industry.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
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
              {people.length} people · {organisations.length} organisations
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
          {filteredPeople.map((person) => (
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
                    .join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {person.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {person.role} · {person.organisation}
                  </p>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                  {person.lastContacted}
                </div>
              </div>
            </button>
          ))}
          {filteredPeople.length === 0 && (
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
          {filteredOrgs.map((org) => (
            <button
              key={org.id}
              onClick={() => setSelectedOrg(org)}
              className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {org.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {org.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {org.industry} · {org.location}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {org.contacts} contacts
                  </span>
                  <span className="text-xs text-slate-400">{org.leads} leads</span>
                </div>
              </div>
            </button>
          ))}
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
                    .join('')}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedPerson.name}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {selectedPerson.role} · {selectedPerson.organisation}
                  </p>
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedPerson.phone}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedPerson.email}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-medium transition-colors">
                  <Phone className="w-4 h-4" /> Call
                </button>
                <Link
                  href={`/caller/new-lead?contact=${encodeURIComponent(selectedPerson.name)}&org=${encodeURIComponent(selectedPerson.organisation)}&email=${encodeURIComponent(selectedPerson.email)}&phone=${encodeURIComponent(selectedPerson.phone)}`}
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
                  {selectedOrg.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedOrg.name}
                  </h4>
                  <p className="text-sm text-slate-500">{selectedOrg.industry}</p>
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedOrg.location}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedOrg.website}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedOrg.contacts} contacts · {selectedOrg.leads} active leads
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

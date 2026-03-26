'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  User,
  Bell,
  Shield,
  Palette,
  LogOut,
  ChevronRight,
  Camera,
  Moon,
  Sun,
  Monitor,
  Check,
  Save,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function CallerProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || 'Sarah Johnson',
    email: user?.email || 'sarah@leadflow.com',
    phone: '+1 (555) 987-6543',
  });

  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    leadUpdates: true,
    syncAlerts: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const menuItems = [
    { id: 'profile', label: 'Edit Profile', icon: User, desc: 'Update your personal information' },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      desc: 'Manage notification preferences',
    },
    {
      id: 'security',
      label: 'Privacy & Security',
      icon: Shield,
      desc: 'Password and security settings',
    },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme and display settings' },
  ];

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center gap-3 h-16 sm:h-20">
          <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Profile
          </h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {(user?.name || 'SJ')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {user?.name || 'Sarah Johnson'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sales Caller</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {user?.email || 'sarah@leadflow.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-slate-400 transition-transform ${activeSection === item.id ? 'rotate-90' : ''}`}
              />
            </button>
          ))}
        </div>

        {/* Expanded Section */}
        {activeSection === 'profile' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Profile</h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Notification Settings
            </h3>
            {(
              [
                { key: 'push', label: 'Push Notifications' },
                { key: 'email', label: 'Email Notifications' },
                { key: 'leadUpdates', label: 'Lead Status Updates' },
                { key: 'syncAlerts', label: 'Sync Alerts' },
              ] as const
            ).map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                <button
                  onClick={() =>
                    setNotifications({ ...notifications, [item.key]: !notifications[item.key] })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key] ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifications[item.key] ? 'translate-x-5' : ''}`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Theme</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ].map((t) => (
                <button
                  key={t.id}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors"
                >
                  <t.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Help Link */}
        <Link
          href="/caller/help"
          className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-6 hover:shadow-md transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Help & Field Hints</p>
            <p className="text-xs text-slate-500">Get tips for filling out lead forms</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-red-500/20"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

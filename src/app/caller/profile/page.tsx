'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ChevronRight, LogOut, Monitor, Moon, Palette, Sun, User } from 'lucide-react';
import { useTheme, type Theme } from '@/contexts/theme-context';

export default function CallerProfilePage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user;

  const [activeSection, setActiveSection] = useState<string | null>(null);

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const menuItems = [
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme and display settings' },
  ];

  const themeOptions: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center gap-3 h-16 sm:h-20">
          <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Profile
          </h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {user?.name ?? '-'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {(user as { roleLabel?: string })?.roleLabel ?? 'Sales Caller'}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                {user?.email ?? '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
          <button
            onClick={() => setActiveSection(activeSection === 'account' ? null : 'account')}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Account Info</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Managed by your organisation
              </p>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform ${activeSection === 'account' ? 'rotate-90' : ''}`}
            />
          </button>
          {activeSection === 'account' && (
            <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-3">
              {[
                { label: 'Full Name', value: user?.name ?? '-' },
                { label: 'Email', value: user?.email ?? '-' },
                {
                  label: 'Role',
                  value:
                    (user as { roleLabel?: string })?.roleLabel ??
                    (user as { role?: string })?.role ??
                    '-',
                },
                {
                  label: 'Pipelines',
                  value: `${((user as { pipelineIds?: number[] })?.pipelineIds ?? []).length} assigned`,
                },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-0.5">
                    {row.label}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{row.value}</p>
                </div>
              ))}
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
                Profile details are managed through your Microsoft account.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
          {menuItems.map((item, idx) => (
            <div key={item.id}>
              {idx > 0 && <div className="border-t border-slate-100 dark:border-slate-700" />}
              <button
                onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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

              {activeSection === 'appearance' && item.id === 'appearance' && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                    Theme
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((t) => {
                      const active = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                            active
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          <t.icon
                            className={`w-5 h-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                          />
                          <span
                            className={`text-xs font-medium ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}
                          >
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

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

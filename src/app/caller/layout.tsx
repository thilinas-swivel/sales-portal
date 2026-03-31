'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BarChart3, ClipboardList, Plus, Users, User, LogOut, Bell, GitBranch } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

const navItems = [
  { id: 'home', href: '/caller', label: 'Stats', icon: BarChart3 },
  { id: 'submissions', href: '/caller/submissions', label: 'My Leads', icon: ClipboardList },
  { id: 'new-lead', href: '/caller/new-lead', label: 'New Lead', icon: Plus, isCenter: true },
  { id: 'contacts', href: '/caller/contacts', label: 'Contacts', icon: Users },
  { id: 'profile', href: '/caller/profile', label: 'Profile', icon: User },
];

const sidebarNavItems = [
  { id: 'home', href: '/caller', label: 'Stats', icon: BarChart3 },
  { id: 'pipelines', href: '/caller/pipelines', label: 'My Pipelines', icon: GitBranch },
  { id: 'submissions', href: '/caller/submissions', label: 'My Leads', icon: ClipboardList },
  { id: 'contacts', href: '/caller/contacts', label: 'Contacts', icon: Users },
  { id: 'new-lead', href: '/caller/new-lead', label: 'New Lead', icon: Plus },
  { id: 'notifications', href: '/caller/notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', href: '/caller/profile', label: 'Profile', icon: User },
];

export default function CallerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const hasCallerAccess = session?.user?.portals?.includes('caller');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !hasCallerAccess) {
      router.replace('/login?error=AccessDenied');
    }
  }, [status, hasCallerAccess, router]);

  if (status === 'loading') return null;
  if (!session || !hasCallerAccess) return null;

  const user = session.user;

  const isActive = (href: string) => {
    if (href === '/caller') return pathname === '/caller';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sidebar - tablet & desktop */}
      <aside className="hidden sm:flex fixed inset-y-0 left-0 z-40 w-20 lg:w-64 flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 lg:px-6 border-b border-gray-200 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">LF</span>
          </div>
          <span className="hidden lg:block ml-3 text-lg font-bold text-slate-900 dark:text-white">
            LeadFlow
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 lg:px-3 space-y-1 overflow-y-auto">
          {sidebarNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                } ${item.id === 'new-lead' ? 'bg-indigo-600 hover:bg-indigo-700 !text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:!text-white' : ''}`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${item.id === 'new-lead' && !active ? 'text-white' : ''}`}
                />
                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user.name ?? '')
                .split(' ')
                .map((n: string) => n[0])
                .join('')}
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user.name}
              </div>
              <div className="text-xs text-slate-500 truncate">Sales Caller</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="hidden lg:block text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="sm:ml-20 lg:ml-64 pb-20 sm:pb-0">{children}</main>

      {/* Bottom Navigation - mobile only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-lg">
        <div className="h-16 flex items-center justify-between px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            if (item.isCenter) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="relative -mt-6 flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-full bg-indigo-600 shadow-lg shadow-indigo-600/30 flex items-center justify-center">
                    <Plus className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">
                    {item.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 h-14 w-[72px] transition-all ${
                  active
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {active && (
                  <div className="absolute top-0 w-8 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
                <item.icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

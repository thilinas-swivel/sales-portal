'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Flame,
  Target,
  Building2,
  Settings,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  X,
  Users,
  Shield,
} from 'lucide-react';

const CORE_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin', badge: '', permission: null },
  { label: 'Deals', icon: Flame, href: '/admin/deals', badge: '', permission: null },
  { label: 'Prospects', icon: Target, href: '/admin/prospects', badge: '', permission: null },
  { label: 'Pipelines', icon: GitBranch, href: '/admin/pipelines', badge: '', permission: null },
  { label: 'Partners', icon: Building2, href: '/admin/partners', badge: '', permission: null },
  { label: 'Settings', icon: Settings, href: '/admin/settings', badge: '', permission: null },
];

const ADMIN_NAV = [
  { label: 'Users', icon: Users, href: '/admin/users', badge: '', permission: 'users:view' },
  { label: 'Roles', icon: Shield, href: '/admin/roles', badge: '', permission: 'roles:view' },
];

interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function AdminSidebar({ sidebarOpen, setSidebarOpen }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const sessionPerms: string[] = user?.permissions ?? [];

  const visibleAdminNav = ADMIN_NAV.filter(
    (item) => !item.permission || sessionPerms.includes(item.permission),
  );

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 dark:border-gray-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">LeadFlow</span>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto w-8 h-8 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {CORE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}

          {/* Admin section: Users & Roles */}
          {visibleAdminNav.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="px-3 pt-4 pb-1">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                    Admin
                  </span>
                </div>
              )}
              {isCollapsed && (
                <div className="my-2 mx-3 border-t border-gray-100 dark:border-gray-800" />
              )}
              {visibleAdminNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                    />
                    {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* Profile Section */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {(user?.name ?? 'DL')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name || 'Dmitry Loukine'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Super Admin</div>
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    router.push('/admin/settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Account Settings
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-800" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

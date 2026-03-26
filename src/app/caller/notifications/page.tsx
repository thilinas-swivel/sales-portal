'use client';

import { useState } from 'react';
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Lead Synced',
    message: 'Your lead for Sarah Johnson has been synced successfully.',
    time: '5 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'New Assignment',
    message: 'You have been assigned 3 new leads from TechCorp batch.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Sync Failed',
    message: 'Lead sync for David Kim failed. Please retry.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '4',
    type: 'success',
    title: 'Target Reached',
    message: 'Congratulations! You reached your daily call target.',
    time: '5 hours ago',
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: 'Weekly Report',
    message: 'Your weekly performance report is ready to view.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '6',
    type: 'success',
    title: 'Lead Converted',
    message: 'Emily Rodriguez moved to Qualified stage.',
    time: '2 days ago',
    read: true,
  },
];

const typeConfig = {
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 space-y-2 max-w-2xl mx-auto">
        {notifications.map((notif) => {
          const cfg = typeConfig[notif.type];
          const Icon = cfg.icon;
          return (
            <button
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className={`w-full text-left rounded-2xl p-4 border transition-all ${
                notif.read
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  : 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20'
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                >
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {notif.time}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {notifications.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}

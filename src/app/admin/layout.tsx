'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminSidebar from './_components/sidebar';
import AdminHeader from './_components/header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  const hasAdminAccess = session?.user?.portals?.includes('admin');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !hasAdminAccess) {
      router.push('/login?error=AccessDenied');
    }
  }, [status, hasAdminAccess, router]);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  if (status === 'loading') return null;
  if (!session || !hasAdminAccess) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F6FA] dark:bg-gray-800">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader setSidebarOpen={setSidebarOpen} />
        <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-[#F5F6FA] dark:bg-gray-800">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1920px] mx-auto">
            {children}
            <div className="h-8" />
          </div>
        </main>
      </div>
    </div>
  );
}

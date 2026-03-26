'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Zap, Shield, Phone, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { PortalType } from '@/types';

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Check if the user just completed auth with a portal param
  const portalParam = searchParams.get('portal') as PortalType | null;
  const errorParam = searchParams.get('error');

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    AccessDenied:
      'Access denied. Your account is not registered or has been deactivated. Contact your administrator.',
    Configuration: 'There is a problem with the server configuration. Contact your administrator.',
    Verification: 'The verification link has expired or has already been used.',
  };

  // Derive access error from session + portal param (no setState in effect)
  const derivedAccessError = (() => {
    // Error from URL param (e.g., NextAuth signIn rejection, layout redirect)
    if (errorParam && errorMessages[errorParam]) {
      return errorMessages[errorParam];
    }
    if (status !== 'authenticated' || !session?.user || !portalParam) return null;
    const portals = session.user.portals ?? [];
    if (portals.includes(portalParam)) return null;
    return `You don\u2019t have access to the ${portalParam === 'admin' ? 'Admin' : 'Sales'} portal. Contact your administrator.`;
  })();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const portals = session.user.portals ?? [];
    if (portals.length === 0) return;

    // Auto-redirect when user has exactly one portal — no selection needed
    if (portals.length === 1) {
      router.push(portals[0] === 'admin' ? '/admin' : '/caller');
      return;
    }

    // If returning from MS auth with a portal selection the user is allowed into
    if (portalParam && portals.includes(portalParam)) {
      router.push(portalParam === 'admin' ? '/admin' : '/caller');
    }
  }, [status, session, router, portalParam]);

  const handleSignIn = async () => {
    if (!selectedPortal) return;
    setSigningIn(true);
    await signIn('microsoft-entra-id', {
      callbackUrl: `/login?portal=${selectedPortal}`,
    });
  };

  const handlePortalNavigate = (portal: PortalType) => {
    // Already authenticated — go directly
    if (status === 'authenticated' && session?.user) {
      const portals = session.user.portals ?? [];
      if (portals.includes(portal)) {
        router.push(portal === 'admin' ? '/admin' : '/caller');
      } else {
        setAccessError(
          `You don\u2019t have access to the ${portal === 'admin' ? 'Admin' : 'Sales'} portal. Contact your administrator.`,
        );
      }
      return;
    }
    // Not authenticated — select and sign in
    setSelectedPortal(portal);
    setAccessError(null);
  };

  const isAuthenticated = status === 'authenticated';

  return (
    <div className="min-h-screen flex">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-indigo-600 via-indigo-700 to-purple-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight">LeadFlow</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">Sales Operations Portal</h1>
          <p className="text-lg text-indigo-100 leading-relaxed">
            Manage leads, track performance, and optimize your sales pipeline with real-time
            analytics and team dashboards.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">12,847</div>
              <div className="text-sm text-indigo-200">Total Leads</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">98.7%</div>
              <div className="text-sm text-indigo-200">Sync Rate</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">156</div>
              <div className="text-sm text-indigo-200">Active Partners</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">32%</div>
              <div className="text-sm text-indigo-200">Conversion Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">LeadFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isAuthenticated
              ? `Welcome back, ${session?.user?.name?.split(' ')[0] ?? ''}`
              : 'Welcome back'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Select a portal to continue</p>

          {/* Access error */}
          {(accessError || derivedAccessError) && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {accessError || derivedAccessError}
              </p>
            </div>
          )}

          {/* Portal Cards */}
          <div className="space-y-3 mb-8">
            {/* When authenticated: only show portals the user has access to */}
            {isAuthenticated && (session?.user?.portals ?? []).length === 0 ? (
              <div className="flex items-start gap-3 p-5 rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-700 dark:text-red-300">
                    No portal access
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Your account has not been assigned to any portal. Contact your administrator.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Admin Portal — shown to all unauthenticated users, or authenticated users with admin access */}
                {(!isAuthenticated || (session?.user?.portals ?? []).includes('admin')) && (
                  <button
                    onClick={() => handlePortalNavigate('admin')}
                    className={`w-full group flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                      selectedPortal === 'admin'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        Admin Portal
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Dashboard, pipelines, deals, settings
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 transition-colors ${
                        selectedPortal === 'admin'
                          ? 'text-indigo-500'
                          : 'text-gray-400 group-hover:text-indigo-500'
                      }`}
                    />
                  </button>
                )}

                {/* Sales Portal — shown to all unauthenticated users, or authenticated users with caller access */}
                {(!isAuthenticated || (session?.user?.portals ?? []).includes('caller')) && (
                  <button
                    onClick={() => handlePortalNavigate('caller')}
                    className={`w-full group flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                      selectedPortal === 'caller'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                      <Phone className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        Sales Portal
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Leads, contacts, submissions, stats
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 transition-colors ${
                        selectedPortal === 'caller'
                          ? 'text-emerald-500'
                          : 'text-gray-400 group-hover:text-emerald-500'
                      }`}
                    />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Sign in with Microsoft — only shown when not authenticated */}
          {!isAuthenticated && (
            <>
              <button
                onClick={handleSignIn}
                disabled={!selectedPortal || signingIn || status === 'loading'}
                className="w-full py-3.5 px-4 bg-[#2F2F2F] hover:bg-[#1a1a1a] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signingIn || status === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    Sign in with Microsoft
                  </>
                )}
              </button>

              {!selectedPortal && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-3">
                  Select a portal above to sign in
                </p>
              )}

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                Use your corporate Microsoft account to sign in.
                <br />
                Access is managed by your administrator.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

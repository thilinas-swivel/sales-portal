'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Zap, ShieldX } from 'lucide-react';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: 'Access Denied',
    description:
      'Your Microsoft account is not authorized to access this application. Please contact your administrator to request access.',
  },
  Configuration: {
    title: 'Configuration Error',
    description:
      'The authentication system is not configured correctly. Please contact your administrator.',
  },
  Verification: {
    title: 'Verification Failed',
    description: 'Unable to verify your identity. Please try signing in again.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred during sign-in. Please try again.',
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') ?? 'Default';
  const errorInfo = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{errorInfo.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{errorInfo.description}</p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
        >
          <Zap className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-gray-400">Loading...</div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}

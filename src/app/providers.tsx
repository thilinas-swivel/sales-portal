'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider, DateRangeProvider } from '@/contexts';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <DateRangeProvider>{children}</DateRangeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

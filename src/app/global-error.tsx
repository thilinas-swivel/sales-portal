'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <p className="text-muted-foreground">An unexpected error occurred.</p>
          <button
            onClick={reset}
            className="rounded-md bg-foreground px-4 py-2 text-background transition-colors hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

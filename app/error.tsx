'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">Error</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>Something went wrong</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-md border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium text-sm hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors"
          >
            Contact support
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-[var(--text-muted)]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

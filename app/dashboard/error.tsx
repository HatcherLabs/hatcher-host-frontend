'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Hatcher] Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card glass-noise p-10 text-center max-w-md">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Dashboard Error
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Failed to load your dashboard. This might be a temporary issue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[#0891b2] text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-xl font-semibold text-sm transition-colors hover:text-[var(--text-primary)]"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

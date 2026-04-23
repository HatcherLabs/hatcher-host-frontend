'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Hatcher] Settings error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          Settings Error
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          Failed to load your settings. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-[var(--text-muted)] mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[#0891b2] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-[var(--color-accent)]/20"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-xl font-semibold text-sm transition-colors hover:text-[var(--text-primary)] hover:border-[var(--color-accent)]/30"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

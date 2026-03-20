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
        <h2 className="text-xl font-bold text-[#F0EEFC] mb-2">
          Dashboard Error
        </h2>
        <p className="text-sm text-[#A5A1C2] mb-6">
          Failed to load your dashboard. This might be a temporary issue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/[0.06] bg-[#1A1730] text-[#A5A1C2] rounded-xl font-semibold text-sm transition-colors hover:text-[#F0EEFC]"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

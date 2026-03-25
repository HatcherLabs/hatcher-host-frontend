'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Hatcher] Pricing error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-[#F0EEFC] mb-3">
          Pricing Unavailable
        </h1>
        <p className="text-sm text-[#A5A1C2] mb-2">
          We couldn&apos;t load pricing information. Please try again in a moment.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-[#6B6890] mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-[#06b6d4]/20"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/[0.06] bg-[#1A1730] text-[#A5A1C2] rounded-xl font-semibold text-sm transition-colors hover:text-[#F0EEFC] hover:border-[#06b6d4]/30"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

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
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-sm text-[#a1a1aa] mb-8 leading-relaxed">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium px-6 py-2.5 rounded-full text-sm hover:from-purple-500 hover:to-purple-400 transition-all duration-200"
          >
            Try Again
          </button>
          <a
            href="/support"
            className="inline-flex items-center gap-2 border border-white/[0.12] text-[#d4d4d8] font-medium px-6 py-2.5 rounded-full text-sm hover:bg-white/[0.04] hover:border-white/20 transition-all duration-200"
          >
            Contact Support
          </a>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-[#52525b]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-[var(--text-muted)] text-sm">Something went wrong.</p>
      <button
        onClick={reset}
        className="text-sm text-[var(--text-primary)] underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  );
}

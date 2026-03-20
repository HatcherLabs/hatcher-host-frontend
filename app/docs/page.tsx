'use client';
import { useEffect } from 'react';
import { DOCS_URL } from '@/lib/config';

export default function DocsPage() {
  useEffect(() => {
    window.location.href = DOCS_URL;
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl mb-4">📚</div>
        <p className="text-white/60">Redirecting to docs...</p>
      </div>
    </div>
  );
}

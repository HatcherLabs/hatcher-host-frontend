'use client';
import { useEffect } from 'react';

export default function DocsPage() {
  useEffect(() => {
    const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || 'https://docs.hatcher.fun';
    window.location.href = docsUrl;
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

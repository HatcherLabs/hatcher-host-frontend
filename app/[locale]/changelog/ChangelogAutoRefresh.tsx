'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';

/** Silently re-fetches the changelog server component every 30 seconds */
export function ChangelogAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';

export default function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/settings');
  }, [router]);
  return null;
}

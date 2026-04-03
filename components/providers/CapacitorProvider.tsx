'use client';

import { useEffect, useState } from 'react';
import { initCapacitor, isNative } from '@/lib/capacitor';

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    initCapacitor();

    // Network status detection
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <>
      {offline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white text-center text-sm py-1.5 px-4 font-medium safe-area-top">
          You&apos;re offline. Some features may not work.
        </div>
      )}
      {children}
    </>
  );
}

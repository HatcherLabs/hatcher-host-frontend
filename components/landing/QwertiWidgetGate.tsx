'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from '@/i18n/routing';
import {
  QWERTI_WIDGET_SCRIPT_INTEGRITY,
  QWERTI_WIDGET_SCRIPT_SRC,
} from '@/lib/qwerti-widget';

// The Qwerti script is only allowed by CSP on the landing route
// (middleware.ts gates the hash on unprefixedPathname === '/'), but its
// floating trigger lives in document.body and survives client-side
// navigation. This gate loads the script on the landing page only and
// hides the injected UI everywhere else via the body attribute consumed
// in globals.css.
export function QwertiWidgetGate() {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  useEffect(() => {
    if (isLanding) {
      delete document.body.dataset.qwertiHidden;
      return;
    }
    document.body.dataset.qwertiHidden = 'true';
    const qwerti = (window as { Qwerti?: { closeWidget?: () => void } }).Qwerti;
    try {
      qwerti?.closeWidget?.();
    } catch {
      // The widget owns its own state; hiding is what matters.
    }
  }, [isLanding]);

  if (!isLanding) return null;

  return (
    <Script
      src={QWERTI_WIDGET_SCRIPT_SRC}
      integrity={QWERTI_WIDGET_SCRIPT_INTEGRITY}
      crossOrigin="anonymous"
      strategy="afterInteractive"
      data-widget="qwerti-widget"
      data-campaign="hatcher-792703809-48487"
      data-auto-open="false"
      data-loader-version="1.0.0"
    />
  );
}

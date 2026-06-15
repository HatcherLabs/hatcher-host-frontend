'use client';

import { useEffect } from 'react';
import { hasAnalyticsConsent, type ConsentState } from '@/components/ui/CookieConsent';

const GOOGLE_ADS_ID = 'AW-18098396723';
const GOOGLE_ADS_SCRIPT_ID = 'google-ads-gtag';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
}

function updateConsent(granted: boolean) {
  ensureGtag();
  window.gtag?.('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

function loadGoogleAds(nonce?: string) {
  ensureGtag();
  if (!document.getElementById(GOOGLE_ADS_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = GOOGLE_ADS_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    if (nonce) script.nonce = nonce;
    document.head.appendChild(script);
  }
  window.gtag?.('js', new Date());
  window.gtag?.('config', GOOGLE_ADS_ID);
}

export function GoogleAdsProvider({ nonce }: { nonce?: string }) {
  useEffect(() => {
    const initialConsent = hasAnalyticsConsent();
    if (initialConsent) {
      updateConsent(true);
      loadGoogleAds(nonce);
    }

    const onConsentChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<ConsentState>).detail;
      const granted = detail?.analytics === true;
      updateConsent(granted);
      if (granted) loadGoogleAds(nonce);
    };

    window.addEventListener('hatcher:consent-changed', onConsentChanged);
    return () => window.removeEventListener('hatcher:consent-changed', onConsentChanged);
  }, [nonce]);

  return null;
}

'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import {
  ANALYTICS_CONSENT_EVENT,
  hasAnalyticsConsent,
  type AnalyticsConsentState,
} from '@/lib/analytics-consent';

let posthogInitialized = false;

export function initializePosthogAfterConsent(): void {
  if (posthogInitialized) {
    posthog.opt_in_capturing({ captureEventName: false });
    return;
  }
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    opt_out_persistence_by_default: true,
  });
  posthogInitialized = true;
  posthog.opt_in_capturing({ captureEventName: false });
}

// Do not initialize the SDK before opt-in: even an opted-out init performs a
// remote-config request and may create persistence identifiers.
export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (hasAnalyticsConsent()) initializePosthogAfterConsent();

    const onConsentChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<AnalyticsConsentState>).detail;
      if (detail?.analytics) initializePosthogAfterConsent();
      else if (posthogInitialized) posthog.opt_out_capturing();
    };
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsentChanged);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsentChanged);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

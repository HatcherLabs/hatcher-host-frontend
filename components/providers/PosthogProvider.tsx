'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { hasAnalyticsConsent, type ConsentState } from '@/components/ui/CookieConsent';

// Initialize PostHog opt-in by default. The CookieConsent banner owns
// the decision and fires a `hatcher:consent-changed` event that we
// listen to here so analytics starts immediately after Accept without a
// page reload.
export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    const initialConsent = hasAnalyticsConsent();

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      // GDPR-safe default: if no consent yet or it's declined, start
      // opted out. The banner flips this once the user accepts.
      opt_out_capturing_by_default: !initialConsent,
    });

    const onConsentChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<ConsentState>).detail;
      if (detail?.analytics) posthog.opt_in_capturing();
      else posthog.opt_out_capturing();
    };
    window.addEventListener('hatcher:consent-changed', onConsentChanged);
    return () => window.removeEventListener('hatcher:consent-changed', onConsentChanged);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

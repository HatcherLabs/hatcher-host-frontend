'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { getConsentStatus } from '@/components/ui/CookieConsent';

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    const consent = getConsentStatus();

    // Don't initialize if user has declined
    if (consent === 'declined') return;

    // Initialize PostHog but only enable capturing if accepted
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      // If no consent yet, start opted out (GDPR-safe default)
      opt_out_capturing_by_default: consent !== 'accepted',
    });

    // If already accepted, make sure capturing is enabled
    if (consent === 'accepted') {
      posthog.opt_in_capturing();
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

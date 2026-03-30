'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'hatcher-cookie-consent';

export type ConsentStatus = 'accepted' | 'declined' | null;

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === 'accepted' || value === 'declined') return value;
  return null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const status = getConsentStatus();
    if (!status) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    // Re-initialize PostHog if available
    try {
      const posthog = require('posthog-js').default;
      if (posthog && !posthog.__loaded) {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        if (key) {
          posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            person_profiles: 'identified_only',
            capture_pageview: true,
            capture_pageleave: true,
          });
        }
      } else if (posthog && posthog.__loaded) {
        posthog.opt_in_capturing();
      }
    } catch {
      // PostHog not available
    }
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
    // Opt out of PostHog if loaded
    try {
      const posthog = require('posthog-js').default;
      if (posthog && posthog.__loaded) {
        posthog.opt_out_capturing();
      }
    } catch {
      // PostHog not available
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center p-4 pointer-events-none"
      style={{ animation: 'cookieSlideUp 0.4s ease-out' }}
    >
      <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 sm:flex-nowrap">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          We use cookies and analytics to improve your experience.{' '}
          <Link
            href="/privacy"
            className="underline underline-offset-2 text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleDecline}
            className="rounded-lg border border-zinc-300 bg-transparent px-3.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            Accept
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes cookieSlideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

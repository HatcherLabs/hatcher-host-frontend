'use client';

// ============================================================
// Cookie + GDPR consent banner
//
// EU's ePrivacy Directive + GDPR require informed, granular, opt-in
// consent for any non-essential cookies / tracking. Accept-all must
// not be visually dominant over reject-all, and users must be able
// to withdraw consent as easily as they gave it.
//
// We persist a structured object in localStorage instead of a flat
// string so future categories (marketing, functional-opt-in) can be
// added without migrating old stored values.
//
// DoNotTrack: if the browser sends DNT=1 we treat it as a clear
// "reject optional" signal — skip the banner entirely and default
// to the essential-only config. Users can still open
// /dashboard/settings → Privacy to opt in manually.
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, BarChart3, Cookie as CookieIcon } from 'lucide-react';

const CONSENT_KEY = 'hatcher-cookie-consent';
const CONSENT_VERSION = 2; // bump when categories change so the banner re-prompts

export interface ConsentState {
  version: number;
  necessary: true; // always true — can't opt out
  analytics: boolean;
  decidedAt: string; // ISO timestamp
}

export type ConsentStatus = 'accepted-all' | 'essential-only' | 'custom' | null;

const ESSENTIAL_ONLY: ConsentState = {
  version: CONSENT_VERSION,
  necessary: true,
  analytics: false,
  decidedAt: new Date(0).toISOString(),
};

function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null; // schema changed → re-prompt
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    // Global event so any subsystem listening (PostHog, Sentry) can react.
    window.dispatchEvent(new CustomEvent('hatcher:consent-changed', { detail: state }));
  } catch { /* storage disabled */ }
}

/** Read current consent; returns false if the user never decided
 *  OR if their choice was decline-analytics. */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

export function getConsentStatus(): ConsentStatus {
  const c = readConsent();
  if (!c) return null;
  if (c.analytics) return 'accepted-all';
  return 'essential-only';
}

function initPostHogIfConsented(state: ConsentState) {
  if (!state.analytics) return;
  try {
    // posthog-js is lazy to avoid blocking first paint + to respect consent.
    const posthog = require('posthog-js').default;
    if (posthog && !posthog.__loaded) {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (!key) return;
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
      });
    } else if (posthog && posthog.__loaded) {
      posthog.opt_in_capturing();
    }
  } catch { /* module not installed */ }
}

function optOutPostHog() {
  try {
    const posthog = require('posthog-js').default;
    if (posthog && posthog.__loaded) posthog.opt_out_capturing();
  } catch { /* noop */ }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);

  useEffect(() => {
    const current = readConsent();
    if (current) {
      // Already decided — honor the stored choice.
      if (current.analytics) initPostHogIfConsented(current);
      return;
    }
    // Honor DNT: if the browser sends Do-Not-Track, don't show the
    // banner and don't load analytics. Crucially, we do NOT write a
    // consent record here — if the user previously opted IN explicitly
    // (e.g., via Settings) and we later bump the schema version, their
    // old record becomes stale and readConsent returns null, landing us
    // here. Writing ESSENTIAL_ONLY would silently override their
    // explicit opt-in. By NOT writing, we leave the stale record on
    // disk (harmless — version mismatch means it's ignored) and let
    // the user re-opt-in via Settings if they want. Analytics stays
    // off either way because readConsent returned null → PostHog
    // default is opt-out.
    const dnt = typeof navigator !== 'undefined'
      && ('doNotTrack' in navigator)
      && (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes');
    if (dnt) {
      return; // skip banner, skip analytics, don't overwrite old consent
    }
    // Slight delay so we don't flash the banner before first paint.
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  function persist(analytics: boolean) {
    const state: ConsentState = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics,
      decidedAt: new Date().toISOString(),
    };
    writeConsent(state);
    if (analytics) initPostHogIfConsented(state);
    else optOutPostHog();
    setVisible(false);
  }

  if (!visible) return null;

  // Collapsed state: slim full-width bottom bar so we don't block the page
  // (hero CTAs, form fields, pricing tables). Expanded state: centered card
  // for the granular controls — invoked explicitly via "Customize", so a
  // modal-like layout is appropriate there.
  if (!expanded) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-[9999] pointer-events-none"
        style={{ animation: 'cookieSlideUp 0.35s ease-out' }}
        role="dialog"
        aria-label="Cookie consent"
        aria-modal="false"
      >
        <div className="pointer-events-auto border-t border-[var(--border-default)] bg-[var(--bg-card-solid)]/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <CookieIcon className="w-4 h-4 text-[#f59e0b] shrink-0" />
              <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
                We use strictly necessary cookies + optional analytics (PostHog) with your consent.{' '}
                <Link href="/cookies" className="text-[var(--color-accent)] hover:underline">Cookie Policy</Link>
                {' · '}
                <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy Policy</Link>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setExpanded(true)}
                className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-2 px-2"
              >
                Customize
              </button>
              <button
                onClick={() => persist(false)}
                className="px-3 py-1.5 rounded-md text-[12px] font-semibold border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Reject optional
              </button>
              <button
                onClick={() => persist(true)}
                className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
        <style jsx global>{`
          @keyframes cookieSlideUp {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] p-3 sm:p-5 pointer-events-none"
      style={{ animation: 'cookieSlideUp 0.35s ease-out' }}
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card-solid)] shadow-2xl overflow-hidden">
        {/* Header row — short description + collapsed CTAs */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0">
              <CookieIcon className="w-4 h-4 text-[#f59e0b]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                We respect your privacy
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                We use strictly necessary cookies for login + theme, and optional analytics (PostHog) only with your
                consent. No advertising, no cross-site tracking. Read our{' '}
                <Link href="/cookies" className="text-[var(--color-accent)] hover:underline">Cookie Policy</Link>{' '}
                or{' '}
                <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>

          {/* Expanded category controls */}
          {expanded && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]/50">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Strictly necessary</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Login, theme, consent choice. Can&apos;t be disabled.</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                  Always on
                </span>
              </div>

              <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Analytics</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Anonymized product usage (PostHog). Opt-in.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsChoice}
                  onChange={(e) => setAnalyticsChoice(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-elevated)] accent-[var(--color-accent)] cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Buttons (expanded view) — equal weight per EU guidance */}
          <div className="mt-4 flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={() => setExpanded(false)}
              className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-2"
            >
              Back
            </button>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => persist(false)}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Essential only
              </button>
              <button
                onClick={() => persist(analyticsChoice)}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors"
              >
                Save preferences
              </button>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes cookieSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

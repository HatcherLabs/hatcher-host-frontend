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
import { usePathname } from 'next/navigation';
// CookieConsent is rendered in app/layout.tsx OUTSIDE NextIntlClientProvider
// so it must use plain next/link — the i18n Link's useLocale call would throw
// "No intl context found" on bare routes (/privacy, /terms, /cookies, /impressum).
import Link from 'next/link';
import {
  getAnalyticsConsentStatus,
  isDoNotTrackEnabled,
  persistAnalyticsConsent,
  readAnalyticsConsent,
  syncAnalyticsConsentCookie,
  type AnalyticsConsentState,
  type AnalyticsConsentStatus,
} from '@/lib/analytics-consent';

// Routes that take over the full viewport and shouldn't show a
// consent banner blocking the canvas. The pathname here still has
// the locale prefix because next/navigation.usePathname does not
// strip it (unlike the next-intl version used elsewhere).
const IMMERSIVE_RE = /\/agent\/[^/]+\/room(?:-legacy)?(?:\/|$)/;
import { Shield, BarChart3, Cookie as CookieIcon } from 'lucide-react';

/** Read current consent; returns false if the user never decided
 *  OR if their choice was decline-analytics. */
export { hasAnalyticsConsent } from '@/lib/analytics-consent';
export type ConsentState = AnalyticsConsentState;
export type ConsentStatus = AnalyticsConsentStatus;
export const getConsentStatus = getAnalyticsConsentStatus;

export function CookieConsent() {
  const pathname = usePathname();
  const immersive = pathname ? IMMERSIVE_RE.test(pathname) : false;
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);

  useEffect(() => {
    const current = readAnalyticsConsent();
    if (current) {
      // Already decided — honor the stored choice.
      syncAnalyticsConsentCookie();
      return;
    }
    // Honor DNT: if the browser sends Do-Not-Track, don't show the
    // banner and don't load analytics. Crucially, we do NOT write a
    // consent record here — if the user previously opted IN explicitly
    // (e.g., via Settings) and we later bump the schema version, their
    // old record becomes stale and readAnalyticsConsent returns null, landing us
    // here. Writing an essential-only record would silently override their
    // explicit opt-in. By NOT writing, we leave the stale record on
    // disk (harmless — version mismatch means it's ignored) and let
    // the user re-opt-in via Settings if they want. Analytics stays
    // off either way because readAnalyticsConsent returned null → PostHog
    // default is opt-out.
    if (isDoNotTrackEnabled()) {
      syncAnalyticsConsentCookie();
      return; // skip banner, skip analytics, don't overwrite old consent
    }
    // Slight delay so we don't flash the banner before first paint.
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  function persist(analytics: boolean) {
    persistAnalyticsConsent(analytics);
    setVisible(false);
  }

  if (!visible || immersive) return null;

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
        <div className="pointer-events-auto border-t border-[var(--border-default)] bg-[var(--bg-card-solid)] backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <CookieIcon className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
                We use strictly necessary cookies plus optional analytics and browser diagnostics (PostHog and Sentry) with your consent.{' '}
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
                className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--bg-base)] transition-colors"
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
            <div className="w-9 h-9 rounded-lg bg-[var(--tech-accent-soft)] flex items-center justify-center shrink-0">
              <CookieIcon className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                We respect your privacy
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                We use strictly necessary cookies for login + theme, and optional analytics and browser diagnostics
                (PostHog and Sentry) only with your consent. No advertising, no cross-site tracking. Read our{' '}
                <Link href="/cookies" className="text-[var(--color-accent)] hover:underline">Cookie Policy</Link>{' '}
                or{' '}
                <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>

          {/* Expanded category controls */}
          {expanded && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Strictly necessary</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Login, theme, consent choice. Can&apos;t be disabled.</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] px-2 py-0.5 rounded-full bg-[var(--tech-accent-soft)] border border-[var(--border-hover)]">
                  Always on
                </span>
              </div>

              <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Analytics</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Anonymized product usage and browser error diagnostics (PostHog and Sentry). Opt-in.</p>
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
                className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--bg-base)] transition-colors"
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

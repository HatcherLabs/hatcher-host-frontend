import * as Sentry from '@sentry/nextjs';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_VERSION,
} from '@/lib/analytics-consent';

let sentryStarted = false;

function analyticsAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') return false;
  try {
    const consent = JSON.parse(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) ?? 'null') as {
      version?: unknown;
      analytics?: unknown;
    } | null;
    return consent?.version === ANALYTICS_CONSENT_VERSION && consent.analytics === true;
  } catch {
    return false;
  }
}

function startSentry(): void {
  if (sentryStarted || !analyticsAllowed() || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    enabled: true,
  });
  sentryStarted = true;
}

if (typeof window !== 'undefined') {
  startSentry();
  window.addEventListener('hatcher:consent-changed', (event) => {
    const analytics = (event as CustomEvent<{ analytics?: boolean }>).detail?.analytics === true;
    if (analytics && analyticsAllowed()) {
      startSentry();
      return;
    }
    if (sentryStarted) {
      void Sentry.getClient()?.close(1_000);
      sentryStarted = false;
    }
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

export const ANALYTICS_CONSENT_STORAGE_KEY = 'hatcher-cookie-consent';
export const ANALYTICS_CONSENT_COOKIE = 'hatcher_analytics_consent';
export const ANALYTICS_CONSENT_VERSION = 2;
export const ANALYTICS_CONSENT_EVENT = 'hatcher:consent-changed';

const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

export interface AnalyticsConsentState {
  version: number;
  necessary: true;
  analytics: boolean;
  decidedAt: string;
}

export type AnalyticsConsentStatus = 'accepted-all' | 'essential-only' | null;

type ConsentStorage = Pick<Storage, 'getItem' | 'setItem'>;

interface PersistAnalyticsConsentOptions {
  storage?: ConsentStorage | null;
  doNotTrack?: string | null;
  now?: () => Date;
  writeCookie?: (allowed: boolean) => void;
  dispatch?: (state: AnalyticsConsentState) => void;
}

function browserStorage(): ConsentStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserDoNotTrack(): string | null {
  return typeof navigator === 'undefined' ? null : navigator.doNotTrack;
}

function doNotTrackEnabled(value: string | null | undefined): boolean {
  return value === '1' || value === 'yes';
}

function writeBrowserAnalyticsCookie(allowed: boolean): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${allowed ? '1' : '0'}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function dispatchBrowserConsentChange(state: AnalyticsConsentState): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: state }));
}

export function isDoNotTrackEnabled(): boolean {
  return doNotTrackEnabled(browserDoNotTrack());
}

export function readAnalyticsConsent(
  storage: ConsentStorage | null = browserStorage(),
): AnalyticsConsentState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnalyticsConsentState>;
    if (
      parsed.version !== ANALYTICS_CONSENT_VERSION
      || parsed.necessary !== true
      || typeof parsed.analytics !== 'boolean'
      || typeof parsed.decidedAt !== 'string'
    ) {
      return null;
    }
    return parsed as AnalyticsConsentState;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return !isDoNotTrackEnabled() && readAnalyticsConsent()?.analytics === true;
}

export function getAnalyticsConsentStatus(): AnalyticsConsentStatus {
  const consent = readAnalyticsConsent();
  if (!consent) return null;
  return consent.analytics && !isDoNotTrackEnabled()
    ? 'accepted-all'
    : 'essential-only';
}

export function syncAnalyticsConsentCookie(): void {
  writeBrowserAnalyticsCookie(hasAnalyticsConsent());
}

export function persistAnalyticsConsent(
  analytics: boolean,
  options: PersistAnalyticsConsentOptions = {},
): AnalyticsConsentState {
  const doNotTrack = options.doNotTrack === undefined
    ? browserDoNotTrack()
    : options.doNotTrack;
  const state: AnalyticsConsentState = {
    version: ANALYTICS_CONSENT_VERSION,
    necessary: true,
    analytics: analytics && !doNotTrackEnabled(doNotTrack),
    decidedAt: (options.now ?? (() => new Date()))().toISOString(),
  };
  const storage = options.storage === undefined ? browserStorage() : options.storage;

  try {
    storage?.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Consent still applies for this document through the cookie and event.
  }

  try {
    (options.writeCookie ?? writeBrowserAnalyticsCookie)(state.analytics);
  } catch {
    // Cookie restrictions must not prevent in-document withdrawal.
  }

  try {
    (options.dispatch ?? dispatchBrowserConsentChange)(state);
  } catch {
    // A consumer must not prevent the preference from being persisted.
  }

  return state;
}

export function shouldSendAnalyticsBeacon(
  consentCookie: string | undefined,
  doNotTrackHeader: string | null,
): boolean {
  return consentCookie === '1' && doNotTrackHeader !== '1';
}

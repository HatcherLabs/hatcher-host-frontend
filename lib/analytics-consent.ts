export const ANALYTICS_CONSENT_STORAGE_KEY = 'hatcher-cookie-consent';
export const ANALYTICS_CONSENT_COOKIE = 'hatcher_analytics_consent';
export const ANALYTICS_CONSENT_VERSION = 2;

export function shouldSendAnalyticsBeacon(
  consentCookie: string | undefined,
  doNotTrackHeader: string | null,
): boolean {
  return consentCookie === '1' && doNotTrackHeader !== '1';
}

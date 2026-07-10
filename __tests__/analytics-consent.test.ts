import { describe, expect, it } from 'vitest';
import { shouldSendAnalyticsBeacon } from '@/lib/analytics-consent';

describe('analytics consent enforcement', () => {
  it('requires an explicit opt-in cookie', () => {
    expect(shouldSendAnalyticsBeacon(undefined, null)).toBe(false);
    expect(shouldSendAnalyticsBeacon('0', null)).toBe(false);
    expect(shouldSendAnalyticsBeacon('1', null)).toBe(true);
  });

  it('lets Do Not Track override stored consent', () => {
    expect(shouldSendAnalyticsBeacon('1', '1')).toBe(false);
  });
});

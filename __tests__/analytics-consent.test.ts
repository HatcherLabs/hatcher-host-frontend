import { describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  persistAnalyticsConsent,
  readAnalyticsConsent,
  shouldSendAnalyticsBeacon,
} from '@/lib/analytics-consent';

describe('analytics consent enforcement', () => {
  it('requires an explicit opt-in cookie', () => {
    expect(shouldSendAnalyticsBeacon(undefined, null)).toBe(false);
    expect(shouldSendAnalyticsBeacon('0', null)).toBe(false);
    expect(shouldSendAnalyticsBeacon('1', null)).toBe(true);
  });

  it('lets Do Not Track override stored consent', () => {
    expect(shouldSendAnalyticsBeacon('1', '1')).toBe(false);
  });

  it('persists and dispatches the effective analytics choice', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const writeCookie = vi.fn();
    const dispatch = vi.fn();

    const state = persistAnalyticsConsent(true, {
      storage,
      doNotTrack: null,
      now: () => new Date('2026-07-10T09:00:00.000Z'),
      writeCookie,
      dispatch,
    });

    expect(readAnalyticsConsent(storage)).toEqual(state);
    expect(values.has(ANALYTICS_CONSENT_STORAGE_KEY)).toBe(true);
    expect(writeCookie).toHaveBeenCalledWith(true);
    expect(dispatch).toHaveBeenCalledWith(state);
  });

  it('applies Do Not Track and still dispatches withdrawal when storage fails', () => {
    const writeCookie = vi.fn();
    const dispatch = vi.fn();
    const state = persistAnalyticsConsent(true, {
      storage: {
        getItem: () => null,
        setItem: () => { throw new Error('blocked'); },
      },
      doNotTrack: '1',
      writeCookie,
      dispatch,
    });

    expect(state.analytics).toBe(false);
    expect(writeCookie).toHaveBeenCalledWith(false);
    expect(dispatch).toHaveBeenCalledWith(state);
  });
});

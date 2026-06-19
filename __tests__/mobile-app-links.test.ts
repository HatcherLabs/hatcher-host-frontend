import { describe, expect, it } from 'vitest';
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  SOLANA_MOBILE_URL,
} from '@/lib/mobile-app-links';

describe('mobile app links', () => {
  it('exposes the public store destinations used by landing surfaces', () => {
    expect(APP_STORE_URL).toBe('https://apps.apple.com/us/app/hatcher-ai-agents/id6778533643');
    expect(GOOGLE_PLAY_URL).toBe('https://play.google.com/store/apps/details?id=host.hatcher.app');
    expect(SOLANA_MOBILE_URL).toBe('https://solanamobile.com/');
  });
});

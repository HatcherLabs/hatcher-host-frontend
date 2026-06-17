import { describe, expect, it } from 'vitest';
import { buildPhantomBrowseUrl } from '@/lib/wallet-links';

describe('wallet links', () => {
  it('builds a Phantom mobile browse deeplink for the current staking page', () => {
    expect(buildPhantomBrowseUrl('https://hatcher.host/staking', 'https://hatcher.host')).toBe(
      'https://phantom.app/ul/browse/https%3A%2F%2Fhatcher.host%2Fstaking?ref=https%3A%2F%2Fhatcher.host',
    );
  });
});

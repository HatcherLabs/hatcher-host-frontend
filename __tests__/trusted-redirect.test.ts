import { describe, expect, it } from 'vitest';
import { trustedRedirectUrl } from '@/lib/trusted-redirect';

describe('trusted redirect URLs', () => {
  it('allows the expected hosted services and their subdomains', () => {
    expect(trustedRedirectUrl('https://checkout.stripe.com/c/pay/test', 'stripe'))
      .toBe('https://checkout.stripe.com/c/pay/test');
    expect(trustedRedirectUrl('https://staging.clawville.world/game', 'clawville'))
      .toBe('https://staging.clawville.world/game');
  });

  it('rejects lookalike, credentialed, and non-HTTPS redirects', () => {
    expect(() => trustedRedirectUrl('https://stripe.com.attacker.example/pay', 'stripe')).toThrow();
    expect(() => trustedRedirectUrl('https://github.com@attacker.example/login', 'github')).toThrow();
    expect(() => trustedRedirectUrl('http://cryptnow.io/pay', 'cryptnow')).toThrow();
  });
});

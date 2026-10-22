import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountBillingState } from './AccountBillingState';
const render = (account: Parameters<typeof AccountBillingState>[0]['account']) => renderToStaticMarkup(<AccountBillingState account={account} onOpenAccount={() => {}} />);
describe('admin guest billing explanation', () => {
  it('separates anonymous identity, confirmed purchase and Sandbox', () => {
    const html = render({ accountKind: 'ios_guest', guestState: 'active', guestEnvironment: 'Sandbox', applePlans: [{ tier: 'starter', environment: 'Sandbox', expiresAt: '2026-11-22T00:00:00Z', productId: 'starter' }] });
    expect(html).toContain('Apple purchase confirmed');
    expect(html).toContain('Sandbox is a test purchase');
    expect(html).toContain('No email verification is required');
    expect(html).toContain('Deploying agents requires signing in');
    expect(html).toContain('remaining credits');
    expect(html).toContain('Canvas creations');
  });
  it('shows the recipient of a transferred guest without presenting it as an active buyer', () => {
    const html = render({ accountKind: 'ios_guest', guestState: 'linked', linkedAccount: { id: 'member', username: 'Member', email: 'member@example.invalid' } });
    expect(html).toContain('member@example.invalid');
    expect(html).toContain('can no longer sign in');
    expect(html).not.toContain('Not linked yet');
  });
  it('shows imported guest identities on the recipient account', () => {
    expect(render({ accountKind: 'registered', linkedGuestIds: ['guest-origin'] })).toContain('guest-origin');
  });
  it('adds no guest explanation to an ordinary account', () => {
    expect(render({ accountKind: 'registered' })).toBe('');
  });
});

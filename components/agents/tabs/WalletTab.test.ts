import { describe, expect, it } from 'vitest';

import { shouldShowMirariPanelForWallet } from './WalletTab';

describe('Wallet tab integration placement', () => {
  it('shows Mirari with Solana-side integrations instead of the Base wallet', () => {
    expect(shouldShowMirariPanelForWallet('solana')).toBe(true);
    expect(shouldShowMirariPanelForWallet('base')).toBe(false);
    expect(shouldShowMirariPanelForWallet('skale')).toBe(false);
  });
});

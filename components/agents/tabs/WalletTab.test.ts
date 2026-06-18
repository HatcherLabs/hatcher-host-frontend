import { describe, expect, it } from 'vitest';

import { getProviderPanelIdsForWallet, shouldShowMirariPanelForWallet } from './WalletTab';

describe('Wallet tab integration placement', () => {
  it('shows Mirari with Solana-side integrations instead of the Base wallet', () => {
    expect(shouldShowMirariPanelForWallet('solana')).toBe(true);
    expect(shouldShowMirariPanelForWallet('base')).toBe(false);
    expect(shouldShowMirariPanelForWallet('skale')).toBe(false);
  });

  it('places MPP32 with Solana provider rails', () => {
    expect(getProviderPanelIdsForWallet('solana')).toContain('mpp32');
    expect(getProviderPanelIdsForWallet('base')).not.toContain('mpp32');
    expect(getProviderPanelIdsForWallet('skale')).not.toContain('mpp32');
  });
});

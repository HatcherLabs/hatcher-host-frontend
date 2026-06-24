import { describe, expect, it } from 'vitest';

import {
  getInitialWalletProviderFromSearch,
  getInitialWalletSectionFromSearch,
  getProviderPanelIdsForWallet,
  shouldShowMirariPanelForWallet,
} from './WalletTab';

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

  it('places Medusa with Solana provider rails', () => {
    expect(getProviderPanelIdsForWallet('solana')).toContain('medusa');
    expect(getProviderPanelIdsForWallet('base')).not.toContain('medusa');
    expect(getProviderPanelIdsForWallet('skale')).not.toContain('medusa');
  });

  it('places Metaplex with Solana identity provider rails', () => {
    expect(getProviderPanelIdsForWallet('solana')).toContain('metaplex');
    expect(getProviderPanelIdsForWallet('base')).not.toContain('metaplex');
    expect(getProviderPanelIdsForWallet('skale')).not.toContain('metaplex');
  });

  it('deep-links to the Medusa provider panel', () => {
    const search = '?tab=wallet&walletSection=providers&walletProvider=medusa';

    expect(getInitialWalletSectionFromSearch(search)).toBe('providers');
    expect(getInitialWalletProviderFromSearch(search)).toBe('medusa');
  });

  it('deep-links to the Metaplex provider panel', () => {
    const search = '?tab=wallet&walletSection=providers&walletProvider=metaplex';

    expect(getInitialWalletSectionFromSearch(search)).toBe('providers');
    expect(getInitialWalletProviderFromSearch(search)).toBe('metaplex');
  });
});

import { describe, expect, it } from 'vitest';

import {
  formatWalletActivityAmount,
  getInitialWalletProviderFromSearch,
  getInitialWalletSectionFromSearch,
  getProviderPanelIdsForWallet,
  getProviderSelectorOptions,
  getWalletActivityTransactionsForNetwork,
} from './WalletTab';

describe('Wallet tab integration placement', () => {
  it('retires the Kausalayer, Mirari, and Vantara provider panels', () => {
    expect(getProviderPanelIdsForWallet('solana')).not.toContain('kausalayer');
    expect(getProviderPanelIdsForWallet('solana')).not.toContain('mirari');
    expect(getProviderPanelIdsForWallet('solana')).not.toContain('vantara');
    expect(getInitialWalletProviderFromSearch(
      '?tab=wallet&walletSection=providers&walletProvider=mirari',
      'openclaw',
    )).toBe('metaplex');
  });

  it('retires MPP32 from the provider rails', () => {
    expect(getProviderPanelIdsForWallet('solana')).not.toContain('mpp32');
    expect(getProviderSelectorOptions().map((provider) => provider.id)).not.toContain('mpp32');
  });

  it('places Metaplex with Solana identity provider rails', () => {
    expect(getProviderPanelIdsForWallet('solana')[0]).toBe('metaplex');
    expect(getProviderPanelIdsForWallet('base')).not.toContain('metaplex');
    expect(getProviderPanelIdsForWallet('skale')).not.toContain('metaplex');
  });

  it('deep-links to the Metaplex provider panel', () => {
    const search = '?tab=wallet&walletSection=providers&walletProvider=metaplex';

    expect(getInitialWalletSectionFromSearch(search)).toBe('providers');
    expect(getInitialWalletProviderFromSearch(search)).toBe('metaplex');
  });

  it('selects transaction activity for the active wallet network', () => {
    expect(getWalletActivityTransactionsForNetwork({
      generatedAt: '2026-06-24T10:00:00.000Z',
      notes: [],
      networks: [
        {
          id: 'skale',
          label: 'SKALE',
          chainType: 'evm',
          address: '0x1111111111111111111111111111111111111111',
          explorerUrl: 'https://skale.test/address/0x1111111111111111111111111111111111111111',
          transactions: [],
          error: null,
        },
        {
          id: 'solana',
          label: 'Solana',
          chainType: 'solana',
          address: 'SolAgent111',
          explorerUrl: 'https://solscan.io/account/SolAgent111',
          transactions: [
            {
              id: 'solana:sig-1',
              network: 'solana',
              chainType: 'solana',
              signature: 'sig-1',
              timestamp: '2026-05-28T20:26:40.000Z',
              type: 'TRANSFER',
              direction: 'in',
              amount: '1.25',
              asset: 'SOL',
              from: 'Sender111',
              to: 'SolAgent111',
              description: 'Received 1.25 SOL',
              explorerUrl: 'https://solscan.io/tx/sig-1',
            },
          ],
          error: null,
        },
      ],
    }, 'solana')).toHaveLength(1);
  });

  it('formats wallet activity amounts with their asset symbol', () => {
    expect(formatWalletActivityAmount('1.250000', 'SOL')).toBe('1.25 SOL');
    expect(formatWalletActivityAmount(null, null)).toBe('-');
  });

  it('builds compact provider selector options for the top picker', () => {
    expect(getProviderSelectorOptions()).toContainEqual({
      id: 'virtuals',
      label: 'Virtuals',
      network: 'Base',
      description: 'Hire Virtuals agents and publish Hatcher services.',
    });
  });
});

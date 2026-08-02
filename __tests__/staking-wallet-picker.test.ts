import { WalletReadyState } from '@solana/wallet-adapter-base';
import { describe, expect, it } from 'vitest';
import {
  groupHatcherWallets,
  isSelectableHatcherWallet,
} from '@/components/providers/HatcherWalletModalProvider';

function wallet(name: string, readyState: WalletReadyState) {
  return {
    adapter: { name },
    readyState,
  };
}

describe('staking wallet picker', () => {
  it('keeps the recommended wallets in a stable, explicit order', () => {
    const grouped = groupHatcherWallets([
      wallet('Jupiter Wallet', WalletReadyState.Installed),
      wallet('Solflare', WalletReadyState.NotDetected),
      wallet('Phantom', WalletReadyState.Installed),
    ]);

    expect(grouped.recommended.map(({ config }) => config.name)).toEqual([
      'Phantom',
      'Solflare',
      'Backpack',
    ]);
    expect(grouped.recommended.map(({ wallet: item }) => item?.adapter.name ?? null)).toEqual([
      'Phantom',
      'Solflare',
      null,
    ]);
  });

  it('only exposes ready Wallet Standard wallets in the detected section', () => {
    const grouped = groupHatcherWallets([
      wallet('MetaMask', WalletReadyState.Installed),
      wallet('MetaMask Wallet', WalletReadyState.Installed),
      wallet('Jupiter Wallet', WalletReadyState.Loadable),
      wallet('Mobile Wallet Adapter', WalletReadyState.Loadable),
      wallet('Legacy Wallet', WalletReadyState.NotDetected),
    ]);

    expect(grouped.additional.map((item) => item.adapter.name)).toEqual([
      'MetaMask',
      'Mobile Wallet Adapter',
    ]);
  });

  it('only treats installed wallets and the mobile adapter as selectable', () => {
    expect(isSelectableHatcherWallet('Phantom', WalletReadyState.Installed)).toBe(true);
    expect(isSelectableHatcherWallet('Solflare', WalletReadyState.Loadable)).toBe(false);
    expect(isSelectableHatcherWallet('Mobile Wallet Adapter', WalletReadyState.Loadable)).toBe(true);
    expect(isSelectableHatcherWallet('Phantom', WalletReadyState.NotDetected)).toBe(false);
    expect(isSelectableHatcherWallet('Phantom', WalletReadyState.Unsupported)).toBe(false);
  });
});

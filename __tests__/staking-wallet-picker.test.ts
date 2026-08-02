import { WalletReadyState } from '@solana/wallet-adapter-base';
import { describe, expect, it } from 'vitest';
import {
  groupStakingWallets,
  isSelectableStakingWallet,
} from '@/app/[locale]/staking/StakingWalletModalProvider';

function wallet(name: string, readyState: WalletReadyState) {
  return {
    adapter: { name },
    readyState,
  };
}

describe('staking wallet picker', () => {
  it('keeps the recommended wallets in a stable, explicit order', () => {
    const grouped = groupStakingWallets([
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
    const grouped = groupStakingWallets([
      wallet('MetaMask', WalletReadyState.Installed),
      wallet('MetaMask Wallet', WalletReadyState.Installed),
      wallet('Jupiter Wallet', WalletReadyState.Loadable),
      wallet('Legacy Wallet', WalletReadyState.NotDetected),
    ]);

    expect(grouped.additional.map((item) => item.adapter.name)).toEqual([
      'MetaMask',
      'Jupiter Wallet',
    ]);
  });

  it('treats installed and loadable adapters as selectable', () => {
    expect(isSelectableStakingWallet(WalletReadyState.Installed)).toBe(true);
    expect(isSelectableStakingWallet(WalletReadyState.Loadable)).toBe(true);
    expect(isSelectableStakingWallet(WalletReadyState.NotDetected)).toBe(false);
    expect(isSelectableStakingWallet(WalletReadyState.Unsupported)).toBe(false);
  });
});

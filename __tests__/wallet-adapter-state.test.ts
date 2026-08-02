import { WalletReadyState } from '@solana/wallet-adapter-base';
import { describe, expect, it } from 'vitest';
import {
  isSelectableSolanaWallet,
  shouldAutoConnectSolanaWallet,
} from '@/lib/wallet-adapter-state';

describe('Solana wallet adapter state', () => {
  it('does not auto-connect Mobile Wallet Adapter outside a user tap', () => {
    expect(shouldAutoConnectSolanaWallet(
      'Mobile Wallet Adapter',
      WalletReadyState.Loadable,
    )).toBe(false);
    expect(shouldAutoConnectSolanaWallet('Phantom', WalletReadyState.Installed)).toBe(true);
    expect(shouldAutoConnectSolanaWallet('Solflare', WalletReadyState.Installed)).toBe(true);
    expect(shouldAutoConnectSolanaWallet('Solflare', WalletReadyState.Loadable)).toBe(false);
    expect(shouldAutoConnectSolanaWallet('Phantom', WalletReadyState.NotDetected)).toBe(false);
  });

  it('keeps user-initiated Mobile Wallet Adapter connections available', () => {
    expect(isSelectableSolanaWallet(
      'Mobile Wallet Adapter',
      WalletReadyState.Loadable,
    )).toBe(true);
    expect(isSelectableSolanaWallet('Solflare', WalletReadyState.Loadable)).toBe(false);
  });
});

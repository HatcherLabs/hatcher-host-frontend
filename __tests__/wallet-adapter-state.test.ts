import { describe, expect, it } from 'vitest';
import { shouldAutoConnectSolanaWallet } from '@/lib/wallet-adapter-state';

describe('Solana wallet adapter state', () => {
  it('does not auto-connect Mobile Wallet Adapter outside a user tap', () => {
    expect(shouldAutoConnectSolanaWallet('Mobile Wallet Adapter')).toBe(false);
    expect(shouldAutoConnectSolanaWallet('Phantom')).toBe(true);
    expect(shouldAutoConnectSolanaWallet('Solflare')).toBe(true);
  });
});

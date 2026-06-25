import { describe, expect, it, vi } from 'vitest';
import {
  bytesToBase64,
  formatRewardFundingSources,
  formatStakingTokenAmount,
  formatStakingWalletStepNotice,
  refreshStakingDataAfterTransaction,
  resolveStakingLinkedWalletAddress,
  resolveStakingWalletStep,
  shouldUseWalletSignInForLinking,
  WALLET_LINK_SIWS_STATEMENT,
} from '@/lib/staking-state';

describe('staking linked wallet state', () => {
  it('uses the just-linked wallet immediately while auth and staking summary refresh', () => {
    expect(resolveStakingLinkedWalletAddress({
      userWalletAddress: null,
      summaryWalletAddress: null,
      optimisticLinkedWalletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs',
    })).toBe('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');
  });

  it('falls back to refreshed account data when there is no pending local link', () => {
    expect(resolveStakingLinkedWalletAddress({
      userWalletAddress: 'user-wallet',
      summaryWalletAddress: 'summary-wallet',
      optimisticLinkedWalletAddress: null,
    })).toBe('user-wallet');
  });

  it('formats total staked HATCHER amounts for compact staking metrics', () => {
    expect(formatStakingTokenAmount(85_000_000)).toBe('85,000,000 HATCHER');
    expect(formatStakingTokenAmount(12_345.678, 2)).toBe('12,345.68 HATCHER');
  });

  it('formats continuous reward funding sources for page copy', () => {
    expect(formatRewardFundingSources(['creator fees', 'buybacks', 'dev wallet'])).toBe(
      'creator fees, buybacks, and dev wallet',
    );
  });

  it('keeps refreshing staking data after a confirmed transaction so new positions can appear', async () => {
    const refresh = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('summary stale'))
      .mockResolvedValueOnce(undefined);
    const sleep = vi.fn(async () => undefined);
    const onError = vi.fn();

    await refreshStakingDataAfterTransaction({
      refresh,
      sleep,
      retryDelaysMs: [750, 2_000],
      onError,
    });

    expect(refresh).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 750);
    expect(sleep).toHaveBeenNthCalledWith(2, 2_000);
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps mobile wallet connect, link signing, and staking as separate user steps', () => {
    expect(resolveStakingWalletStep({
      isAuthenticated: true,
      connectedWalletAddress: null,
      linkedWalletAddress: null,
      walletMatchesAccount: false,
    })).toBe('connect-wallet');

    expect(resolveStakingWalletStep({
      isAuthenticated: true,
      connectedWalletAddress: 'connected-wallet',
      linkedWalletAddress: null,
      walletMatchesAccount: false,
    })).toBe('link-wallet');

    expect(resolveStakingWalletStep({
      isAuthenticated: true,
      connectedWalletAddress: 'connected-wallet',
      linkedWalletAddress: 'connected-wallet',
      walletMatchesAccount: true,
    })).toBe('ready');
  });

  it('explains why the user must tap again after wallet preparation steps', () => {
    expect(formatStakingWalletStepNotice('connect-wallet')).toBe(
      'Wallet connected. Tap Link wallet to sign and link it before staking.',
    );
    expect(formatStakingWalletStepNotice('link-wallet')).toBe(
      'Wallet linked. Tap Stake HATCHER again to submit the staking transaction.',
    );
  });

  it('uses wallet-adapter signIn only for Mobile Wallet Adapter linking', () => {
    expect(shouldUseWalletSignInForLinking({
      walletName: 'Mobile Wallet Adapter',
      signInSupported: true,
      isMobileRuntime: true,
    })).toBe(true);
    expect(shouldUseWalletSignInForLinking({
      walletName: 'Phantom',
      signInSupported: true,
      isMobileRuntime: false,
    })).toBe(false);
    expect(shouldUseWalletSignInForLinking({
      walletName: 'Phantom',
      signInSupported: true,
      isMobileRuntime: true,
    })).toBe(false);
    expect(shouldUseWalletSignInForLinking({
      walletName: 'Mobile Wallet Adapter',
      signInSupported: false,
      isMobileRuntime: true,
    })).toBe(false);
  });

  it('encodes signed wallet message bytes for link-wallet verification', () => {
    expect(bytesToBase64(new TextEncoder().encode('Sign in to Hatcher'))).toBe('U2lnbiBpbiB0byBIYXRjaGVy');
  });

  it('keeps the SIWS statement aligned with the API verifier', () => {
    expect(WALLET_LINK_SIWS_STATEMENT).toBe(
      'Link this wallet to Hatcher for staking rewards and AI Credits.',
    );
  });
});

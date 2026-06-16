import { describe, expect, it } from 'vitest';
import { resolveStakingLinkedWalletAddress } from '@/lib/staking-state';

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
});

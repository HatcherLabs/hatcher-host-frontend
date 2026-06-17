import { describe, expect, it } from 'vitest';
import {
  formatRewardFundingSources,
  formatStakingTokenAmount,
  resolveStakingLinkedWalletAddress,
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
});

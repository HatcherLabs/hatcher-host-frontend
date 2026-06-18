import { describe, expect, it } from 'vitest';
import {
  estimateActiveStakeRewards,
  estimateStakingRewards,
} from '@/lib/staking-reward-estimator';
import type { StakingPoolConfig } from '@/lib/api';

function stakingPool(overrides: Partial<StakingPoolConfig> = {}): StakingPoolConfig {
  return {
    key: '30d',
    label: '30 days',
    durationDays: 30,
    rewardShareBps: 3_000,
    maxStakeHatcher: 200_000_000,
    monthlyRewardBudgetHatcher: 375_000,
    weeklyRewardBudgetHatcher: 86_538,
    aiCreditsPerDayPerMillion: 50,
    poolAddress: 'pool-address',
    configured: true,
    estimatedAprAtCap: 2.25,
    currentApr: 50,
    activeStakeCount: 4,
    totalStakedHatcher: 9_000_000,
    streamflowUrl: null,
    ...overrides,
  };
}

describe('staking reward estimator', () => {
  it('estimates pool share, HATCHER rewards, AI Credits, and APR after stake', () => {
    const estimate = estimateStakingRewards(stakingPool(), 1_000_000);

    expect(estimate).toMatchObject({
      amountHatcher: 1_000_000,
      poolTotalBeforeStake: 9_000_000,
      poolTotalAfterStake: 10_000_000,
      estimatedHatcherRewards: 37_500,
      estimatedAiCredits: 1_500,
      estimatedAprAfterStake: 45,
    });
    expect(estimate?.poolShareFraction).toBeCloseTo(0.1);
    expect(estimate?.poolSharePercent).toBeCloseTo(10);
  });

  it('uses the weekly budget for 7 day locks', () => {
    const estimate = estimateStakingRewards(stakingPool({
      key: '7d',
      label: '7 days',
      durationDays: 7,
      monthlyRewardBudgetHatcher: 250_000,
      weeklyRewardBudgetHatcher: 57_692,
      aiCreditsPerDayPerMillion: 20,
      totalStakedHatcher: 1_000_000,
    }), 1_000_000);

    expect(estimate?.estimatedHatcherRewards).toBe(28_846);
    expect(estimate?.estimatedAiCredits).toBe(140);
  });

  it('uses three monthly budgets for 90 day locks', () => {
    const estimate = estimateStakingRewards(stakingPool({
      key: '90d',
      label: '90 days',
      durationDays: 90,
      monthlyRewardBudgetHatcher: 625_000,
      weeklyRewardBudgetHatcher: 144_230,
      aiCreditsPerDayPerMillion: 100,
      totalStakedHatcher: 4_000_000,
    }), 1_000_000);

    expect(estimate?.estimatedHatcherRewards).toBe(375_000);
    expect(estimate?.estimatedAiCredits).toBe(9_000);
    expect(estimate?.estimatedAprAfterStake).toBe(150);
  });

  it('rounds AI Credits down to match claimable staking credits', () => {
    const estimate = estimateStakingRewards(stakingPool(), 1_000_001);

    expect(estimate?.estimatedAiCredits).toBe(1_500);
  });

  it('does not estimate invalid or empty amounts', () => {
    const pool = stakingPool();

    expect(estimateStakingRewards(pool, 0)).toBeNull();
    expect(estimateStakingRewards(pool, -1)).toBeNull();
    expect(estimateStakingRewards(pool, Number.NaN)).toBeNull();
    expect(estimateStakingRewards(null, 1_000_000)).toBeNull();
  });

  it('estimates active stake rewards from the current pool total', () => {
    const estimate = estimateActiveStakeRewards(stakingPool({
      totalStakedHatcher: 10_000_000,
    }), 1_000_000);

    expect(estimate).toMatchObject({
      stakeHatcher: 1_000_000,
      poolTotalHatcher: 10_000_000,
      rewardBudgetForLock: 375_000,
      estimatedHatcherRewards: 37_500,
    });
    expect(estimate?.poolShareFraction).toBeCloseTo(0.1);
    expect(estimate?.poolSharePercent).toBeCloseTo(10);
  });

  it('uses the weekly budget when estimating active 7 day stakes', () => {
    const estimate = estimateActiveStakeRewards(stakingPool({
      key: '7d',
      label: '7 days',
      durationDays: 7,
      monthlyRewardBudgetHatcher: 250_000,
      weeklyRewardBudgetHatcher: 57_692,
      totalStakedHatcher: 2_000_000,
    }), 1_000_000);

    expect(estimate?.estimatedHatcherRewards).toBe(28_846);
    expect(estimate?.poolSharePercent).toBe(50);
  });

  it('does not estimate active stake rewards without a live pool total', () => {
    const pool = stakingPool({ totalStakedHatcher: 0 });

    expect(estimateActiveStakeRewards(pool, 1_000_000)).toBeNull();
    expect(estimateActiveStakeRewards(stakingPool(), 0)).toBeNull();
    expect(estimateActiveStakeRewards(stakingPool(), Number.NaN)).toBeNull();
    expect(estimateActiveStakeRewards(null, 1_000_000)).toBeNull();
  });
});

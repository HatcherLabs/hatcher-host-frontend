import { describe, expect, it } from 'vitest';
import { groupActiveStakesByPool, stakesInExpandedPoolGroups } from '@/lib/staking-active-stakes';
import type { StakingPoolConfig, StakingStakeEntry } from '@/lib/api';

function stakingPool(overrides: Partial<StakingPoolConfig> = {}): StakingPoolConfig {
  return {
    key: '90d',
    label: '90 days',
    durationDays: 90,
    rewardShareBps: 5000,
    maxStakeHatcher: 200_000_000,
    monthlyRewardBudgetHatcher: 375_000,
    weeklyRewardBudgetHatcher: 86_538,
    aiCreditsPerDayPerMillion: 10,
    poolAddress: 'pool-90d',
    configured: true,
    estimatedAprAtCap: 22.5,
    currentApr: 45,
    activeStakeCount: 4,
    totalStakedHatcher: 10_000_000,
    streamflowUrl: null,
    ...overrides,
  };
}

function stakeEntry(overrides: Partial<StakingStakeEntry> = {}): StakingStakeEntry {
  return {
    stakeEntryAddress: 'stake-entry-1',
    depositNonce: 1,
    poolKey: '90d',
    poolAddress: 'pool-90d',
    walletAddress: 'wallet-1',
    stakedHatcher: 1_000_000,
    createdAt: '2026-06-01T00:00:00.000Z',
    unlockAt: '2026-09-01T00:00:00.000Z',
    durationDays: 90,
    claimableAiCredits: 100,
    claimedAiCredits: 0,
    ...overrides,
  };
}

describe('active stake grouping', () => {
  it('groups active stakes by pool using the configured pool order', () => {
    const groups = groupActiveStakesByPool([
      stakeEntry({
        stakeEntryAddress: 'stake-90d-a',
        stakedHatcher: 1_000_000,
        claimableAiCredits: 100,
      }),
      stakeEntry({
        stakeEntryAddress: 'stake-7d-a',
        poolKey: '7d',
        poolAddress: 'pool-7d',
        stakedHatcher: 500_000,
        claimableAiCredits: 15,
        unlockAt: '2026-06-08T00:00:00.000Z',
        durationDays: 7,
      }),
      stakeEntry({
        stakeEntryAddress: 'stake-90d-b',
        depositNonce: 2,
        stakedHatcher: 250_000,
        claimableAiCredits: 25,
        unlockAt: '2026-08-01T00:00:00.000Z',
      }),
    ], [
      stakingPool({
        key: '7d',
        label: '7 days',
        durationDays: 7,
        poolAddress: 'pool-7d',
        totalStakedHatcher: 2_000_000,
      }),
      stakingPool({
        key: '30d',
        label: '30 days',
        durationDays: 30,
        poolAddress: 'pool-30d',
      }),
      stakingPool(),
    ]);

    expect(groups.map((group) => group.poolKey)).toEqual(['7d', '90d']);
    expect(groups[0]).toMatchObject({
      poolKey: '7d',
      poolLabel: '7 days',
      positionCount: 1,
      totalStakedHatcher: 500_000,
      totalClaimableAiCredits: 15,
    });
    expect(groups[1]).toMatchObject({
      poolKey: '90d',
      poolLabel: '90 days',
      positionCount: 2,
      totalStakedHatcher: 1_250_000,
      totalClaimableAiCredits: 125,
    });
  });

  it('sorts positions by unlock date and exposes the next unlock', () => {
    const groups = groupActiveStakesByPool([
      stakeEntry({
        stakeEntryAddress: 'later',
        unlockAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2026-06-02T00:00:00.000Z',
      }),
      stakeEntry({
        stakeEntryAddress: 'earlier',
        depositNonce: 2,
        unlockAt: '2026-08-01T00:00:00.000Z',
        createdAt: '2026-06-03T00:00:00.000Z',
      }),
    ], [stakingPool()]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.nextUnlockAt).toBe('2026-08-01T00:00:00.000Z');
    expect(groups[0]?.stakes.map((stake) => stake.stakeEntryAddress)).toEqual(['earlier', 'later']);
  });

  it('estimates group rewards from the live pool total', () => {
    const groups = groupActiveStakesByPool([
      stakeEntry({ stakeEntryAddress: 'stake-a', stakedHatcher: 1_000_000 }),
      stakeEntry({ stakeEntryAddress: 'stake-b', depositNonce: 2, stakedHatcher: 500_000 }),
    ], [
      stakingPool({
        totalStakedHatcher: 10_000_000,
        monthlyRewardBudgetHatcher: 375_000,
      }),
    ]);

    expect(groups[0]?.poolSharePercent).toBeCloseTo(15);
    expect(groups[0]?.estimatedHatcherRewards).toBe(168_750);
  });

  it('keeps stake groups visible when pool config is missing', () => {
    const groups = groupActiveStakesByPool([
      stakeEntry({ stakeEntryAddress: 'stake-a', poolKey: '30d', poolAddress: 'pool-30d' }),
    ], []);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      poolKey: '30d',
      poolLabel: '30D',
      positionCount: 1,
      estimatedHatcherRewards: null,
      poolSharePercent: null,
    });
  });

  it('selects reward status checks only for expanded pool groups', () => {
    const groups = groupActiveStakesByPool([
      stakeEntry({ stakeEntryAddress: 'stake-90d-a', poolKey: '90d', poolAddress: 'pool-90d' }),
      stakeEntry({
        stakeEntryAddress: 'stake-7d-a',
        poolKey: '7d',
        poolAddress: 'pool-7d',
        unlockAt: '2026-06-08T00:00:00.000Z',
        durationDays: 7,
      }),
    ], [
      stakingPool({ key: '7d', label: '7 days', durationDays: 7, poolAddress: 'pool-7d' }),
      stakingPool(),
    ]);

    expect(stakesInExpandedPoolGroups(groups, new Set())).toEqual([]);
    expect(stakesInExpandedPoolGroups(groups, new Set(['7d'])).map((stake) => stake.stakeEntryAddress)).toEqual([
      'stake-7d-a',
    ]);
  });
});

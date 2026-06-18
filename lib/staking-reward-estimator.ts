import type { StakingPoolConfig } from '@/lib/api';

export type StakingRewardEstimate = {
  amountHatcher: number;
  poolTotalBeforeStake: number;
  poolTotalAfterStake: number;
  poolShareFraction: number;
  poolSharePercent: number;
  rewardBudgetForLock: number;
  estimatedHatcherRewards: number;
  estimatedAiCredits: number;
  estimatedAprAfterStake: number;
};

export type ActiveStakeRewardEstimate = {
  stakeHatcher: number;
  poolTotalHatcher: number;
  poolShareFraction: number;
  poolSharePercent: number;
  rewardBudgetForLock: number;
  estimatedHatcherRewards: number;
};

function rewardBudgetForLock(pool: StakingPoolConfig): number {
  if (pool.key === '7d') return pool.weeklyRewardBudgetHatcher;
  return pool.monthlyRewardBudgetHatcher * (pool.durationDays / 30);
}

export function estimateStakingRewards(
  pool: StakingPoolConfig | null | undefined,
  amountHatcher: number,
): StakingRewardEstimate | null {
  if (!pool || !Number.isFinite(amountHatcher) || amountHatcher <= 0) return null;

  const poolTotalBeforeStake = Number.isFinite(pool.totalStakedHatcher)
    ? Math.max(0, pool.totalStakedHatcher)
    : 0;
  const poolTotalAfterStake = poolTotalBeforeStake + amountHatcher;
  if (poolTotalAfterStake <= 0) return null;

  const poolShareFraction = amountHatcher / poolTotalAfterStake;
  const rewardBudget = rewardBudgetForLock(pool);
  return {
    amountHatcher,
    poolTotalBeforeStake,
    poolTotalAfterStake,
    poolShareFraction,
    poolSharePercent: poolShareFraction * 100,
    rewardBudgetForLock: rewardBudget,
    estimatedHatcherRewards: rewardBudget * poolShareFraction,
    estimatedAiCredits: Math.floor((amountHatcher / 1_000_000) * pool.aiCreditsPerDayPerMillion * pool.durationDays),
    estimatedAprAfterStake: (pool.monthlyRewardBudgetHatcher * 12 / poolTotalAfterStake) * 100,
  };
}

export function estimateActiveStakeRewards(
  pool: StakingPoolConfig | null | undefined,
  stakeHatcher: number,
): ActiveStakeRewardEstimate | null {
  if (!pool || !Number.isFinite(stakeHatcher) || stakeHatcher <= 0) return null;
  if (!Number.isFinite(pool.totalStakedHatcher) || pool.totalStakedHatcher <= 0) return null;

  const poolTotalHatcher = pool.totalStakedHatcher;
  const poolShareFraction = Math.min(1, stakeHatcher / poolTotalHatcher);
  const rewardBudget = rewardBudgetForLock(pool);
  return {
    stakeHatcher,
    poolTotalHatcher,
    poolShareFraction,
    poolSharePercent: poolShareFraction * 100,
    rewardBudgetForLock: rewardBudget,
    estimatedHatcherRewards: rewardBudget * poolShareFraction,
  };
}

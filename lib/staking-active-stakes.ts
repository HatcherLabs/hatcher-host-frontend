import type { StakingPoolConfig, StakingPoolKey, StakingStakeEntry } from '@/lib/api';
import { estimateActiveStakeRewards } from '@/lib/staking-reward-estimator';

export type ActiveStakePoolGroup = {
  poolKey: StakingPoolKey;
  poolLabel: string;
  pool: StakingPoolConfig | null;
  stakes: StakingStakeEntry[];
  positionCount: number;
  totalStakedHatcher: number;
  totalClaimableAiCredits: number;
  nextUnlockAt: string | null;
  estimatedHatcherRewards: number | null;
  poolSharePercent: number | null;
};

type MutableActiveStakePoolGroup = {
  poolKey: StakingPoolKey;
  poolLabel: string;
  pool: StakingPoolConfig | null;
  stakes: StakingStakeEntry[];
  totalStakedHatcher: number;
  totalClaimableAiCredits: number;
};

const DEFAULT_POOL_ORDER: Record<StakingPoolKey, number> = {
  '7d': 0,
  '30d': 1,
  '90d': 2,
};

function fallbackPoolLabel(poolKey: StakingPoolKey): string {
  return poolKey.toUpperCase();
}

function timestampOrInfinity(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function compareStakeEntries(a: StakingStakeEntry, b: StakingStakeEntry): number {
  const unlockDiff = timestampOrInfinity(a.unlockAt) - timestampOrInfinity(b.unlockAt);
  if (unlockDiff !== 0) return unlockDiff;

  const createdDiff = timestampOrInfinity(a.createdAt) - timestampOrInfinity(b.createdAt);
  if (createdDiff !== 0) return createdDiff;

  return a.stakeEntryAddress.localeCompare(b.stakeEntryAddress);
}

function nextUnlockAt(stakes: StakingStakeEntry[]): string | null {
  return stakes.find((stake) => Number.isFinite(timestampOrInfinity(stake.unlockAt)))?.unlockAt ?? null;
}

export function groupActiveStakesByPool(
  stakes: StakingStakeEntry[],
  pools: StakingPoolConfig[],
): ActiveStakePoolGroup[] {
  const poolsByKey = new Map(pools.map((pool) => [pool.key, pool]));
  const poolOrder = new Map(pools.map((pool, index) => [pool.key, index]));
  const groupsByKey = new Map<StakingPoolKey, MutableActiveStakePoolGroup>();

  for (const stake of stakes) {
    const existing = groupsByKey.get(stake.poolKey);
    const group = existing ?? {
      poolKey: stake.poolKey,
      poolLabel: poolsByKey.get(stake.poolKey)?.label ?? fallbackPoolLabel(stake.poolKey),
      pool: poolsByKey.get(stake.poolKey) ?? null,
      stakes: [],
      totalStakedHatcher: 0,
      totalClaimableAiCredits: 0,
    };

    group.stakes.push(stake);
    group.totalStakedHatcher += stake.stakedHatcher;
    group.totalClaimableAiCredits += stake.claimableAiCredits;
    groupsByKey.set(stake.poolKey, group);
  }

  return Array.from(groupsByKey.values())
    .map((group) => {
      const sortedStakes = [...group.stakes].sort(compareStakeEntries);
      const estimate = estimateActiveStakeRewards(group.pool, group.totalStakedHatcher);

      return {
        ...group,
        stakes: sortedStakes,
        positionCount: sortedStakes.length,
        nextUnlockAt: nextUnlockAt(sortedStakes),
        estimatedHatcherRewards: estimate?.estimatedHatcherRewards ?? null,
        poolSharePercent: estimate?.poolSharePercent ?? null,
      };
    })
    .sort((a, b) => {
      const aOrder = poolOrder.get(a.poolKey) ?? DEFAULT_POOL_ORDER[a.poolKey];
      const bOrder = poolOrder.get(b.poolKey) ?? DEFAULT_POOL_ORDER[b.poolKey];
      return aOrder - bOrder;
    });
}

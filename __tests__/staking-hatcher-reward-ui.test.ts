import { describe, expect, it } from 'vitest';
import {
  canClaimHatcherReward,
  canInitializeHatcherRewardEntry,
  hatcherRewardClaimReason,
  hatcherRewardEntryRentDisclosure,
  hatcherRewardStatusLabel,
  type HatcherRewardUiStatus,
} from '@/lib/streamflow-staking';

function status(overrides: Partial<HatcherRewardUiStatus>): HatcherRewardUiStatus {
  return {
    canClaim: false,
    rewardEntryExists: true,
    kind: 'no_rewards',
    reason: null,
    loading: false,
    error: null,
    ...overrides,
  };
}

describe('hatcherRewardStatusLabel', () => {
  it('shows Checking... while loading or before the first check', () => {
    expect(hatcherRewardStatusLabel(undefined)).toBe('Checking...');
    expect(hatcherRewardStatusLabel(status({ loading: true }))).toBe('Checking...');
  });

  it('shows Unavailable when the status check threw', () => {
    expect(hatcherRewardStatusLabel(status({ error: 'boom' }))).toBe('Unavailable');
  });

  it('maps each status kind to a truthful label', () => {
    expect(hatcherRewardStatusLabel(status({ kind: 'claimable', canClaim: true }))).toBe('Claimable');
    expect(hatcherRewardStatusLabel(status({ kind: 'no_rewards' }))).toBe('0 HATCHER');
    expect(hatcherRewardStatusLabel(status({ kind: 'entry_missing', rewardEntryExists: false }))).toBe('Not initialized');
    expect(hatcherRewardStatusLabel(status({ kind: 'pool_missing', rewardEntryExists: false }))).toBe('Rewards unavailable');
    expect(hatcherRewardStatusLabel(status({ kind: 'simulation_error' }))).toBe('Check failed');
    expect(hatcherRewardStatusLabel(status({ kind: 'rpc_error' }))).toBe('Check failed');
  });
});

describe('hatcherRewardClaimReason', () => {
  it('explains the checking state', () => {
    expect(hatcherRewardClaimReason(undefined)).toBe('Checking HATCHER rewards');
    expect(hatcherRewardClaimReason(status({ loading: true }))).toBe('Checking HATCHER rewards');
  });

  it('surfaces thrown errors directly', () => {
    expect(hatcherRewardClaimReason(status({ error: 'RPC exploded' }))).toBe('RPC exploded');
  });

  it('passes through the status reason when present', () => {
    expect(hatcherRewardClaimReason(status({ kind: 'simulation_error', reason: 'Custom reason from the check.' })))
      .toBe('Custom reason from the check.');
  });

  it('falls back to stable copy per kind when no reason is present', () => {
    expect(hatcherRewardClaimReason(status({ kind: 'claimable', canClaim: true }))).toBe('Claim HATCHER rewards');
    expect(hatcherRewardClaimReason(status({ kind: 'no_rewards' }))).toBe('No HATCHER rewards are available to claim yet.');
    expect(hatcherRewardClaimReason(status({ kind: 'entry_missing', rewardEntryExists: false })))
      .toBe('Reward tracking account is missing for this stake.');
    expect(hatcherRewardClaimReason(status({ kind: 'pool_missing' }))).toContain('different reward pool');
    expect(hatcherRewardClaimReason(status({ kind: 'simulation_error' }))).toContain('check failed');
    expect(hatcherRewardClaimReason(status({ kind: 'rpc_error' }))).toContain('Refresh');
  });
});

describe('canClaimHatcherReward', () => {
  it('only allows claiming for a resolved claimable status', () => {
    expect(canClaimHatcherReward(undefined)).toBe(false);
    expect(canClaimHatcherReward(status({ kind: 'claimable', canClaim: true }))).toBe(true);
    expect(canClaimHatcherReward(status({ kind: 'claimable', canClaim: true, loading: true }))).toBe(false);
    expect(canClaimHatcherReward(status({ kind: 'claimable', canClaim: true, error: 'x' }))).toBe(false);
    expect(canClaimHatcherReward(status({ kind: 'no_rewards' }))).toBe(false);
    expect(canClaimHatcherReward(status({ kind: 'simulation_error' }))).toBe(false);
    expect(canClaimHatcherReward(status({ kind: 'pool_missing', rewardEntryExists: false }))).toBe(false);
  });
});

describe('canInitializeHatcherRewardEntry', () => {
  it('only offers initialization for a resolved entry_missing status', () => {
    expect(canInitializeHatcherRewardEntry(undefined)).toBe(false);
    expect(canInitializeHatcherRewardEntry(status({ kind: 'entry_missing', rewardEntryExists: false }))).toBe(true);
    expect(canInitializeHatcherRewardEntry(status({ kind: 'claimable', canClaim: true }))).toBe(false);
    expect(canInitializeHatcherRewardEntry(status({ kind: 'no_rewards' }))).toBe(false);
    expect(canInitializeHatcherRewardEntry(status({ kind: 'pool_missing', rewardEntryExists: false }))).toBe(false);
    expect(canInitializeHatcherRewardEntry(status({ kind: 'simulation_error' }))).toBe(false);
    expect(canInitializeHatcherRewardEntry(status({ kind: 'rpc_error' }))).toBe(false);
  });

  it('hides initialization while loading or after an error', () => {
    expect(canInitializeHatcherRewardEntry(status({ kind: 'entry_missing', rewardEntryExists: false, loading: true })))
      .toBe(false);
    expect(canInitializeHatcherRewardEntry(status({ kind: 'entry_missing', rewardEntryExists: false, error: 'boom' })))
      .toBe(false);
  });
});

describe('hatcherRewardEntryRentDisclosure', () => {
  it('uses the fetched rent-exempt amount when available', () => {
    expect(hatcherRewardEntryRentDisclosure(1_559_040))
      .toBe('Creating the reward tracking account costs a small one-time rent deposit of ~0.0016 SOL.');
  });

  it('falls back to approximate copy when rent could not be fetched', () => {
    const fallback = 'Creating the reward tracking account costs a small one-time SOL rent deposit (~0.002 SOL).';
    expect(hatcherRewardEntryRentDisclosure(null)).toBe(fallback);
    expect(hatcherRewardEntryRentDisclosure(0)).toBe(fallback);
    expect(hatcherRewardEntryRentDisclosure(Number.NaN)).toBe(fallback);
  });
});

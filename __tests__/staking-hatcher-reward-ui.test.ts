import { describe, expect, it } from 'vitest';
import {
  canClaimHatcherReward,
  hatcherRewardClaimReason,
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

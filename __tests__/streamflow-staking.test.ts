import { PublicKey } from '@solana/web3.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { claimHatcherRewardsWithStreamflow } from '@/lib/streamflow-staking';

const stakingMocks = vi.hoisted(() => ({
  claimRewards: vi.fn(async () => ({ txId: 'claim-tx' })),
  createRewardEntry: vi.fn(async () => ({ txId: 'create-entry-tx' })),
  getAccountInfo: vi.fn(async (): Promise<unknown> => ({ owner: { equals: () => true } })),
  prepareClaimRewardsInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  rewardEntryFetchNullable: vi.fn(async (): Promise<unknown> => ({ accountedAmount: { toString: () => '100' } })),
  simulateTransaction: vi.fn(async (): Promise<{ value: { err: unknown | null } }> => ({ value: { err: null } })),
}));

vi.mock('@streamflow/staking', () => ({
  SolanaStakingClient: class MockSolanaStakingClient {
    connection = {
      getAccountInfo: stakingMocks.getAccountInfo,
      simulateTransaction: stakingMocks.simulateTransaction,
    };

    getCurrentProgramId = vi.fn(() => 'reward-program');
    prepareClaimRewardsInstructions = stakingMocks.prepareClaimRewardsInstructions;
    claimRewards = stakingMocks.claimRewards;
    createRewardEntry = stakingMocks.createRewardEntry;
    programs = {
      rewardPoolDynamicProgram: {
        account: {
          rewardEntry: { fetchNullable: stakingMocks.rewardEntryFetchNullable },
        },
      },
    };
  },
  deriveRewardPoolPDA: vi.fn(() => 'reward-pool'),
  deriveRewardEntryPDA: vi.fn(() => 'reward-entry'),
  deriveStakeEntryPDA: vi.fn(() => ({
    equals: () => true,
  })),
}));

describe('streamflow staking rewards', () => {
  beforeEach(() => {
    stakingMocks.claimRewards.mockClear();
    stakingMocks.createRewardEntry.mockClear();
    stakingMocks.getAccountInfo.mockClear();
    stakingMocks.prepareClaimRewardsInstructions.mockClear();
    stakingMocks.rewardEntryFetchNullable.mockClear();
    stakingMocks.simulateTransaction.mockClear();
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
    });
    stakingMocks.prepareClaimRewardsInstructions.mockResolvedValue({
      ixs: [{
        keys: [],
        programId: new PublicKey('11111111111111111111111111111111'),
        data: Buffer.alloc(0),
      }],
    });
    stakingMocks.rewardEntryFetchNullable.mockResolvedValue({ accountedAmount: { toString: () => '100' } });
    stakingMocks.simulateTransaction.mockResolvedValue({ value: { err: null } });
  });

  it('claims existing reward entries without creating rent-bearing accounts', async () => {
    const owner = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');
    const wallet = {
      publicKey: owner,
      signTransaction: vi.fn(),
    } as unknown as WalletContextState;

    await expect(claimHatcherRewardsWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
      depositNonce: 123,
    })).resolves.toEqual({ txIds: ['claim-tx'] });

    expect(stakingMocks.createRewardEntry).not.toHaveBeenCalled();
    expect(stakingMocks.claimRewards).toHaveBeenCalledTimes(1);
  });

  it('stops before submitting a claim transaction when the reward entry is missing', async () => {
    stakingMocks.rewardEntryFetchNullable.mockResolvedValueOnce(null);

    const owner = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');
    const wallet = {
      publicKey: owner,
      signTransaction: vi.fn(),
    } as unknown as WalletContextState;

    await expect(claimHatcherRewardsWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
      depositNonce: 123,
    })).rejects.toThrow('Reward tracking account is missing');

    expect(stakingMocks.createRewardEntry).not.toHaveBeenCalled();
    expect(stakingMocks.claimRewards).not.toHaveBeenCalled();
  });

  it('stops before submitting a claim transaction when no HATCHER rewards are available', async () => {
    stakingMocks.simulateTransaction.mockResolvedValueOnce({ value: { err: { InstructionError: [0, 'Custom'] } } });

    const owner = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');
    const wallet = {
      publicKey: owner,
      signTransaction: vi.fn(),
    } as unknown as WalletContextState;

    await expect(claimHatcherRewardsWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
      depositNonce: 123,
    })).rejects.toThrow('No HATCHER rewards are available to claim yet');

    expect(stakingMocks.createRewardEntry).not.toHaveBeenCalled();
    expect(stakingMocks.claimRewards).not.toHaveBeenCalled();
  });
});

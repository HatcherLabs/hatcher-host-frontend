import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { claimHatcherRewardsWithStreamflow, stakeHatcherWithStreamflow } from '@/lib/streamflow-staking';

const stakingMocks = vi.hoisted(() => ({
  claimRewards: vi.fn(async () => ({ txId: 'claim-tx' })),
  createRewardEntry: vi.fn(async () => ({ txId: 'create-entry-tx' })),
  stakeAndCreateEntries: vi.fn(async () => ({ txId: 'sdk-stake-tx' })),
  getAccountInfo: vi.fn(async (): Promise<unknown> => ({ owner: { equals: () => true } })),
  getLatestBlockhashAndContext: vi.fn(async (): Promise<unknown> => ({
    context: { slot: 42 },
    value: {
      blockhash: '11111111111111111111111111111111',
      lastValidBlockHeight: 123,
    },
  })),
  confirmTransaction: vi.fn(async (): Promise<unknown> => ({ value: { err: null } })),
  sendRawTransaction: vi.fn(async (): Promise<string> => 'stake-tx'),
  prepareClaimRewardsInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  prepareStakeAndCreateEntriesInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  rewardEntryFetchNullable: vi.fn(async (): Promise<unknown> => ({ accountedAmount: { toString: () => '100' } })),
  simulateTransaction: vi.fn(async (): Promise<{ value: { err: unknown | null } }> => ({ value: { err: null } })),
}));

vi.mock('@streamflow/staking', () => ({
  SolanaStakingClient: class MockSolanaStakingClient {
    connection = {
      getAccountInfo: stakingMocks.getAccountInfo,
      getLatestBlockhashAndContext: stakingMocks.getLatestBlockhashAndContext,
      confirmTransaction: stakingMocks.confirmTransaction,
      sendRawTransaction: stakingMocks.sendRawTransaction,
      simulateTransaction: stakingMocks.simulateTransaction,
    };

    getCurrentProgramId = vi.fn(() => 'reward-program');
    stakeAndCreateEntries = stakingMocks.stakeAndCreateEntries;
    prepareStakeAndCreateEntriesInstructions = stakingMocks.prepareStakeAndCreateEntriesInstructions;
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
    stakingMocks.stakeAndCreateEntries.mockClear();
    stakingMocks.getAccountInfo.mockClear();
    stakingMocks.getLatestBlockhashAndContext.mockClear();
    stakingMocks.confirmTransaction.mockClear();
    stakingMocks.sendRawTransaction.mockClear();
    stakingMocks.prepareClaimRewardsInstructions.mockClear();
    stakingMocks.prepareStakeAndCreateEntriesInstructions.mockClear();
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
    stakingMocks.prepareStakeAndCreateEntriesInstructions.mockResolvedValue({
      ixs: [{
        keys: [],
        programId: new PublicKey('11111111111111111111111111111111'),
        data: Buffer.alloc(0),
      }],
    });
    stakingMocks.getLatestBlockhashAndContext.mockResolvedValue({
      context: { slot: 42 },
      value: {
        blockhash: '11111111111111111111111111111111',
        lastValidBlockHeight: 123,
      },
    });
    stakingMocks.confirmTransaction.mockResolvedValue({ value: { err: null } });
    stakingMocks.sendRawTransaction.mockResolvedValue('stake-tx');
    stakingMocks.rewardEntryFetchNullable.mockResolvedValue({ accountedAmount: { toString: () => '100' } });
    stakingMocks.simulateTransaction.mockResolvedValue({ value: { err: null } });
  });

  it('pre-simulates legacy stake transactions before asking Phantom to sign', async () => {
    const calls: string[] = [];
    const keypair = Keypair.generate();
    stakingMocks.simulateTransaction.mockImplementationOnce(async () => {
      calls.push('simulate');
      return { value: { err: null } };
    });
    stakingMocks.sendRawTransaction.mockImplementationOnce(async () => {
      calls.push('broadcast');
      return 'stake-tx';
    });
    stakingMocks.confirmTransaction.mockImplementationOnce(async () => {
      calls.push('confirm');
      return { value: { err: null } };
    });
    const onTransactionSubmitted = vi.fn(() => {
      calls.push('submitted');
    });
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: vi.fn(async (tx) => {
        calls.push('sign');
        if (tx instanceof Transaction) tx.partialSign(keypair);
        return tx;
      }),
    } as unknown as WalletContextState;

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
      onTransactionSubmitted,
    })).resolves.toEqual({ txId: 'stake-tx' });

    expect(stakingMocks.stakeAndCreateEntries).not.toHaveBeenCalled();
    expect(stakingMocks.prepareStakeAndCreateEntriesInstructions).toHaveBeenCalledTimes(1);
    expect(stakingMocks.simulateTransaction).toHaveBeenCalledWith(
      expect.any(Transaction),
    );
    expect(wallet.signTransaction).toHaveBeenCalledTimes(1);
    expect(stakingMocks.sendRawTransaction).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        minContextSlot: 42,
      }),
    );
    expect(onTransactionSubmitted).toHaveBeenCalledWith('stake-tx');
    expect(calls).toEqual(['simulate', 'sign', 'broadcast', 'submitted', 'confirm']);
  });

  it('stops before Phantom signing when stake preflight simulation fails', async () => {
    const wallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: vi.fn(),
    } as unknown as WalletContextState;
    stakingMocks.simulateTransaction.mockResolvedValueOnce({
      value: { err: { InstructionError: [0, 'Custom'] } },
    });

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
    })).rejects.toThrow('failed preflight simulation');

    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('stops before Phantom signing when a stake transaction needs multiple signatures', async () => {
    const extraSigner = Keypair.generate().publicKey;
    stakingMocks.prepareStakeAndCreateEntriesInstructions.mockResolvedValueOnce({
      ixs: [new TransactionInstruction({
        keys: [{ pubkey: extraSigner, isSigner: true, isWritable: true }],
        programId: SystemProgram.programId,
        data: Buffer.alloc(0),
      })],
    });
    const wallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: vi.fn(),
    } as unknown as WalletContextState;

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
    })).rejects.toThrow('exactly one wallet signature');

    expect(stakingMocks.simulateTransaction).not.toHaveBeenCalled();
    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
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

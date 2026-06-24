import {
  Keypair,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  claimHatcherRewardsWithStreamflow,
  stakeHatcherWithStreamflow,
  unstakeHatcherWithStreamflow,
} from '@/lib/streamflow-staking';

const stakingMocks = vi.hoisted(() => ({
  claimRewards: vi.fn(async () => ({ txId: 'claim-tx' })),
  createRewardEntry: vi.fn(async () => ({ txId: 'create-entry-tx' })),
  deriveStakeMintPDA: vi.fn(),
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
  prepareUnstakeAndClaimInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  prepareUnstakeInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
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
    prepareUnstakeAndClaimInstructions = stakingMocks.prepareUnstakeAndClaimInstructions;
    prepareUnstakeInstructions = stakingMocks.prepareUnstakeInstructions;
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
  deriveStakeMintPDA: stakingMocks.deriveStakeMintPDA,
  deriveStakeEntryPDA: vi.fn(() => ({
    equals: () => true,
  })),
}));

describe('streamflow staking rewards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    stakingMocks.claimRewards.mockClear();
    stakingMocks.createRewardEntry.mockClear();
    stakingMocks.deriveStakeMintPDA.mockClear();
    stakingMocks.stakeAndCreateEntries.mockClear();
    stakingMocks.getAccountInfo.mockClear();
    stakingMocks.getLatestBlockhashAndContext.mockClear();
    stakingMocks.confirmTransaction.mockClear();
    stakingMocks.sendRawTransaction.mockClear();
    stakingMocks.prepareClaimRewardsInstructions.mockClear();
    stakingMocks.prepareStakeAndCreateEntriesInstructions.mockClear();
    stakingMocks.prepareUnstakeAndClaimInstructions.mockClear();
    stakingMocks.prepareUnstakeInstructions.mockClear();
    stakingMocks.rewardEntryFetchNullable.mockClear();
    stakingMocks.simulateTransaction.mockClear();
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
    });
    stakingMocks.deriveStakeMintPDA.mockReturnValue(Keypair.generate().publicKey);
    stakingMocks.stakeAndCreateEntries.mockResolvedValue({ txId: 'sdk-stake-tx' });
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
    stakingMocks.prepareUnstakeAndClaimInstructions.mockResolvedValue({
      ixs: [{
        keys: [],
        programId: new PublicKey('11111111111111111111111111111111'),
        data: Buffer.alloc(0),
      }],
    });
    stakingMocks.prepareUnstakeInstructions.mockResolvedValue({
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

  it('prepares the Streamflow receipt token account separately when it is missing', async () => {
    const keypair = Keypair.generate();
    const stakeMint = Keypair.generate().publicKey;
    stakingMocks.deriveStakeMintPDA.mockReturnValueOnce(stakeMint);
    stakingMocks.getAccountInfo.mockResolvedValue(null);
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'prepare-ata-tx'),
    } as unknown as WalletContextState;

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
    })).resolves.toEqual({ txId: 'prepare-ata-tx', preparedOnly: true });

    expect(stakingMocks.stakeAndCreateEntries).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
    expect(stakingMocks.prepareStakeAndCreateEntriesInstructions).not.toHaveBeenCalled();
    expect(stakingMocks.simulateTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.objectContaining({ sigVerify: false }),
    );
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('prepares the Streamflow receipt token account through wallet sendTransaction on mobile', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      maxTouchPoints: 5,
    });
    const keypair = Keypair.generate();
    const stakeMint = Keypair.generate().publicKey;
    stakingMocks.deriveStakeMintPDA.mockReturnValueOnce(stakeMint);
    stakingMocks.getAccountInfo.mockResolvedValue(null);
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: vi.fn(async (transaction) => transaction),
      sendTransaction: vi.fn(async () => 'prepare-ata-tx'),
    } as unknown as WalletContextState;

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
    })).resolves.toEqual({ txId: 'prepare-ata-tx', preparedOnly: true });

    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('stakes through the Streamflow SDK when the receipt token account exists', async () => {
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    const onTransactionSubmitted = vi.fn();
    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'sdk-stake-tx'),
    } as unknown as WalletContextState;

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
      onTransactionSubmitted,
    })).resolves.toEqual({ txId: 'sdk-stake-tx' });

    expect(stakingMocks.stakeAndCreateEntries).not.toHaveBeenCalled();
    expect(stakingMocks.prepareStakeAndCreateEntriesInstructions).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: expect.objectContaining({ toString: expect.any(Function) }),
        duration: expect.objectContaining({ toString: expect.any(Function) }),
        nonce: expect.any(Number),
        rewardPools: [expect.objectContaining({
          mint: expect.any(PublicKey),
          nonce: 0,
          rewardPoolType: 'dynamic',
          tokenProgramId,
        })],
        stakePool: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
        stakePoolMint: expect.any(PublicKey),
        tokenProgramId,
      }),
      {
        invoker: wallet,
      },
    );
    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
    expect(onTransactionSubmitted).toHaveBeenCalledWith('sdk-stake-tx');
    expect(stakingMocks.simulateTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.objectContaining({ sigVerify: false }),
    );
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('stakes through wallet sendTransaction on mobile after preparing Streamflow instructions', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36',
      maxTouchPoints: 5,
    });
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    const onTransactionSubmitted = vi.fn();
    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: vi.fn(async (transaction) => transaction),
      sendTransaction: vi.fn(async () => 'sdk-stake-tx'),
    } as unknown as WalletContextState;

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
      onTransactionSubmitted,
    })).resolves.toEqual({ txId: 'sdk-stake-tx' });

    expect(stakingMocks.prepareStakeAndCreateEntriesInstructions).toHaveBeenCalledWith(
      expect.objectContaining({
        stakePool: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
        tokenProgramId,
      }),
      { invoker: wallet },
    );
    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
    expect(onTransactionSubmitted).toHaveBeenCalledWith('sdk-stake-tx');
  });

  it('unstakes an unlocked Streamflow stake through wallet sendTransaction', async () => {
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    const onTransactionSubmitted = vi.fn();
    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'unstake-tx'),
    } as unknown as WalletContextState;

    await expect(unstakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      depositNonce: 123,
      unlockAt: new Date(Date.now() - 60_000).toISOString(),
      onTransactionSubmitted,
    })).resolves.toEqual({ txId: 'unstake-tx' });

    expect(stakingMocks.prepareUnstakeAndClaimInstructions).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 123,
        rewardPools: [expect.objectContaining({
          mint: expect.any(PublicKey),
          nonce: 0,
          rewardPoolType: 'dynamic',
          tokenProgramId,
        })],
        stakePool: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
        stakePoolMint: expect.any(PublicKey),
        tokenProgramId,
      }),
      { invoker: wallet },
    );
    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
    expect(onTransactionSubmitted).toHaveBeenCalledWith('unstake-tx');
  });

  it('falls back to unstake-only instructions when unstake-and-claim fails preflight', async () => {
    const walletKeypair = Keypair.generate();
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
    });
    stakingMocks.simulateTransaction
      .mockResolvedValueOnce({ value: { err: { InstructionError: [0, 'Custom'] } } })
      .mockResolvedValueOnce({ value: { err: null } });
    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'unstake-only-tx'),
    } as unknown as WalletContextState;

    await expect(unstakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      depositNonce: 123,
      unlockAt: new Date(Date.now() - 60_000).toISOString(),
    })).resolves.toEqual({ txId: 'unstake-only-tx' });

    expect(stakingMocks.prepareUnstakeAndClaimInstructions).toHaveBeenCalled();
    expect(stakingMocks.prepareUnstakeInstructions).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: 123,
        stakePool: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
        stakePoolMint: expect.any(PublicKey),
        tokenProgramId: expect.any(PublicKey),
      }),
      { invoker: wallet },
    );
    expect(stakingMocks.simulateTransaction).toHaveBeenCalledTimes(2);
    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
  });

  it('rejects unstake before the lock period has ended', async () => {
    const wallet = {
      publicKey: Keypair.generate().publicKey,
      sendTransaction: vi.fn(),
      signTransaction: vi.fn(),
    } as unknown as WalletContextState;

    await expect(unstakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      depositNonce: 123,
      unlockAt: new Date(Date.now() + 60_000).toISOString(),
    })).rejects.toThrow('This stake is still locked');

    expect(stakingMocks.prepareUnstakeAndClaimInstructions).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it('claims existing reward entries without creating rent-bearing accounts', async () => {
    const owner = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');
    const wallet = {
      publicKey: owner,
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'claim-tx'),
    } as unknown as WalletContextState;

    await expect(claimHatcherRewardsWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
      depositNonce: 123,
    })).resolves.toEqual({ txIds: ['claim-tx'] });

    expect(stakingMocks.createRewardEntry).not.toHaveBeenCalled();
    expect(stakingMocks.claimRewards).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
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

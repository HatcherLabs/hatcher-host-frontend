import {
  Keypair,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  claimHatcherRewardsWithStreamflow,
  fetchHatcherRewardEntryRentLamports,
  fetchHatcherRewardStatusWithStreamflow,
  initializeHatcherRewardEntry,
  resetHatcherRewardPoolCache,
  resolveHatcherRewardPool,
  stakeHatcherWithStreamflow,
  unstakeHatcherWithStreamflow,
} from '@/lib/streamflow-staking';
import { SolanaStakingClient } from '@streamflow/staking';
import { HATCH_TOKEN_MINT } from '@/lib/config';

const stakingMocks = vi.hoisted(() => ({
  claimRewards: vi.fn(async () => ({ txId: 'claim-tx' })),
  createRewardEntry: vi.fn(async () => ({ txId: 'create-entry-tx' })),
  deriveStakeMintPDA: vi.fn(),
  deriveRewardPoolPDA: vi.fn((...args: unknown[]) => `reward-pool-${String(args[3])}`),
  rewardPoolAll: vi.fn(async (): Promise<unknown[]> => []),
  rewardEntryAll: vi.fn(async (): Promise<unknown[]> => []),
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
  getSignatureStatuses: vi.fn(async (): Promise<unknown> => ({ value: [null] })),
  sendRawTransaction: vi.fn(async (): Promise<string> => 'stake-tx'),
  getMinimumBalanceForRentExemption: vi.fn(async (): Promise<number> => 1_559_040),
  prepareClaimRewardsInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  prepareCreateRewardEntryInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  prepareStakeAndCreateEntriesInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  prepareUnstakeAndClaimInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  prepareUnstakeInstructions: vi.fn(async (): Promise<{ ixs: unknown[] }> => ({ ixs: [] })),
  rewardEntryFetchNullable: vi.fn(async (): Promise<unknown> => ({ accountedAmount: { toString: () => '100' } })),
  simulateTransaction: vi.fn(async (): Promise<{ value: { err: unknown | null; logs?: string[] | null } }> => ({ value: { err: null } })),
}));

vi.mock('@streamflow/staking', () => ({
  SolanaStakingClient: class MockSolanaStakingClient {
    connection = {
      getAccountInfo: stakingMocks.getAccountInfo,
      getLatestBlockhashAndContext: stakingMocks.getLatestBlockhashAndContext,
      getMinimumBalanceForRentExemption: stakingMocks.getMinimumBalanceForRentExemption,
      confirmTransaction: stakingMocks.confirmTransaction,
      getSignatureStatuses: stakingMocks.getSignatureStatuses,
      sendRawTransaction: stakingMocks.sendRawTransaction,
      simulateTransaction: stakingMocks.simulateTransaction,
    };

    getCurrentProgramId = vi.fn(() => 'reward-program');
    stakeAndCreateEntries = stakingMocks.stakeAndCreateEntries;
    prepareStakeAndCreateEntriesInstructions = stakingMocks.prepareStakeAndCreateEntriesInstructions;
    prepareUnstakeAndClaimInstructions = stakingMocks.prepareUnstakeAndClaimInstructions;
    prepareUnstakeInstructions = stakingMocks.prepareUnstakeInstructions;
    prepareClaimRewardsInstructions = stakingMocks.prepareClaimRewardsInstructions;
    prepareCreateRewardEntryInstructions = stakingMocks.prepareCreateRewardEntryInstructions;
    claimRewards = stakingMocks.claimRewards;
    createRewardEntry = stakingMocks.createRewardEntry;
    programs = {
      rewardPoolDynamicProgram: {
        account: {
          rewardPool: { all: stakingMocks.rewardPoolAll },
          rewardEntry: {
            fetchNullable: stakingMocks.rewardEntryFetchNullable,
            all: stakingMocks.rewardEntryAll,
            size: 96,
          },
        },
      },
    };
  },
  deriveRewardPoolPDA: stakingMocks.deriveRewardPoolPDA,
  deriveRewardEntryPDA: vi.fn(() => 'reward-entry'),
  deriveStakeMintPDA: stakingMocks.deriveStakeMintPDA,
  deriveStakeEntryPDA: vi.fn(() => ({
    equals: () => true,
  })),
}));

const HATCHER_MINT_PK = new PublicKey(HATCH_TOKEN_MINT);
const STAKE_POOL_ADDRESS = '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH';

function hatcherRewardPool(params: {
  nonce: number;
  mint?: PublicKey;
  fundedAmount?: number;
  createdTs?: number;
}) {
  return {
    account: {
      nonce: params.nonce,
      mint: params.mint ?? HATCHER_MINT_PK,
      fundedAmount: params.fundedAmount ?? 0,
      createdTs: params.createdTs ?? 0,
    },
  };
}

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
    stakingMocks.getSignatureStatuses.mockClear();
    stakingMocks.sendRawTransaction.mockClear();
    stakingMocks.getMinimumBalanceForRentExemption.mockClear();
    stakingMocks.prepareClaimRewardsInstructions.mockClear();
    stakingMocks.prepareCreateRewardEntryInstructions.mockClear();
    stakingMocks.prepareStakeAndCreateEntriesInstructions.mockClear();
    stakingMocks.prepareUnstakeAndClaimInstructions.mockClear();
    stakingMocks.prepareUnstakeInstructions.mockClear();
    stakingMocks.rewardEntryFetchNullable.mockClear();
    stakingMocks.simulateTransaction.mockClear();
    stakingMocks.deriveRewardPoolPDA.mockClear();
    stakingMocks.rewardPoolAll.mockClear();
    stakingMocks.rewardEntryAll.mockClear();
    resetHatcherRewardPoolCache();
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
    stakingMocks.prepareCreateRewardEntryInstructions.mockResolvedValue({
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
    stakingMocks.getSignatureStatuses.mockResolvedValue({ value: [null] });
    stakingMocks.sendRawTransaction.mockResolvedValue('stake-tx');
    stakingMocks.getMinimumBalanceForRentExemption.mockResolvedValue(1_559_040);
    stakingMocks.rewardEntryFetchNullable.mockResolvedValue({ accountedAmount: { toString: () => '100' } });
    stakingMocks.simulateTransaction.mockResolvedValue({ value: { err: null } });
    stakingMocks.rewardPoolAll.mockResolvedValue([]);
    stakingMocks.rewardEntryAll.mockResolvedValue([]);
});

describe('streamflow staking rewards', () => {
  it('includes missing Streamflow receipt account setup in the staking transaction', async () => {
    const keypair = Keypair.generate();
    const stakeMint = Keypair.generate().publicKey;
    stakingMocks.deriveStakeMintPDA.mockReturnValueOnce(stakeMint);
    stakingMocks.getAccountInfo.mockResolvedValue(null);
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'sdk-stake-tx'),
    } as unknown as WalletContextState;
    const onTransactionSubmitted = vi.fn();

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
      onTransactionSubmitted,
    })).resolves.toEqual({ txId: 'sdk-stake-tx', setupIncluded: true });

    expect(stakingMocks.stakeAndCreateEntries).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    const [transaction] = (wallet.sendTransaction as ReturnType<typeof vi.fn>).mock.calls[0] as [VersionedTransaction];
    expect(transaction.message.compiledInstructions.length).toBeGreaterThanOrEqual(2);
    expect(stakingMocks.prepareStakeAndCreateEntriesInstructions).toHaveBeenCalled();
    expect(stakingMocks.simulateTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.objectContaining({ sigVerify: false }),
    );
    expect(onTransactionSubmitted).toHaveBeenCalledWith('sdk-stake-tx');
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('includes missing receipt account setup in the mobile staking transaction', async () => {
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
      sendTransaction: vi.fn(async () => 'sdk-stake-tx'),
    } as unknown as WalletContextState;
    const onTransactionSubmitted = vi.fn();

    await expect(stakeHatcherWithStreamflow({
      wallet,
      stakePoolAddress: '7BVxRYGoTJjr3bgvDhpJggJrnUhyYoGPbnxTRAWuDmtH',
      amountBaseUnits: 1_000_000n,
      durationDays: 7,
      onTransactionSubmitted,
    })).resolves.toEqual({ txId: 'sdk-stake-tx', setupIncluded: true });

    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    const [transaction] = (wallet.sendTransaction as ReturnType<typeof vi.fn>).mock.calls[0] as [VersionedTransaction];
    expect(transaction.message.compiledInstructions.length).toBeGreaterThanOrEqual(2);
    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(onTransactionSubmitted).toHaveBeenCalledWith('sdk-stake-tx');
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('stakes through the Streamflow SDK against the discovered reward pool nonce', async () => {
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    stakingMocks.rewardPoolAll.mockResolvedValue([
      hatcherRewardPool({ nonce: 3, fundedAmount: 10, createdTs: 50 }),
    ]);
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
          nonce: 3,
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

  it('does not fail a submitted stake when the RPC confirmation times out and signature status is confirmed', async () => {
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    stakingMocks.confirmTransaction.mockRejectedValueOnce(new Error('Solana RPC upstream timed out'));
    stakingMocks.getSignatureStatuses.mockResolvedValueOnce({
      value: [{ confirmationStatus: 'confirmed', err: null }],
    });
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
    })).resolves.toEqual({ txId: 'sdk-stake-tx' });

    expect(stakingMocks.getSignatureStatuses).toHaveBeenCalledWith(['sdk-stake-tx']);
  });

  it('keeps a submitted stake pending when post-submit RPC status lookup is inconclusive', async () => {
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    stakingMocks.confirmTransaction.mockRejectedValueOnce(new Error('Solana RPC upstream timed out'));
    stakingMocks.getSignatureStatuses.mockRejectedValueOnce(new Error('Solana RPC upstream timed out'));
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
    })).resolves.toEqual({ txId: 'sdk-stake-tx' });
  });

  it('still fails a submitted stake when RPC reports an on-chain transaction error', async () => {
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    stakingMocks.confirmTransaction.mockRejectedValueOnce(new Error('Solana RPC upstream timed out'));
    stakingMocks.getSignatureStatuses.mockResolvedValueOnce({
      value: [{ confirmationStatus: 'confirmed', err: { InstructionError: [0, 'Custom'] } }],
    });
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
    })).rejects.toThrow('Staking transaction failed after broadcast');
  });

  it('unstakes an unlocked Streamflow stake through wallet sendTransaction', async () => {
    const walletKeypair = Keypair.generate();
    const tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    stakingMocks.getAccountInfo.mockResolvedValue({
      owner: tokenProgramId,
    });
    stakingMocks.rewardPoolAll.mockResolvedValue([
      hatcherRewardPool({ nonce: 3, fundedAmount: 10, createdTs: 50 }),
    ]);
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
          governor: null,
          mint: expect.any(PublicKey),
          nonce: 3,
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

  it('falls back to unstake-only when unstake-and-claim fails preflight after rewards were claimed', async () => {
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
    })).resolves.toEqual({ txId: 'unstake-only-tx', rewardsIncluded: false });

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
    expect(stakingMocks.prepareCreateRewardEntryInstructions).not.toHaveBeenCalled();
    expect(stakingMocks.claimRewards).not.toHaveBeenCalled();
    expect(stakingMocks.prepareClaimRewardsInstructions).toHaveBeenCalledTimes(2);
    const claimCalls = stakingMocks.prepareClaimRewardsInstructions.mock.calls as unknown as Array<[Record<string, unknown>]>;
    for (const [claimArgs] of claimCalls) {
      expect(claimArgs).toEqual(expect.objectContaining({
        governor: null,
        rewardPoolNonce: 0,
        rewardPoolType: 'dynamic',
      }));
    }
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
    expect(stakingMocks.prepareCreateRewardEntryInstructions).not.toHaveBeenCalled();
    expect(stakingMocks.claimRewards).not.toHaveBeenCalled();
  });

  it('stops before submitting a claim transaction when no HATCHER rewards are available', async () => {
    stakingMocks.simulateTransaction.mockResolvedValueOnce({
      value: {
        err: { InstructionError: [0, { Custom: 6013 }] },
        logs: ['Program log: Error Code: RewardPoolDrained.'],
      },
    });

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

  it('threads a discovered reward pool nonce through claim preparation', async () => {
    stakingMocks.rewardPoolAll.mockResolvedValue([
      hatcherRewardPool({ nonce: 3, fundedAmount: 10, createdTs: 50 }),
    ]);
    const owner = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');
    const wallet = {
      publicKey: owner,
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'claim-tx'),
    } as unknown as WalletContextState;

    await expect(claimHatcherRewardsWithStreamflow({
      wallet,
      stakePoolAddress: STAKE_POOL_ADDRESS,
      stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
      depositNonce: 123,
    })).resolves.toEqual({ txIds: ['claim-tx'] });

    expect(stakingMocks.rewardPoolAll).toHaveBeenCalledTimes(1);
    expect(stakingMocks.deriveRewardPoolPDA).toHaveBeenCalledWith(
      'reward-program',
      expect.anything(),
      expect.anything(),
      3,
    );
    const claimCalls = stakingMocks.prepareClaimRewardsInstructions.mock.calls as unknown as Array<[Record<string, unknown>]>;
    expect(claimCalls.length).toBe(2);
    for (const [claimArgs] of claimCalls) {
      expect(claimArgs).toEqual(expect.objectContaining({ rewardPoolNonce: 3 }));
    }
  });

  it('surfaces claim-check failures instead of reporting zero rewards', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stakingMocks.simulateTransaction.mockResolvedValueOnce({
      value: {
        err: { InstructionError: [0, { Custom: 6001 }] },
        logs: ['Program log: Error Code: Unauthorized.'],
      },
    });
    const owner = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs');
    const wallet = {
      publicKey: owner,
      signTransaction: vi.fn(),
    } as unknown as WalletContextState;

    await expect(claimHatcherRewardsWithStreamflow({
      wallet,
      stakePoolAddress: STAKE_POOL_ADDRESS,
      stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
      depositNonce: 123,
    })).rejects.toThrow(/check failed/i);

    expect(stakingMocks.claimRewards).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('hatcher reward entry initialization', () => {
  const initParams = {
    stakePoolAddress: STAKE_POOL_ADDRESS,
    stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
    depositNonce: 123,
  };

  function initWallet(): WalletContextState {
    return {
      publicKey: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs'),
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'init-entry-tx'),
    } as unknown as WalletContextState;
  }

  it('creates the missing reward entry with the discovered reward pool nonce', async () => {
    stakingMocks.rewardPoolAll.mockResolvedValue([
      hatcherRewardPool({ nonce: 3, fundedAmount: 10, createdTs: 50 }),
    ]);
    stakingMocks.rewardEntryFetchNullable.mockResolvedValueOnce(null);
    const wallet = initWallet();

    await expect(initializeHatcherRewardEntry({ wallet, ...initParams }))
      .resolves.toEqual({ txId: 'init-entry-tx' });

    // The nonce-sensitive PDA derivation and the create call must both see the DISCOVERED nonce.
    expect(stakingMocks.deriveRewardPoolPDA).toHaveBeenCalledWith(
      'reward-program',
      expect.anything(),
      expect.anything(),
      3,
    );
    expect(stakingMocks.prepareCreateRewardEntryInstructions).toHaveBeenCalledTimes(1);
    expect(stakingMocks.prepareCreateRewardEntryInstructions).toHaveBeenCalledWith(
      expect.objectContaining({
        depositNonce: 123,
        rewardPoolNonce: 3,
        rewardPoolType: 'dynamic',
        rewardMint: expect.any(PublicKey),
        stakePool: expect.any(PublicKey),
        stakePoolMint: expect.any(PublicKey),
        tokenProgramId: expect.any(PublicKey),
      }),
      { invoker: wallet },
    );
    expect(stakingMocks.createRewardEntry).not.toHaveBeenCalled();
    expect(stakingMocks.claimRewards).not.toHaveBeenCalled();
    expect(stakingMocks.prepareClaimRewardsInstructions).not.toHaveBeenCalled();
    expect(stakingMocks.simulateTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.objectContaining({ sigVerify: false }),
    );
    expect(wallet.sendTransaction).toHaveBeenCalledWith(
      expect.any(VersionedTransaction),
      expect.anything(),
      expect.objectContaining({ preflightCommitment: 'confirmed' }),
    );
    expect(stakingMocks.sendRawTransaction).not.toHaveBeenCalled();
  });

  it('refuses to initialize when the reward entry already exists', async () => {
    // Default mocks: reward entry fetch resolves and the claim simulation succeeds (claimable).
    const wallet = initWallet();

    await expect(initializeHatcherRewardEntry({ wallet, ...initParams }))
      .rejects.toThrow('already initialized');

    expect(stakingMocks.prepareCreateRewardEntryInstructions).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it('propagates instruction preparation failures', async () => {
    stakingMocks.rewardEntryFetchNullable.mockResolvedValueOnce(null);
    stakingMocks.prepareCreateRewardEntryInstructions.mockRejectedValueOnce(new Error('create ix failed'));
    const wallet = initWallet();

    await expect(initializeHatcherRewardEntry({ wallet, ...initParams }))
      .rejects.toThrow('create ix failed');

    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it('fails closed when the create transaction fails preflight', async () => {
    stakingMocks.rewardEntryFetchNullable.mockResolvedValueOnce(null);
    stakingMocks.simulateTransaction.mockResolvedValueOnce({
      value: { err: { InstructionError: [0, 'Custom'] } },
    });
    const wallet = initWallet();

    await expect(initializeHatcherRewardEntry({ wallet, ...initParams }))
      .rejects.toThrow('failed preflight simulation');

    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });
});

describe('hatcher reward entry rent', () => {
  it('derives the rent-exempt deposit from the SDK reward entry account size', async () => {
    await expect(fetchHatcherRewardEntryRentLamports()).resolves.toBe(1_559_040);
    expect(stakingMocks.getMinimumBalanceForRentExemption).toHaveBeenCalledWith(96);
  });
});

describe('hatcher reward pool discovery', () => {
  const stakePool = new PublicKey(STAKE_POOL_ADDRESS);

  function discoveryClient(): SolanaStakingClient {
    return new SolanaStakingClient({ clusterUrl: 'http://localhost:8899' });
  }

  it('discovers the HATCHER reward pool nonce and ignores other mints', async () => {
    stakingMocks.rewardPoolAll.mockResolvedValue([
      hatcherRewardPool({ nonce: 7, mint: Keypair.generate().publicKey, fundedAmount: 99, createdTs: 999 }),
      hatcherRewardPool({ nonce: 2, fundedAmount: 5, createdTs: 10 }),
    ]);

    await expect(resolveHatcherRewardPool(discoveryClient(), stakePool)).resolves.toEqual({
      nonce: 2,
      source: 'discovered',
    });
    expect(stakingMocks.rewardPoolAll).toHaveBeenCalledWith([
      { memcmp: { offset: 10, bytes: stakePool.toBase58() } },
    ]);
  });

  it('falls back to nonce 0 when no HATCHER reward pool is found', async () => {
    await expect(resolveHatcherRewardPool(discoveryClient(), stakePool)).resolves.toEqual({
      nonce: 0,
      source: 'fallback',
    });
  });

  it('prefers the funded, most recently created pool when multiple exist', async () => {
    stakingMocks.rewardPoolAll.mockResolvedValue([
      hatcherRewardPool({ nonce: 1, fundedAmount: 10, createdTs: 50 }),
      hatcherRewardPool({ nonce: 2, fundedAmount: 0, createdTs: 99 }),
      hatcherRewardPool({ nonce: 3, fundedAmount: 10, createdTs: 80 }),
    ]);

    await expect(resolveHatcherRewardPool(discoveryClient(), stakePool)).resolves.toEqual({
      nonce: 3,
      source: 'discovered',
    });
  });

  it('falls back to nonce 0 and warns when discovery fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stakingMocks.rewardPoolAll.mockRejectedValueOnce(new Error('getProgramAccounts unavailable'));

    await expect(resolveHatcherRewardPool(discoveryClient(), stakePool)).resolves.toEqual({
      nonce: 0,
      source: 'fallback',
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('caches discovery per stake pool until the cache is reset', async () => {
    stakingMocks.rewardPoolAll.mockResolvedValue([
      hatcherRewardPool({ nonce: 4, fundedAmount: 1, createdTs: 1 }),
    ]);
    const client = discoveryClient();

    await resolveHatcherRewardPool(client, stakePool);
    await resolveHatcherRewardPool(client, stakePool);
    expect(stakingMocks.rewardPoolAll).toHaveBeenCalledTimes(1);

    resetHatcherRewardPoolCache();
    await resolveHatcherRewardPool(client, stakePool);
    expect(stakingMocks.rewardPoolAll).toHaveBeenCalledTimes(2);
  });
});

describe('hatcher reward status diagnostics', () => {
  const statusParams = {
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs',
    stakePoolAddress: STAKE_POOL_ADDRESS,
    stakeEntryAddress: '3zS6NsWw2f6Fj9nJmxrnE5EepLqghdQgkvZpg6gTYQbQ',
    depositNonce: 123,
  };

  it('reports claimable when the claim simulation succeeds', async () => {
    await expect(fetchHatcherRewardStatusWithStreamflow(statusParams)).resolves.toEqual({
      canClaim: true,
      rewardEntryExists: true,
      kind: 'claimable',
      reason: null,
    });
  });

  it('keeps the no-rewards copy for recognized nothing-to-claim program errors', async () => {
    stakingMocks.simulateTransaction.mockResolvedValueOnce({
      value: {
        err: { InstructionError: [0, { Custom: 6013 }] },
        logs: ['Program log: Error Code: RewardPoolDrained.'],
      },
    });

    await expect(fetchHatcherRewardStatusWithStreamflow(statusParams)).resolves.toEqual({
      canClaim: false,
      rewardEntryExists: true,
      kind: 'no_rewards',
      reason: 'No HATCHER rewards are available to claim yet.',
    });
  });

  it('reports simulation_error with diagnostics for unrecognized simulation failures', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stakingMocks.simulateTransaction.mockResolvedValueOnce({
      value: {
        err: { InstructionError: [0, { Custom: 6001 }] },
        logs: ['Program log: something', 'Program log: Error Code: Unauthorized boom.'],
      },
    });

    const status = await fetchHatcherRewardStatusWithStreamflow(statusParams);
    expect(status).toMatchObject({
      canClaim: false,
      rewardEntryExists: true,
      kind: 'simulation_error',
    });
    expect(status.reason).not.toBe('No HATCHER rewards are available to claim yet.');
    expect(status.detail).toContain('6001');
    expect(status.detail).toContain('Unauthorized boom');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reports rpc_error when the claim simulation request itself fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stakingMocks.simulateTransaction.mockRejectedValueOnce(new Error('429 Too Many Requests'));

    const status = await fetchHatcherRewardStatusWithStreamflow(statusParams);
    expect(status).toMatchObject({
      canClaim: false,
      rewardEntryExists: true,
      kind: 'rpc_error',
    });
    expect(status.detail).toContain('429');
    warn.mockRestore();
  });

  it('reports entry_missing when no reward entry exists anywhere for the stake', async () => {
    stakingMocks.rewardEntryFetchNullable.mockResolvedValueOnce(null);
    stakingMocks.rewardEntryAll.mockResolvedValueOnce([]);

    await expect(fetchHatcherRewardStatusWithStreamflow(statusParams)).resolves.toEqual({
      canClaim: false,
      rewardEntryExists: false,
      kind: 'entry_missing',
      reason: 'Reward tracking account is missing for this stake.',
    });
    expect(stakingMocks.rewardEntryAll).toHaveBeenCalledWith([
      { memcmp: { offset: 40, bytes: statusParams.stakeEntryAddress } },
    ]);
  });

  it('detects reward pool drift and invalidates the discovery cache', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stakingMocks.rewardEntryFetchNullable.mockResolvedValue(null);
    stakingMocks.rewardEntryAll.mockResolvedValue([
      { account: { rewardPool: 'reward-pool-9', stakeEntry: statusParams.stakeEntryAddress } },
    ]);

    const status = await fetchHatcherRewardStatusWithStreamflow(statusParams);
    expect(status).toMatchObject({
      canClaim: false,
      rewardEntryExists: false,
      kind: 'pool_missing',
    });
    expect(status.detail).toContain('reward-pool-9');
    expect(status.detail).toContain('reward-pool-0');
    expect(stakingMocks.rewardPoolAll).toHaveBeenCalledTimes(1);

    await fetchHatcherRewardStatusWithStreamflow(statusParams);
    expect(stakingMocks.rewardPoolAll).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('keeps entry_missing with a note when the reward entry search fails', async () => {
    stakingMocks.rewardEntryFetchNullable.mockResolvedValueOnce(null);
    stakingMocks.rewardEntryAll.mockRejectedValueOnce(new Error('search down'));

    const status = await fetchHatcherRewardStatusWithStreamflow(statusParams);
    expect(status).toMatchObject({
      canClaim: false,
      rewardEntryExists: false,
      kind: 'entry_missing',
      reason: 'Reward tracking account is missing for this stake.',
    });
    expect(status.detail).toContain('search down');
  });
});

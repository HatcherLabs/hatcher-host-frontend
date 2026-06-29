import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair } from '@solana/web3.js';
import type { SolanaRecurringAuthorization, SolanaRecurringQuote } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createSolanaRpc: vi.fn(),
  findSubscriptionAuthorityPda: vi.fn(),
  findRecurringDelegationPda: vi.fn(),
  getCloseSubscriptionAuthorityOverlayInstructionAsync: vi.fn(),
  getInitSubscriptionAuthorityOverlayInstructionAsync: vi.fn(),
  getCreateRecurringDelegationOverlayInstructionAsync: vi.fn(),
  getRevokeDelegationOverlayInstruction: vi.fn(),
  subscriptionsProgram: vi.fn(),
  createRecurringDelegation: vi.fn(),
}));

vi.mock('@solana/kit', () => ({
  AccountRole: {
    READONLY: 0,
    WRITABLE: 1,
    READONLY_SIGNER: 2,
    WRITABLE_SIGNER: 3,
  },
  address: (value: string) => value,
  createClient: mocks.createClient,
  createSolanaRpc: mocks.createSolanaRpc,
}));

vi.mock('@solana/subscriptions', () => ({
  findSubscriptionAuthorityPda: mocks.findSubscriptionAuthorityPda,
  findRecurringDelegationPda: mocks.findRecurringDelegationPda,
  getCloseSubscriptionAuthorityOverlayInstructionAsync: mocks.getCloseSubscriptionAuthorityOverlayInstructionAsync,
  getInitSubscriptionAuthorityOverlayInstructionAsync: mocks.getInitSubscriptionAuthorityOverlayInstructionAsync,
  getCreateRecurringDelegationOverlayInstructionAsync: mocks.getCreateRecurringDelegationOverlayInstructionAsync,
  getRevokeDelegationOverlayInstruction: mocks.getRevokeDelegationOverlayInstruction,
  subscriptionsProgram: mocks.subscriptionsProgram,
}));

import { api } from '@/lib/api/methods';
import {
  buildSolanaRecurringCancelPlan,
  cancelSolanaRecurringAuthorizationOnChain,
  buildSolanaRecurringSetupPlan,
  recurringWalletProofMessage,
  setupSolanaRecurringAuthorization,
} from '@/lib/solana-recurring-payments';

function quote(owner: string, delegatee: string): SolanaRecurringQuote {
  return {
    target: { kind: 'addon', key: 'addon.ai_credits.5000', billingPeriod: 'monthly' },
    featureKey: 'addon.ai_credits.5000',
    description: 'Monthly 5,000 AI Credits',
    amountUsd: 7,
    asset: {
      asset: 'usdc',
      symbol: 'USDC',
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      decimals: 6,
      stableUsd: true,
      requiresWrappedBalance: false,
    },
    amountPerPeriodBaseUnits: '7000000',
    amountPerPeriodHuman: 7,
    periodSeconds: 2_592_000,
    allowancePeriods: 12,
    startAt: '2026-06-03T00:00:00.000Z',
    expiresAt: '2027-06-03T00:00:00.000Z',
    delegateeWallet: delegatee,
    subscriptionsProgramId: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
    notes: ['USDC recurring billing charges the same dollar amount each month.'],
  };
}

function authorization(owner: string): SolanaRecurringAuthorization {
  return {
    id: 'recurring-1',
    userId: 'user-recurring',
    agentId: null,
    targetKind: 'addon',
    targetKey: 'addon.ai_credits.5000',
    billingPeriod: 'monthly',
    featureKey: 'addon.ai_credits.5000',
    asset: 'usdc',
    tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    amountUsd: 7,
    amountPerPeriod: 7,
    amountPerPeriodBaseUnits: '7000000',
    periodSeconds: 2_592_000,
    allowancePeriods: 12,
    ownerWallet: owner,
    tokenAccount: Keypair.generate().publicKey.toBase58(),
    delegateeWallet: Keypair.generate().publicKey.toBase58(),
    subscriptionAuthority: Keypair.generate().publicKey.toBase58(),
    delegationPda: Keypair.generate().publicKey.toBase58(),
    nonce: '7',
    authorityTxSignature: 'authority-signature',
    delegationTxSignature: 'delegation-signature',
    status: 'active',
    startAt: '2026-06-03T00:00:00.000Z',
    expiresAt: '2027-06-03T00:00:00.000Z',
    nextChargeAt: '2026-07-03T00:00:00.000Z',
    lastChargedAt: null,
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z',
  };
}

describe('Solana recurring setup helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const subscriptionAuthority = Keypair.generate().publicKey.toBase58();
    const delegationPda = Keypair.generate().publicKey.toBase58();
    mocks.findSubscriptionAuthorityPda.mockResolvedValue([subscriptionAuthority, 255]);
    mocks.findRecurringDelegationPda.mockResolvedValue([delegationPda, 254]);
    mocks.getInitSubscriptionAuthorityOverlayInstructionAsync.mockResolvedValue({
      programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
      accounts: [],
      data: new Uint8Array([1]),
    });
    mocks.getCreateRecurringDelegationOverlayInstructionAsync.mockResolvedValue({
      programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
      accounts: [],
      data: new Uint8Array([2]),
    });
    mocks.getRevokeDelegationOverlayInstruction.mockReturnValue({
      programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
      accounts: [],
      data: new Uint8Array([3]),
    });
    mocks.getCloseSubscriptionAuthorityOverlayInstructionAsync.mockResolvedValue({
      programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
      accounts: [],
      data: new Uint8Array([4]),
    });
    mocks.createRecurringDelegation.mockResolvedValue({
      programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
      accounts: [],
      data: new Uint8Array([2]),
    });
    mocks.createSolanaRpc.mockReturnValue({ __rpc: true });
    mocks.createClient.mockImplementation((value?: Record<string, unknown>) => ({
      ...(value ?? {}),
      use(plugin: (client: Record<string, unknown>) => Record<string, unknown>) {
        return plugin(this);
      },
    }));
    mocks.subscriptionsProgram.mockImplementation(() => (client: Record<string, unknown>) => ({
      ...client,
      subscriptions: {
        instructions: {
          createRecurringDelegation: mocks.createRecurringDelegation,
        },
      },
    }));
  });

  it('builds Subscription Authority and Recurring Delegation setup transactions from the server quote', async () => {
    const owner = Keypair.generate().publicKey;
    const tokenAccount = Keypair.generate().publicKey;
    const delegatee = Keypair.generate().publicKey.toBase58();
    const plan = await buildSolanaRecurringSetupPlan({
      owner,
      quote: quote(owner.toBase58(), delegatee),
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      tokenAccount,
      nonce: 7n,
    });

    expect(mocks.findSubscriptionAuthorityPda).toHaveBeenCalledWith({
      user: owner.toBase58(),
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    }, { programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44' });
    expect(mocks.findRecurringDelegationPda).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionAuthority: plan.recordInput.subscriptionAuthority,
      delegator: owner.toBase58(),
      delegatee,
      nonce: 7n,
    }), { programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44' });
    expect(mocks.createSolanaRpc).toHaveBeenCalledWith('https://api.mainnet-beta.solana.com');
    expect(mocks.getCreateRecurringDelegationOverlayInstructionAsync).not.toHaveBeenCalled();
    expect(mocks.createRecurringDelegation).toHaveBeenCalledWith(expect.objectContaining({
      amountPerPeriod: 7_000_000n,
      delegatee,
      nonce: 7n,
      periodLengthS: 2_592_000,
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    }));
    expect(plan.recordInput).toMatchObject({
      kind: 'addon',
      key: 'addon.ai_credits.5000',
      asset: 'usdc',
      ownerWallet: owner.toBase58(),
      tokenAccount: tokenAccount.toBase58(),
      amountPerPeriodBaseUnits: '7000000',
      amountPerPeriodHuman: 7,
      allowancePeriods: 12,
    });
    expect(recurringWalletProofMessage({ input: plan.recordInput, delegatee })).toContain('asset:usdc');
    expect(plan.authorityTransaction.instructions).toHaveLength(1);
    expect(plan.delegationTransaction.instructions).toHaveLength(1);
  });

  it('builds the recurring delegation only after the authority transaction is confirmed', async () => {
    const owner = Keypair.generate().publicKey;
    const tokenAccount = Keypair.generate().publicKey;
    const delegatee = Keypair.generate().publicKey.toBase58();
    let authorityConfirmed = false;
    mocks.createRecurringDelegation.mockImplementation(async () => {
      expect(authorityConfirmed).toBe(true);
      return {
        programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
        accounts: [],
        data: new Uint8Array([2]),
      };
    });
    const sendTransaction = vi.fn(async () => (
      sendTransaction.mock.calls.length === 1 ? 'authority-signature' : 'delegation-signature'
    ));
    const connection = {
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      getLatestBlockhash: vi.fn(async () => ({
        blockhash: '11111111111111111111111111111111',
        lastValidBlockHeight: 123,
      })),
      confirmTransaction: vi.fn(async (strategy: { signature: string }) => {
        if (strategy.signature === 'authority-signature') authorityConfirmed = true;
        return { value: { err: null } };
      }),
    };
    const wallet = {
      publicKey: owner,
      sendTransaction,
      signMessage: vi.fn(async () => new Uint8Array([9, 9, 9])),
    };

    const input = await setupSolanaRecurringAuthorization({
      wallet: wallet as never,
      connection: connection as never,
      quote: quote(owner.toBase58(), delegatee),
      tokenAccount,
    });

    expect(mocks.createRecurringDelegation).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledTimes(2);
    expect(input.authorityTxSignature).toBe('authority-signature');
    expect(input.delegationTxSignature).toBe('delegation-signature');
  });

  it('builds an on-chain cancel transaction that revokes the delegation, token approval, and authority', async () => {
    const owner = Keypair.generate().publicKey;
    const row = authorization(owner.toBase58());

    const plan = await buildSolanaRecurringCancelPlan({
      authorization: row,
      owner,
      subscriptionsProgramId: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
    });

    expect(mocks.getRevokeDelegationOverlayInstruction).toHaveBeenCalledWith(expect.objectContaining({
      authority: expect.objectContaining({ address: owner.toBase58() }),
      delegationAccount: row.delegationPda,
      receiver: owner.toBase58(),
      programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
    }));
    expect(mocks.getCloseSubscriptionAuthorityOverlayInstructionAsync).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ address: owner.toBase58() }),
      tokenMint: row.tokenMint,
      receiver: owner.toBase58(),
      programAddress: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
    }));
    expect(plan.revocationTransaction.instructions).toHaveLength(3);
    expect(plan.revocationTransaction.instructions[1]?.programId.toBase58()).toBe(row.tokenProgram);
  });

  it('sends the on-chain cancel transaction before returning the revocation signature', async () => {
    const owner = Keypair.generate().publicKey;
    const row = authorization(owner.toBase58());
    const wallet = {
      publicKey: owner,
      sendTransaction: vi.fn(async () => 'revocation-signature'),
    };
    const connection = {
      getLatestBlockhash: vi.fn(async () => ({
        blockhash: '11111111111111111111111111111111',
        lastValidBlockHeight: 123,
      })),
      confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
    };

    const signature = await cancelSolanaRecurringAuthorizationOnChain({
      authorization: row,
      wallet: wallet as never,
      connection: connection as never,
      subscriptionsProgramId: 'De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44',
    });

    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    expect(signature).toBe('revocation-signature');
  });
});

describe('Solana recurring API methods', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts recurring quote requests to the backend', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({ success: true, data: { ok: true } }),
      status: 200,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.getSolanaRecurringQuote({
      kind: 'addon',
      key: 'addon.ai_credits.5000',
      asset: 'usdc',
      allowancePeriods: 12,
    });

    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/payments/recurring/quote'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          kind: 'addon',
          key: 'addon.ai_credits.5000',
          asset: 'usdc',
          allowancePeriods: 12,
        }),
      }),
    );
  });

  it('posts recurring cancel requests to the backend', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({ success: true, data: { authorization: { id: 'recurring-1', status: 'cancelled' } } }),
      status: 200,
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.cancelSolanaRecurringAuthorization('recurring-1', {
      revocationTxSignature: 'revocation-signature',
    });

    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/payments/recurring/recurring-1/cancel'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          revocationTxSignature: 'revocation-signature',
        }),
      }),
    );
  });
});

import { describe, expect, it, vi } from 'vitest';
import { Connection, Keypair, PublicKey, SystemInstruction, Transaction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { payWithSol, payWithSplToken, validateSolanaPaymentQuote } from '@/lib/solana-payments';
import type { SolanaPaymentQuote, SolanaPaymentToken } from '@/lib/api/types';
import {
  ANSEM_TOKEN_MINT,
  HATCH_TOKEN_MINT,
  KAUSA_TOKEN_MINT,
  TREASURY_WALLET,
  USDC_TOKEN_MINT,
} from '@/lib/config';

const MINTS: Record<Exclude<SolanaPaymentToken, 'sol'>, string> = {
  usdc: USDC_TOKEN_MINT,
  hatch: HATCH_TOKEN_MINT,
  kausa: KAUSA_TOKEN_MINT,
  ansem: ANSEM_TOKEN_MINT,
};

function serverQuote(
  payerWallet: string,
  paymentToken: SolanaPaymentToken,
  overrides: Partial<SolanaPaymentQuote> = {},
): SolanaPaymentQuote {
  return {
    payerWallet,
    recipientWallet: TREASURY_WALLET,
    tokenMint: paymentToken === 'sol' ? null : MINTS[paymentToken],
    paymentToken,
    amountUsd: 10,
    expectedAmount: 10,
    minAcceptable: 9.5,
    memo: 'hatcher-payment:intent-123',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

function mockWallet(signature: string, calls: string[]): WalletContextState {
  return {
    publicKey: Keypair.generate().publicKey,
    sendTransaction: vi.fn(async () => {
      calls.push('send');
      return signature;
    }),
  } as unknown as WalletContextState;
}

function mockSigningWallet(calls: string[]): { wallet: WalletContextState; keypair: Keypair } {
  const keypair = Keypair.generate();
  return {
    keypair,
    wallet: {
      publicKey: keypair.publicKey,
      sendTransaction: vi.fn(async () => {
        calls.push('wallet-send');
        return 'wallet-send-signature';
      }),
      signTransaction: vi.fn(async (tx) => {
        calls.push('sign');
        tx.partialSign(keypair);
        return tx;
      }),
    } as unknown as WalletContextState,
  };
}

function mockConnection(calls: string[], tokenBalance = '1000000000000000'): Connection {
  return {
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: '11111111111111111111111111111111',
      lastValidBlockHeight: 123,
    })),
    getAccountInfo: vi.fn(async () => ({})),
    getTokenAccountBalance: vi.fn(async () => ({ value: { amount: tokenBalance } })),
    getParsedTokenAccountsByOwner: vi.fn(async () => ({ value: [] })),
    sendRawTransaction: vi.fn(async () => {
      calls.push('broadcast');
      return 'raw-signature-123';
    }),
    confirmTransaction: vi.fn(async () => {
      calls.push('confirm');
      throw new Error('confirmation expired after broadcast');
    }),
  } as unknown as Connection;
}

describe('Solana payment helpers', () => {
  it('rejects substituted payer, token, or expired server quotes', () => {
    const payer = Keypair.generate().publicKey.toBase58();
    const otherPayer = Keypair.generate().publicKey.toBase58();
    expect(() => validateSolanaPaymentQuote(serverQuote(payer, 'sol'), 'sol', otherPayer)).toThrow('different payer');
    expect(() => validateSolanaPaymentQuote(serverQuote(payer, 'usdc'), 'hatch', payer)).toThrow('unexpected token');
    expect(() => validateSolanaPaymentQuote(
      serverQuote(payer, 'sol', { expiresAt: new Date(Date.now() - 1).toISOString() }),
      'sol',
      payer,
    )).toThrow('expired');
  });

  it('uses the exact SOL amount and recipient from the server quote', async () => {
    const calls: string[] = [];
    const payer = Keypair.generate();
    const recipient = Keypair.generate().publicKey;
    const transfers: Array<ReturnType<typeof SystemInstruction.decodeTransfer>> = [];
    const wallet = {
      publicKey: payer.publicKey,
      sendTransaction: vi.fn(async (transaction: Transaction) => {
        transfers.push(SystemInstruction.decodeTransfer(transaction.instructions[0]));
        calls.push('send');
        return 'exact-sol-signature';
      }),
    } as unknown as WalletContextState;

    await expect(payWithSol({
      wallet,
      connection: mockConnection(calls),
      quote: serverQuote(payer.publicKey.toBase58(), 'sol', {
        recipientWallet: recipient.toBase58(),
        expectedAmount: 0.123456789,
        minAcceptable: 0.12,
      }),
    })).rejects.toThrow('confirmation expired after broadcast');

    expect(transfers[0].toPubkey.toBase58()).toBe(recipient.toBase58());
    expect(transfers[0].lamports).toBe(123_456_789n);
  });

  it('uses wallet signing plus app RPC broadcast when signTransaction is available', async () => {
    const calls: string[] = [];
    const { wallet, keypair } = mockSigningWallet(calls);
    const connection = mockConnection(calls);

    await expect(
      payWithSol({
        wallet,
        connection,
        quote: serverQuote(keypair.publicKey.toBase58(), 'sol', { expectedAmount: 0.1, minAcceptable: 0.095 }),
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    expect(wallet.signTransaction).toHaveBeenCalled();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).toHaveBeenCalled();
    expect(calls).toEqual(['sign', 'broadcast', 'signature:raw-signature-123', 'confirm']);
  });

  it('emits the SOL signature before confirmation can fail', async () => {
    const calls: string[] = [];
    const signature = 'sol-signature-123';

    const wallet = mockWallet(signature, calls);
    await expect(
      payWithSol({
        wallet,
        connection: mockConnection(calls),
        quote: serverQuote(wallet.publicKey!.toBase58(), 'sol', { expectedAmount: 0.1, minAcceptable: 0.095 }),
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    expect(calls).toEqual(['send', `signature:${signature}`, 'confirm']);
  });

  it('adds the server-issued payment intent memo to the transaction', async () => {
    const calls: string[] = [];
    let memo: string | null = null;
    const wallet = {
      publicKey: Keypair.generate().publicKey,
      sendTransaction: vi.fn(async (transaction: Transaction) => {
        const memoInstruction = transaction.instructions.find((instruction) => (
          instruction.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
        ));
        memo = memoInstruction?.data.toString('utf8') ?? null;
        calls.push('send');
        return 'memo-signature';
      }),
    } as unknown as WalletContextState;

    await expect(payWithSol({
      wallet,
      connection: mockConnection(calls),
      quote: serverQuote(wallet.publicKey!.toBase58(), 'sol'),
    })).rejects.toThrow('confirmation expired after broadcast');

    expect(memo).toBe('hatcher-payment:intent-123');
  });

  it('emits the SPL signature before confirmation can fail', async () => {
    const calls: string[] = [];
    const signature = 'spl-signature-456';
    const wallet = mockWallet(signature, calls);

    await expect(
      payWithSplToken({
        wallet,
        connection: mockConnection(calls),
        mint: 'hatch',
        quote: serverQuote(wallet.publicKey!.toBase58(), 'hatch'),
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    expect(calls).toEqual(['send', `signature:${signature}`, 'confirm']);
  });

  it('fails before wallet signing when SPL balance is too low', async () => {
    const calls: string[] = [];
    const wallet = mockWallet('not-sent', calls);

    await expect(
      payWithSplToken({
        wallet,
        connection: mockConnection(calls, '123'),
        mint: 'usdc',
        quote: serverQuote(wallet.publicKey!.toBase58(), 'usdc'),
      }),
    ).rejects.toThrow('Insufficient USDC balance');

    expect(calls).toEqual([]);
  });

  it('can pay from a non-ATA token account when it holds the balance', async () => {
    const calls: string[] = [];
    const signature = 'non-ata-signature-789';
    const source = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const wallet = {
      publicKey: owner,
      sendTransaction: vi.fn(async () => {
        calls.push('send');
        return signature;
      }),
    } as unknown as WalletContextState;
    const connection = {
      ...mockConnection(calls, '0'),
      getParsedTokenAccountsByOwner: vi.fn(async () => ({
        value: [{
          pubkey: source,
          account: {
            data: {
              parsed: {
                info: {
                  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  owner: owner.toBase58(),
                  tokenAmount: { amount: '10000000' },
                },
              },
            },
          },
        }],
      })),
    } as unknown as Connection;

    await expect(
      payWithSplToken({
        wallet,
        connection,
        mint: 'usdc',
        quote: serverQuote(owner.toBase58(), 'usdc'),
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    expect(connection.getParsedTokenAccountsByOwner).toHaveBeenCalledWith(
      owner,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') },
      'confirmed',
    );
    expect(calls).toEqual(['send', `signature:${signature}`, 'confirm']);
  });

  it('uses Token-2022 accounts for KAUSA payments', async () => {
    const calls: string[] = [];
    const signature = 'kausa-signature-789';
    const source = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const wallet = {
      publicKey: owner,
      sendTransaction: vi.fn(async () => {
        calls.push('send');
        return signature;
      }),
    } as unknown as WalletContextState;
    const connection = {
      ...mockConnection(calls, '0'),
      getParsedTokenAccountsByOwner: vi.fn(async () => ({
        value: [{
          pubkey: source,
          account: {
            data: {
              parsed: {
                info: {
                  mint: 'BWXSNRBKMviG68MqavyssnzDq4qSArcN7eNYjqEfpump',
                  owner: owner.toBase58(),
                  tokenAmount: { amount: '10000000' },
                },
              },
            },
          },
        }],
      })),
    } as unknown as Connection;

    await expect(
      payWithSplToken({
        wallet,
        connection,
        mint: 'kausa',
        quote: serverQuote(owner.toBase58(), 'kausa'),
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    expect(connection.getParsedTokenAccountsByOwner).toHaveBeenCalledWith(
      owner,
      { programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') },
      'confirmed',
    );
    expect(calls).toEqual(['send', `signature:${signature}`, 'confirm']);
  });

  it('uses Token-2022 and burns 10% for ANSEM payments', async () => {
    const calls: string[] = [];
    const signature = 'ansem-signature-789';
    const sentTransactions: Array<{ instructions: Array<{ programId: PublicKey; data: Buffer }> }> = [];
    const owner = Keypair.generate().publicKey;
    const wallet = {
      publicKey: owner,
      sendTransaction: vi.fn(async (tx) => {
        sentTransactions.push(tx as { instructions: Array<{ programId: PublicKey; data: Buffer }> });
        calls.push('send');
        return signature;
      }),
    } as unknown as WalletContextState;
    const connection = mockConnection(calls, '100000000');

    await expect(
      payWithSplToken({
        wallet,
        connection,
        mint: 'ansem',
        quote: serverQuote(owner.toBase58(), 'ansem'),
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    const token2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    expect(sentTransactions).toHaveLength(1);
    expect(sentTransactions[0].instructions).toHaveLength(3);
    expect(sentTransactions[0].instructions[0].programId.equals(token2022)).toBe(true);
    expect(sentTransactions[0].instructions[1].programId.equals(token2022)).toBe(true);
    expect(sentTransactions[0].instructions[0].data[0]).toBe(3);
    expect(sentTransactions[0].instructions[0].data.readBigUInt64LE(1)).toBe(9_000_000n);
    expect(sentTransactions[0].instructions[1].data[0]).toBe(8);
    expect(sentTransactions[0].instructions[1].data.readBigUInt64LE(1)).toBe(1_000_000n);
    expect(sentTransactions[0].instructions[2].programId.toBase58()).toBe('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    expect(calls).toEqual(['send', `signature:${signature}`, 'confirm']);
  });
});

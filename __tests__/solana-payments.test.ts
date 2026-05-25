import { describe, expect, it, vi } from 'vitest';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { payWithSol, payWithSplToken, quoteSolForUsd } from '@/lib/solana-payments';

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
  it('uses wallet signing plus app RPC broadcast when signTransaction is available', async () => {
    const calls: string[] = [];
    const { wallet } = mockSigningWallet(calls);
    const connection = mockConnection(calls);

    await expect(
      payWithSol({
        wallet,
        connection,
        quote: quoteSolForUsd(10, 100),
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

    await expect(
      payWithSol({
        wallet: mockWallet(signature, calls),
        connection: mockConnection(calls),
        quote: quoteSolForUsd(10, 100),
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    expect(calls).toEqual(['send', `signature:${signature}`, 'confirm']);
  });

  it('emits the SPL signature before confirmation can fail', async () => {
    const calls: string[] = [];
    const signature = 'spl-signature-456';

    await expect(
      payWithSplToken({
        wallet: mockWallet(signature, calls),
        connection: mockConnection(calls),
        mint: 'hatch',
        amountHuman: 10,
        onSignature: (value) => calls.push(`signature:${value}`),
      }),
    ).rejects.toThrow('confirmation expired after broadcast');

    expect(calls).toEqual(['send', `signature:${signature}`, 'confirm']);
  });

  it('fails before wallet signing when SPL balance is too low', async () => {
    const calls: string[] = [];

    await expect(
      payWithSplToken({
        wallet: mockWallet('not-sent', calls),
        connection: mockConnection(calls, '123'),
        mint: 'usdc',
        amountHuman: 10,
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
        amountHuman: 10,
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
        amountHuman: 10,
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
});

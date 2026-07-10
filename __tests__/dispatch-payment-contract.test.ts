import { afterEach, describe, expect, it, vi } from 'vitest';
import { Keypair } from '@solana/web3.js';
import {
  DispatchSkinClaimableError,
  claimPaidSkinCnft,
  createSkinPaymentIntent,
  fetchDispatchSkinCnfts,
  purchaseSkinCnft,
} from '@/lib/agent-dispatch/leaderboard';

afterEach(() => vi.unstubAllGlobals());

describe('Dispatch premium skin payment contract', () => {
  it('issues a payer-bound intent before the wallet transfer', async () => {
    const payerWallet = Keypair.generate().publicKey.toBase58();
    const recipientWallet = Keypair.generate().publicKey.toBase58();
    const tokenMint = Keypair.generate().publicKey.toBase58();
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify({
      success: true,
      data: {
        intentId: 'spi_dispatch_1',
        memo: 'hatcher-payment:spi_dispatch_1',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        payerWallet,
        recipientWallet,
        tokenMint,
        featureKey: 'dispatch_skin_singularity',
        amountUsd: 10,
        expectedAmount: 500,
        minAcceptable: 475,
        paymentToken: 'hatch',
        target: { kind: 'dispatch_skin', key: 'singularity' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createSkinPaymentIntent('singularity', payerWallet);

    expect(result.expectedAmount).toBe(500);
    expect(result.recipientWallet).toBe(recipientWallet);
    expect(result.tokenMint).toBe(tokenMint);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/dispatch/skin/singularity/payment-intent'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ payerWallet }),
      }),
    );
  });

  it('binds settlement to the intent id before reporting success', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      data: { minted: false, retry: true, solscan: null },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(purchaseSkinCnft('singularity', 'tx-signature', 'spi_dispatch_1')).resolves.toEqual({
      minted: false,
      retry: true,
      solscan: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/dispatch/skin/singularity/purchase'),
      expect.objectContaining({
        body: JSON.stringify({
          txSignature: 'tx-signature',
          paymentIntentId: 'spi_dispatch_1',
        }),
      }),
    );
  });

  it('maps an already-paid intent response to the no-payment recovery path', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      success: false,
      error: 'This premium skin is already paid and awaiting mint. Retry the cNFT claim instead.',
      code: 'DISPATCH_SKIN_CLAIMABLE',
    }), { status: 409, headers: { 'content-type': 'application/json' } })));

    const error = await createSkinPaymentIntent('singularity', payerWalletForTest())
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DispatchSkinClaimableError);
  });

  it('reads claimable status and retries the cNFT claim without another payment', async () => {
    const payerWallet = payerWalletForTest();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          skins: [{ skinId: 'singularity', status: 'claimable', wallet: payerWallet, tx: null, solscan: null }],
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { minted: true, solscan: 'https://solscan.io/tx/mint' },
      }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDispatchSkinCnfts()).resolves.toEqual([
      { skinId: 'singularity', status: 'claimable', wallet: payerWallet, tx: null, solscan: null },
    ]);
    await expect(claimPaidSkinCnft('singularity', payerWallet)).resolves.toEqual({
      minted: true,
      solscan: 'https://solscan.io/tx/mint',
    });
    expect(fetchMock.mock.calls[1][0]).toContain('/dispatch/skin/singularity/claim');
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(JSON.stringify({ address: payerWallet }));
  });

  it('rejects settlement errors instead of granting local ownership', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      success: false,
      error: 'Payment verification failed',
    }), { status: 400, headers: { 'content-type': 'application/json' } })));

    await expect(purchaseSkinCnft('singularity', 'tx-signature', 'spi_dispatch_1'))
      .rejects.toThrow('Payment verification failed');
  });
});

function payerWalletForTest(): string {
  return Keypair.generate().publicKey.toBase58();
}

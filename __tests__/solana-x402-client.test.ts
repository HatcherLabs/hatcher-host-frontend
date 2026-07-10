import { afterEach, describe, expect, it, vi } from 'vitest';
import { Keypair } from '@solana/web3.js';
import {
  SOLANA_MAINNET_CAIP2,
  payWithSolanaX402,
  settleSolanaX402Payment,
  validateSolanaX402Requirements,
  type CheckoutResponse,
  type PaymentRequirementsRow,
} from '@/lib/solana-x402-client';

const payerWallet = Keypair.generate().publicKey.toBase58();
const recipientWallet = Keypair.generate().publicKey.toBase58();
const tokenMint = Keypair.generate().publicKey.toBase58();

function intent(overrides: Partial<CheckoutResponse> = {}): CheckoutResponse {
  return {
    x402Version: 1,
    accepts: [],
    paymentIntentId: 'spi_x402_123',
    memo: 'hatcher-payment:spi_x402_123',
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    payerWallet,
    recipientWallet,
    tokenMint,
    paymentToken: 'usdc',
    amountUsd: 12.5,
    expectedAmount: 12.5,
    minAcceptable: 11.875,
    ...overrides,
  };
}

function requirements(overrides: Partial<PaymentRequirementsRow> = {}): PaymentRequirementsRow {
  return {
    scheme: 'exact',
    network: SOLANA_MAINNET_CAIP2,
    payTo: recipientWallet,
    maxAmountRequired: '12500000',
    asset: tokenMint,
    description: 'Hatcher plan',
    mimeType: 'application/json',
    resource: '/payments/solana-x402/settle',
    maxTimeoutSeconds: 300,
    extra: { name: 'USDC', version: '1', decimals: 6 },
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('Solana x402 payment requirements', () => {
  it('accepts exact CAIP mainnet requirements bound to the server intent', () => {
    expect(validateSolanaX402Requirements(requirements(), intent(), payerWallet)).toEqual({
      amount: 12.5,
      network: SOLANA_MAINNET_CAIP2,
    });
  });

  it('rejects a substituted recipient, asset, network, payer, or quote amount', () => {
    expect(() => validateSolanaX402Requirements(requirements({ payTo: Keypair.generate().publicKey.toBase58() }), intent(), payerWallet)).toThrow();
    expect(() => validateSolanaX402Requirements(requirements({ asset: Keypair.generate().publicKey.toBase58() }), intent(), payerWallet)).toThrow();
    expect(() => validateSolanaX402Requirements(requirements({ network: 'solana-mainnet' }), intent(), payerWallet)).toThrow();
    expect(() => validateSolanaX402Requirements(requirements(), intent(), Keypair.generate().publicKey.toBase58())).toThrow();
    expect(() => validateSolanaX402Requirements(requirements(), intent({ expectedAmount: 12.49 }), payerWallet)).toThrow();
    expect(() => validateSolanaX402Requirements(requirements({ maxAmountRequired: '-1' }), intent(), payerWallet)).toThrow();
  });

  it('uses the validated CAIP network in recovery settlement headers', async () => {
    const decodedHeaders: Array<Record<string, unknown>> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      decodedHeaders.push(JSON.parse(Buffer.from(headers['x-payment'], 'base64').toString('utf8')) as Record<string, unknown>);
      return new Response(JSON.stringify({
        success: true,
        data: {
          paymentId: 'pay_1', featureId: null, txSignature: 'sig', amount: '12.5',
          payer: payerWallet, network: SOLANA_MAINNET_CAIP2, usd: 12.5,
          description: 'Hatcher plan', duplicate: false,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));

    await settleSolanaX402Payment(
      { kind: 'tier', key: 'starter', billingPeriod: 'monthly' },
      'sig',
      'spi_x402_123',
      SOLANA_MAINNET_CAIP2,
    );

    expect(decodedHeaders[0].network).toBe(SOLANA_MAINNET_CAIP2);
    expect(decodedHeaders[0].scheme).toBe('exact');
  });

  it('passes an intent-bound quote to the wallet sender', async () => {
    const checkout = intent();
    checkout.accepts = [requirements()];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: checkout }), {
        status: 402,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          paymentId: 'pay_2', featureId: null, txSignature: 'sig-2', amount: '12.5',
          payer: payerWallet, network: SOLANA_MAINNET_CAIP2, usd: 12.5,
          description: 'Hatcher plan', duplicate: false,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const sendUsdc = vi.fn(async () => 'sig-2');

    await payWithSolanaX402(
      { kind: 'tier', key: 'starter', billingPeriod: 'monthly' },
      payerWallet,
      sendUsdc,
    );

    expect(sendUsdc).toHaveBeenCalledWith(
      { ...checkout, intentId: checkout.paymentIntentId },
      'Hatcher plan',
      expect.objectContaining({ onSignature: expect.any(Function) }),
    );
    const settleInit = fetchMock.mock.calls[1][1] as RequestInit;
    const header = JSON.parse(Buffer.from(
      (settleInit.headers as Record<string, string>)['x-payment'],
      'base64',
    ).toString('utf8')) as { network: string };
    expect(header.network).toBe(SOLANA_MAINNET_CAIP2);
  });
});

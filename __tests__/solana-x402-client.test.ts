import { describe, expect, it } from 'vitest';
import { TREASURY_WALLET, USDC_TOKEN_MINT } from '@/lib/config';
import {
  validateSolanaX402Requirements,
  type PaymentRequirementsRow,
} from '@/lib/solana-x402-client';

function requirements(overrides: Partial<PaymentRequirementsRow> = {}): PaymentRequirementsRow {
  return {
    scheme: 'exact',
    network: 'solana-mainnet',
    payTo: TREASURY_WALLET,
    maxAmountRequired: '12500000',
    asset: USDC_TOKEN_MINT,
    description: 'Hatcher plan',
    mimeType: 'application/json',
    resource: '/payments/solana-x402/settle',
    maxTimeoutSeconds: 300,
    extra: { name: 'USDC', version: '1', decimals: 6 },
    ...overrides,
  };
}

describe('Solana x402 payment requirements', () => {
  it('accepts the configured treasury and USDC mint', () => {
    expect(validateSolanaX402Requirements(requirements())).toBe(12.5);
  });

  it('rejects a substituted recipient, asset, network, or amount', () => {
    expect(() => validateSolanaX402Requirements(requirements({ payTo: 'attacker' }))).toThrow();
    expect(() => validateSolanaX402Requirements(requirements({ asset: 'fake-mint' }))).toThrow();
    expect(() => validateSolanaX402Requirements(requirements({ network: 'solana-devnet' }))).toThrow();
    expect(() => validateSolanaX402Requirements(requirements({ maxAmountRequired: '-1' }))).toThrow();
  });
});

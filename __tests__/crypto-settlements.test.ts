import { afterEach, describe, expect, it } from 'vitest';
import {
  createPendingCryptoSettlement,
  hasPendingCryptoSettlement,
  readPendingCryptoSettlements,
  removePendingCryptoSettlement,
  shouldDropPendingCryptoSettlement,
  upsertPendingCryptoSettlement,
} from '@/lib/crypto-settlements';
import { SOLANA_MAINNET_CAIP2 } from '@/lib/solana-x402-client';

const originalWindow = (globalThis as { window?: unknown }).window;

function installLocalStorage(): void {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
      },
    },
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

describe('crypto settlement queue', () => {
  it('keeps pending payments scoped by user without deleting other users', () => {
    installLocalStorage();
    const first = createPendingCryptoSettlement({
      rail: 'hatch',
      flow: 'tier',
      targetKey: 'founding_member',
      billingPeriod: 'monthly',
      amountUsd: 90,
      txSignature: 'tx-user-1',
      paymentIntentId: 'intent-user-1',
      userId: 'user-1',
    });
    const second = createPendingCryptoSettlement({
      rail: 'usdc',
      flow: 'addon',
      targetKey: 'addon.ai_credits.5000',
      billingPeriod: 'monthly',
      amountUsd: 7,
      txSignature: 'tx-user-2',
      paymentIntentId: 'intent-user-2',
      x402Network: SOLANA_MAINNET_CAIP2,
      userId: 'user-2',
    });
    const third = createPendingCryptoSettlement({
      rail: 'ansem',
      flow: 'tier',
      targetKey: 'starter',
      billingPeriod: 'monthly',
      amountUsd: 6.99,
      txSignature: 'tx-user-3',
      paymentIntentId: 'intent-user-3',
      userId: 'user-3',
    });

    upsertPendingCryptoSettlement(first);
    upsertPendingCryptoSettlement(second);
    upsertPendingCryptoSettlement(third);

    expect(readPendingCryptoSettlements('user-1')).toEqual([first]);
    expect(readPendingCryptoSettlements('user-2')).toEqual([second]);
    expect(readPendingCryptoSettlements('user-3')).toEqual([third]);
    expect(hasPendingCryptoSettlement(first.id, 'user-1')).toBe(true);

    removePendingCryptoSettlement(first.id);

    expect(hasPendingCryptoSettlement(first.id, 'user-1')).toBe(false);
    expect(readPendingCryptoSettlements('user-2')).toEqual([second]);
    expect(readPendingCryptoSettlements('user-3')).toEqual([third]);
  });

  it('does not silently drop failed verification or unknown duplicate signatures', () => {
    expect(shouldDropPendingCryptoSettlement('Payment verification failed: Transaction too old (>30 minutes)')).toBe(false);
    expect(shouldDropPendingCryptoSettlement('Transaction signature has already been used')).toBe(false);
    expect(shouldDropPendingCryptoSettlement('Add-on already unlocked')).toBe(true);
  });

  it('keeps intent-bound transfers recoverable for 24 hours', () => {
    installLocalStorage();
    const recent = {
      ...createPendingCryptoSettlement({
        rail: 'sol' as const,
        flow: 'tier' as const,
        targetKey: 'starter',
        billingPeriod: 'monthly' as const,
        amountUsd: 6.99,
        txSignature: 'tx-23-hours',
        paymentIntentId: 'intent-23-hours',
      }),
      createdAt: Date.now() - (23 * 60 * 60 * 1000),
    };
    const expired = {
      ...createPendingCryptoSettlement({
        rail: 'sol' as const,
        flow: 'tier' as const,
        targetKey: 'starter',
        billingPeriod: 'monthly' as const,
        amountUsd: 6.99,
        txSignature: 'tx-25-hours',
        paymentIntentId: 'intent-25-hours',
      }),
      createdAt: Date.now() - (25 * 60 * 60 * 1000),
    };

    upsertPendingCryptoSettlement(recent);
    upsertPendingCryptoSettlement(expired);

    expect(readPendingCryptoSettlements()).toEqual([recent]);
  });
});

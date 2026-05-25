'use client';

import { api } from '@/lib/api';
import {
  settleSolanaX402Payment,
  type PaymentTarget,
  type SettleResult,
} from '@/lib/solana-x402-client';

export type PendingPaymentRail = 'sol' | 'hatch' | 'usdc' | 'kausa';
export type PendingPaymentFlow = 'tier' | 'addon';

export interface PendingCryptoSettlement {
  id: string;
  rail: PendingPaymentRail;
  flow: PendingPaymentFlow;
  targetKey: string;
  billingPeriod: 'monthly' | 'annual';
  amountUsd: number;
  txSignature: string;
  userId?: string;
  agentId?: string;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
}

export type CryptoSettlementResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

const STORAGE_KEY = 'hatcher.pendingCryptoSettlements.v1';
const MAX_SETTLEMENT_AGE_MS = 35 * 60 * 1000;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function settlementId(input: Pick<PendingCryptoSettlement, 'rail' | 'flow' | 'targetKey' | 'txSignature'> & { agentId?: string; userId?: string }): string {
  return [
    input.userId ?? 'unknown-user',
    input.rail,
    input.flow,
    input.targetKey,
    input.agentId ?? 'account',
    input.txSignature,
  ].join(':');
}

function normalizePending(raw: unknown): PendingCryptoSettlement | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Partial<PendingCryptoSettlement>;
  if (
    (item.rail !== 'sol' && item.rail !== 'hatch' && item.rail !== 'usdc' && item.rail !== 'kausa') ||
    (item.flow !== 'tier' && item.flow !== 'addon') ||
    typeof item.targetKey !== 'string' ||
    typeof item.txSignature !== 'string' ||
    (item.billingPeriod !== 'monthly' && item.billingPeriod !== 'annual') ||
    typeof item.createdAt !== 'number'
  ) {
    return null;
  }

  return {
    id: typeof item.id === 'string' && item.id
      ? item.id
      : settlementId({
          rail: item.rail,
          flow: item.flow,
          targetKey: item.targetKey,
          userId: item.userId,
          agentId: item.agentId,
          txSignature: item.txSignature,
        }),
    rail: item.rail,
    flow: item.flow,
    targetKey: item.targetKey,
    billingPeriod: item.billingPeriod,
    amountUsd: typeof item.amountUsd === 'number' ? item.amountUsd : 0,
    txSignature: item.txSignature,
    ...(typeof item.userId === 'string' ? { userId: item.userId } : {}),
    ...(typeof item.agentId === 'string' ? { agentId: item.agentId } : {}),
    createdAt: item.createdAt,
    attempts: typeof item.attempts === 'number' ? item.attempts : 0,
    ...(typeof item.lastAttemptAt === 'number' ? { lastAttemptAt: item.lastAttemptAt } : {}),
    ...(typeof item.lastError === 'string' ? { lastError: item.lastError } : {}),
  };
}

export function createPendingCryptoSettlement(input: Omit<PendingCryptoSettlement, 'id' | 'createdAt' | 'attempts'>): PendingCryptoSettlement {
  return {
    ...input,
    id: settlementId(input),
    createdAt: Date.now(),
    attempts: 0,
  };
}

export function readPendingCryptoSettlements(userId?: string): PendingCryptoSettlement[] {
  const store = storage();
  if (!store) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(store.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    parsed = [];
  }
  const now = Date.now();
  const items = Array.isArray(parsed)
    ? parsed
        .map(normalizePending)
        .filter((item): item is PendingCryptoSettlement => Boolean(item))
        .filter((item) => now - item.createdAt <= MAX_SETTLEMENT_AGE_MS)
    : [];
  if (Array.isArray(parsed) && items.length !== parsed.length) {
    writePendingCryptoSettlements(items);
  }
  return userId ? items.filter((item) => item.userId === userId) : items;
}

function writePendingCryptoSettlements(items: PendingCryptoSettlement[]): void {
  const store = storage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function upsertPendingCryptoSettlement(item: PendingCryptoSettlement): void {
  const existing = readPendingCryptoSettlements().filter((pending) => pending.id !== item.id);
  writePendingCryptoSettlements([...existing, item]);
}

export function removePendingCryptoSettlement(id: string): void {
  writePendingCryptoSettlements(readPendingCryptoSettlements().filter((item) => item.id !== id));
}

export function hasPendingCryptoSettlement(id: string, userId?: string): boolean {
  if (!storage()) return true;
  return readPendingCryptoSettlements(userId).some((item) => item.id === id);
}

export function markPendingCryptoSettlementFailure(item: PendingCryptoSettlement, error: string): void {
  upsertPendingCryptoSettlement({
    ...item,
    attempts: item.attempts + 1,
    lastAttemptAt: Date.now(),
    lastError: error,
  });
}

export function shouldDropPendingCryptoSettlement(error: string): boolean {
  return /already unlocked|already at same or higher/i.test(error);
}

export async function settlePendingCryptoPayment(item: PendingCryptoSettlement): Promise<CryptoSettlementResult> {
  if (item.rail === 'usdc') {
    const target: PaymentTarget = item.flow === 'tier'
      ? { kind: 'tier', key: item.targetKey as PaymentTarget['key'], billingPeriod: item.billingPeriod }
      : {
          kind: 'addon',
          key: item.targetKey as PaymentTarget['key'],
          billingPeriod: item.billingPeriod,
          ...(item.agentId ? { agentId: item.agentId } : {}),
        };
    try {
      const data: SettleResult = await settleSolanaX402Payment(target, item.txSignature);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Payment settlement failed' };
    }
  }

  if (item.flow === 'tier') {
    return api.subscribe(item.targetKey, item.txSignature, item.rail, item.billingPeriod);
  }

  return api.purchaseAddon(
    item.targetKey,
    item.txSignature,
    item.agentId,
    item.rail,
    item.billingPeriod,
  );
}

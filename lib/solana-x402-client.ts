// ============================================================
// Solana x402 client for USDC payments.
// ============================================================

import { API_URL } from '@/lib/config';
import type { SolanaPaymentQuote } from '@/lib/api/types';
import { validateSolanaPaymentQuote } from '@/lib/solana-payments';

export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
export type SolanaX402Network = typeof SOLANA_MAINNET_CAIP2;

export interface PaymentRequirementsRow {
  scheme: string;
  network: string;
  payTo: string;
  maxAmountRequired: string;
  asset: string;
  description: string;
  mimeType: string;
  resource: string;
  maxTimeoutSeconds: number;
  extra: { name: string; version: string; decimals?: number };
}

export interface CheckoutResponse extends SolanaPaymentQuote {
  x402Version: number;
  accepts: PaymentRequirementsRow[];
  paymentIntentId: string;
  error?: string;
}

export interface PaymentTarget {
  kind: 'tier' | 'addon';
  key: string;
  billingPeriod?: 'monthly' | 'annual';
  agentId?: string;
}

export interface SettleResult {
  paymentId: string;
  featureId: string | null;
  txSignature: string;
  amount: string;
  payer: string;
  network: string;
  usd: number;
  description: string;
  duplicate: boolean;
  proratedCredit?: number;
  proratedAiCredits?: number;
}

/** Browser-safe base64 encode of a UTF-8 string. */
function base64Encode(input: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(input)));
  }
  return Buffer.from(input, 'utf8').toString('base64');
}

export type SolanaUsdcSender = (
  quote: SolanaPaymentQuote,
  label: string,
  options?: { onSignature?: (signature: string) => void },
) => Promise<string>;

function rawUsdcToHuman(raw: string, decimals = 6): number {
  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  return Number(whole) + Number(fraction) / Number(base);
}

export function validateSolanaX402Requirements(
  requirements: PaymentRequirementsRow,
  intent: CheckoutResponse,
  payerWallet: string,
): { amount: number; network: SolanaX402Network } {
  validateSolanaPaymentQuote(intent, 'usdc', payerWallet);
  if (intent.x402Version !== 1) throw new Error('Server returned an unsupported x402 version');
  if (requirements.scheme !== 'exact' || requirements.network !== SOLANA_MAINNET_CAIP2) {
    throw new Error('Server returned unsupported Solana payment requirements');
  }
  if (requirements.asset !== intent.tokenMint || requirements.payTo !== intent.recipientWallet) {
    throw new Error('Server returned an unexpected payment asset or recipient');
  }
  const decimals = requirements.extra?.decimals;
  if (decimals !== 6 || !/^\d+$/.test(requirements.maxAmountRequired)) {
    throw new Error('Server returned an invalid USDC payment amount');
  }
  const rawAmount = BigInt(requirements.maxAmountRequired);
  if (rawAmount <= 0n) throw new Error('Server returned an invalid USDC payment amount');
  const amount = rawUsdcToHuman(requirements.maxAmountRequired, decimals);
  if (!Number.isSafeInteger(Number(rawAmount)) || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('Server returned an unsafe USDC payment amount');
  }
  const expectedRawAmount = BigInt(Math.round(intent.expectedAmount * (10 ** decimals)));
  if (expectedRawAmount !== rawAmount || Math.abs(intent.amountUsd - amount) > 1e-9) {
    throw new Error('Payment requirements do not match the server payment intent');
  }
  return { amount, network: SOLANA_MAINNET_CAIP2 };
}

export async function payWithSolanaX402(
  target: PaymentTarget,
  payerWallet: string,
  sendUsdc: SolanaUsdcSender,
  options: {
    onSignature?: (
      signature: string,
      paymentIntentId: string,
      network: SolanaX402Network,
      amountUsd: number,
    ) => void;
  } = {},
): Promise<SettleResult> {
  const checkoutRes = await fetch(`${API_URL}/payments/solana-x402/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...target, payerWallet }),
  });
  if (checkoutRes.status !== 402) {
    const errBody = await checkoutRes.json().catch(() => null);
    throw new Error(errBody?.error ?? `checkout failed (${checkoutRes.status})`);
  }

  const checkoutBody = (await checkoutRes.json()) as { data: CheckoutResponse };
  const requirements = checkoutBody.data?.accepts?.[0];
  if (!requirements) throw new Error('Server returned no payment requirements');
  if (
    !checkoutBody.data.paymentIntentId
    || !checkoutBody.data.memo
    || checkoutBody.data.payerWallet !== payerWallet
  ) {
    throw new Error('Server returned an invalid payment intent');
  }

  const { network } = validateSolanaX402Requirements(requirements, checkoutBody.data, payerWallet);
  const txSignature = await sendUsdc(checkoutBody.data, requirements.description, {
    onSignature: (signature) => options.onSignature?.(
      signature,
      checkoutBody.data.paymentIntentId,
      network,
      checkoutBody.data.amountUsd,
    ),
  });
  return settleSolanaX402Payment(target, txSignature, checkoutBody.data.paymentIntentId, network);
}

export async function settleSolanaX402Payment(
  target: PaymentTarget,
  txSignature: string,
  paymentIntentId: string,
  network: SolanaX402Network,
): Promise<SettleResult> {
  const xPayment = base64Encode(JSON.stringify({
    x402Version: 1,
    scheme: 'exact',
    network,
    payload: {
      txSignature,
      signature: txSignature,
      transaction: txSignature,
    },
  }));

  const settleRes = await fetch(`${API_URL}/payments/solana-x402/settle`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-payment': xPayment,
    },
    body: JSON.stringify({ ...target, txSignature, paymentIntentId }),
  });
  const settleBody = (await settleRes.json()) as { success: boolean; data?: SettleResult; error?: string };
  if (!settleBody.success || !settleBody.data) {
    throw new Error(settleBody.error ?? `settle failed (${settleRes.status})`);
  }
  return settleBody.data;
}

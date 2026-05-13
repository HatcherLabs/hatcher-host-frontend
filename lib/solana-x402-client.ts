// ============================================================
// Solana x402 client for USDC payments.
// ============================================================

import { API_URL } from '@/lib/config';

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

export interface CheckoutResponse {
  x402Version: number;
  accepts: PaymentRequirementsRow[];
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
  usdAmount: number,
  label: string,
  recipientWallet?: string,
) => Promise<string>;

function rawUsdcToHuman(raw: string, decimals = 6): number {
  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  return Number(whole) + Number(fraction) / Number(base);
}

export async function payWithSolanaX402(
  target: PaymentTarget,
  sendUsdc: SolanaUsdcSender,
): Promise<SettleResult> {
  const checkoutRes = await fetch(`${API_URL}/payments/solana-x402/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(target),
  });
  if (checkoutRes.status !== 402) {
    const errBody = await checkoutRes.json().catch(() => null);
    throw new Error(errBody?.error ?? `checkout failed (${checkoutRes.status})`);
  }

  const checkoutBody = (await checkoutRes.json()) as { data: CheckoutResponse };
  const requirements = checkoutBody.data?.accepts?.[0];
  if (!requirements) throw new Error('Server returned no payment requirements');

  const amount = rawUsdcToHuman(requirements.maxAmountRequired, requirements.extra.decimals ?? 6);
  const txSignature = await sendUsdc(amount, requirements.description, requirements.payTo);
  const xPayment = base64Encode(JSON.stringify({
    x402Version: 1,
    scheme: requirements.scheme,
    network: requirements.network,
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
    body: JSON.stringify({ ...target, txSignature }),
  });
  const settleBody = (await settleRes.json()) as { success: boolean; data?: SettleResult; error?: string };
  if (!settleBody.success || !settleBody.data) {
    throw new Error(settleBody.error ?? `settle failed (${settleRes.status})`);
  }
  return settleBody.data;
}

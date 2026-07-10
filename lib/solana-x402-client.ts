// ============================================================
// Solana x402 client for USDC payments.
// ============================================================

import { API_URL, TREASURY_WALLET, USDC_TOKEN_MINT } from '@/lib/config';

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
  paymentIntentId: string;
  memo: string;
  expiresAt: string;
  payerWallet: string;
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
  options?: { memo?: string; onSignature?: (signature: string) => void },
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
): number {
  if (requirements.scheme !== 'exact' || requirements.network !== 'solana-mainnet') {
    throw new Error('Server returned unsupported Solana payment requirements');
  }
  if (requirements.asset !== USDC_TOKEN_MINT || requirements.payTo !== TREASURY_WALLET) {
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
  return amount;
}

export async function payWithSolanaX402(
  target: PaymentTarget,
  payerWallet: string,
  sendUsdc: SolanaUsdcSender,
  options: { onSignature?: (signature: string, paymentIntentId: string) => void } = {},
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

  const amount = validateSolanaX402Requirements(requirements);
  const txSignature = await sendUsdc(amount, requirements.description, requirements.payTo, {
    onSignature: (signature) => options.onSignature?.(
      signature,
      checkoutBody.data.paymentIntentId,
    ),
    memo: checkoutBody.data.memo,
  });
  return settleSolanaX402Payment(target, txSignature, checkoutBody.data.paymentIntentId);
}

export async function settleSolanaX402Payment(
  target: PaymentTarget,
  txSignature: string,
  paymentIntentId: string,
): Promise<SettleResult> {
  const xPayment = base64Encode(JSON.stringify({
    x402Version: 1,
    scheme: 'exact',
    network: 'solana-mainnet',
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
